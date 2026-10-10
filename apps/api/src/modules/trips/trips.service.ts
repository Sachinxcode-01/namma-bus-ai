import { HttpStatus, Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { TripStatus, UserRole, StopEvent } from '@prisma/client';
import { TripsRepository, TripSummary, TripDetail, TripStopProgress } from './trips.repository';
import { BusesRepository } from '../buses/buses.repository';
import { DriversRepository } from '../drivers/drivers.repository';
import { RoutesRepository } from '../routes/routes.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { StopArrivalDetectorService } from '../notifications/services/stop-arrival-detector.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { QueryTripsDto } from './dto/query-trips.dto';
import { RecordStopEventDto } from './dto/record-stop-event.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  AppException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ValidationException,
} from '../../common/errors/app.exception';
import { PaginatedResult } from '../users/users.service';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly busesRepository: BusesRepository,
    private readonly driversRepository: DriversRepository,
    private readonly routesRepository: RoutesRepository,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService?: NotificationsService,
    @Optional()
    @Inject(forwardRef(() => StopArrivalDetectorService))
    private readonly stopArrivalDetector?: StopArrivalDetectorService,
  ) {}

  async create(dto: CreateTripDto): Promise<TripSummary> {
    // 1. Validate Bus existence and operational availability
    const bus = await this.busesRepository.findById(dto.busId);
    if (!bus) {
      throw new NotFoundException('Bus', dto.busId);
    }
    if (!bus.isActive) {
      throw new ValidationException('Cannot assign an inactive bus to a scheduled trip.');
    }

    // 2. Validate Driver existence and operational availability
    const driver = await this.driversRepository.findById(dto.driverId);
    if (!driver) {
      throw new NotFoundException('Driver', dto.driverId);
    }
    if (!driver.user.isActive) {
      throw new ValidationException('Cannot assign an inactive driver to a scheduled trip.');
    }

    // 3. Validate Route existence and stop assignment
    const route = await this.routesRepository.findById(dto.routeId);
    if (!route) {
      throw new NotFoundException('Route', dto.routeId);
    }
    if (!route.isActive) {
      throw new ValidationException('Cannot schedule a trip on an inactive route.');
    }
    if (!route.routeStops || route.routeStops.length === 0) {
      throw new ValidationException(
        'Cannot schedule a trip on a route that has no configured stops.',
      );
    }

    // 4. Check for active trip conflicts
    const [busActiveTrip, driverActiveTrip] = await Promise.all([
      this.tripsRepository.findActiveByBus(dto.busId),
      this.tripsRepository.findActiveByDriver(dto.driverId),
    ]);

    if (busActiveTrip) {
      throw new ConflictException(
        `Bus ${bus.busNumber} is already operating an active trip (${busActiveTrip.id}).`,
      );
    }
    if (driverActiveTrip) {
      throw new ConflictException(
        `Driver ${driver.name} is already operating an active trip (${driverActiveTrip.id}).`,
      );
    }

    const scheduledStartTime = dto.scheduledStartTime ? new Date(dto.scheduledStartTime) : null;

    this.logger.log(
      `Scheduling trip for bus ${bus.busNumber}, driver ${driver.name}, route ${route.code}`,
    );

    return this.tripsRepository.create({
      busId: dto.busId,
      driverId: dto.driverId,
      routeId: dto.routeId,
      scheduledStartTime,
    });
  }

  async findAll(query: QueryTripsDto): Promise<PaginatedResult<TripSummary>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { trips, total } = await this.tripsRepository.findMany({
      skip,
      take: limit,
      status: query.status,
      busId: query.busId,
      driverId: query.driverId,
      routeId: query.routeId,
      date: query.date,
      search: query.search,
    });

    return {
      items: trips,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<TripDetail> {
    const trip = await this.tripsRepository.findById(id);
    if (!trip) {
      throw new NotFoundException('Trip', id);
    }
    return trip;
  }

  async findActiveTrips(): Promise<TripSummary[]> {
    const { trips } = await this.tripsRepository.findMany({
      skip: 0,
      take: 100,
      status: TripStatus.ACTIVE,
    });
    return trips;
  }

  async startTrip(id: string, currentUser: AuthenticatedUser): Promise<TripDetail> {
    const trip = await this.findOne(id);

    // Authorization: Assigned driver or Admin
    if (currentUser.role === UserRole.DRIVER && currentUser.driverId !== trip.driverId) {
      throw new ForbiddenException('Drivers may only start trips assigned to them.');
    }

    // Idempotent start: if already ACTIVE, return current state
    if (trip.status === TripStatus.ACTIVE) {
      this.logger.warn(`Trip ${id} start called but trip is already ACTIVE (idempotent).`);
      return trip;
    }

    // State machine check
    if (trip.status !== TripStatus.SCHEDULED) {
      throw new AppException(
        'INVALID_STATE_TRANSITION',
        `Cannot start trip with status '${trip.status}'. Only SCHEDULED trips can be started.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date();
    this.logger.log(`Starting trip ${id} at ${now.toISOString()}`);

    const started = await this.tripsRepository.startTripAtomic(id, trip.busId, trip.driverId, now);

    if (this.notificationsService) {
      this.notificationsService
        .handleTripStarted(started)
        .catch((err) =>
          this.logger.debug(`Background trip started alert error: ${err?.message ?? err}`),
        );
    }

    return started;
  }

  async endTrip(id: string, currentUser: AuthenticatedUser): Promise<TripDetail> {
    const trip = await this.findOne(id);

    // Authorization: Assigned driver or Admin
    if (currentUser.role === UserRole.DRIVER && currentUser.driverId !== trip.driverId) {
      throw new ForbiddenException('Drivers may only end trips assigned to them.');
    }

    // Idempotent end: if already COMPLETED, return current state
    if (trip.status === TripStatus.COMPLETED) {
      this.logger.warn(`Trip ${id} end called but trip is already COMPLETED (idempotent).`);
      return trip;
    }

    // State machine check
    if (trip.status !== TripStatus.ACTIVE) {
      throw new AppException(
        'INVALID_STATE_TRANSITION',
        `Cannot end trip with status '${trip.status}'. Only ACTIVE trips can be completed.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date();
    this.logger.log(`Ending trip ${id} at ${now.toISOString()}`);

    const completed = await this.tripsRepository.update(id, {
      status: TripStatus.COMPLETED,
      actualEndTime: now,
    });

    if (this.stopArrivalDetector) {
      this.stopArrivalDetector.resetTripState(id);
    }

    if (this.notificationsService) {
      this.notificationsService
        .handleTripCompleted(completed)
        .catch((err) =>
          this.logger.debug(`Background trip completed alert error: ${err?.message ?? err}`),
        );
    }

    return completed;
  }

  async cancelTrip(id: string, currentUser: AuthenticatedUser): Promise<TripDetail> {
    const trip = await this.findOne(id);

    // Authorization: Assigned driver or Admin
    if (currentUser.role === UserRole.DRIVER && currentUser.driverId !== trip.driverId) {
      throw new ForbiddenException('Drivers may only cancel trips assigned to them.');
    }

    // Idempotent cancel: if already CANCELLED, return current state
    if (trip.status === TripStatus.CANCELLED) {
      this.logger.warn(`Trip ${id} cancel called but trip is already CANCELLED (idempotent).`);
      return trip;
    }

    if (trip.status === TripStatus.COMPLETED) {
      throw new AppException(
        'INVALID_STATE_TRANSITION',
        'Cannot cancel an already completed trip.',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Cancelling trip ${id} by user ${currentUser.id}`);

    const cancelled = await this.tripsRepository.update(id, {
      status: TripStatus.CANCELLED,
    });

    if (this.stopArrivalDetector) {
      this.stopArrivalDetector.resetTripState(id);
    }

    return cancelled;
  }

  async recordStopEvent(
    tripId: string,
    stopId: string,
    dto: RecordStopEventDto,
    currentUser: AuthenticatedUser,
  ): Promise<StopEvent> {
    const trip = await this.findOne(tripId);

    // Authorization
    if (currentUser.role === UserRole.DRIVER && currentUser.driverId !== trip.driverId) {
      throw new ForbiddenException(
        'Drivers may only record stop events for their own assigned trips.',
      );
    }

    if (trip.status !== TripStatus.ACTIVE) {
      throw new AppException(
        'INVALID_TRIP_STATE',
        `Stop events can only be recorded for ACTIVE trips. Current status: ${trip.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verify stop belongs to the trip's route
    const stopOnRoute = trip.route.routeStops.some((rs) => rs.stopId === stopId);
    if (!stopOnRoute) {
      throw new ValidationException('Stop does not belong to the route assigned to this trip.');
    }

    // Idempotency: If exact event type already recorded for this trip and stop, return it
    const existing = await this.tripsRepository.findStopEvent(tripId, stopId, dto.eventType);
    if (existing) {
      this.logger.log(
        `Stop event ${dto.eventType} already recorded for trip ${tripId} at stop ${stopId} (idempotent).`,
      );
      return existing;
    }

    const timestamp = dto.timestamp ? new Date(dto.timestamp) : new Date();
    this.logger.log(
      `Recording stop event ${dto.eventType} for trip ${tripId} at stop ${stopId} at ${timestamp.toISOString()}`,
    );

    return this.tripsRepository.createStopEvent(tripId, stopId, dto.eventType, timestamp);
  }

  async getTripStopsProgress(tripId: string): Promise<TripStopProgress[]> {
    // Verify trip exists
    await this.findOne(tripId);
    return this.tripsRepository.findTripStopsProgress(tripId);
  }
}
