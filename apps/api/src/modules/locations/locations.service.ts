import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { LiveLocation, TripStatus, UserRole } from '@prisma/client';
import { LocationsRepository } from './locations.repository';
import { TripsRepository } from '../trips/trips.repository';
import { LocationStreamService } from './location-stream.service';
import { IngestLocationDto } from './dto/ingest-location.dto';
import { QueryLocationHistoryDto } from './dto/query-location-history.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  AppException,
  ForbiddenException,
  NotFoundException,
  ValidationException,
} from '../../common/errors/app.exception';
import { haversineDistance } from '../../common/utils/geo.util';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  // Maximum allowed vehicle velocity threshold (120 km/h)
  private readonly MAX_PLAUSIBLE_SPEED_KMH = 120;
  // Maximum allowed teleportation jump speed threshold (160 km/h)
  private readonly MAX_TELEPORT_SPEED_KMH = 160;
  // Maximum allowed future timestamp skew (60 seconds)
  private readonly MAX_FUTURE_SKEW_MS = 60 * 1000;
  // Maximum allowed stale timestamp age (10 minutes)
  private readonly MAX_STALE_AGE_MS = 10 * 60 * 1000;

  constructor(
    private readonly locationsRepository: LocationsRepository,
    private readonly tripsRepository: TripsRepository,
    private readonly streamService: LocationStreamService,
  ) {}

  async ingest(dto: IngestLocationDto, currentUser: AuthenticatedUser): Promise<LiveLocation> {
    // 1. Boundary & Plausibility Validation
    if (dto.latitude < -90 || dto.latitude > 90 || dto.longitude < -180 || dto.longitude > 180) {
      throw new ValidationException(
        'Coordinates outside valid geographic limits [-90..90, -180..180].',
      );
    }

    if (dto.accuracy !== undefined && dto.accuracy < 0) {
      throw new ValidationException('Accuracy metric cannot be negative.');
    }

    if (dto.speed !== undefined && dto.speed > this.MAX_PLAUSIBLE_SPEED_KMH) {
      throw new ValidationException(
        `Reported speed (${dto.speed} km/h) exceeds maximum plausible threshold (${this.MAX_PLAUSIBLE_SPEED_KMH} km/h).`,
      );
    }

    // 2. Timestamp Freshness and Skew Verification
    const pingTime = new Date(dto.timestamp);
    const now = Date.now();
    const diffMs = pingTime.getTime() - now;

    if (diffMs > this.MAX_FUTURE_SKEW_MS) {
      throw new ValidationException(
        'GPS ping timestamp is in the future (> 60 seconds clock skew).',
      );
    }

    if (now - pingTime.getTime() > this.MAX_STALE_AGE_MS) {
      throw new ValidationException('GPS ping timestamp is too stale (> 10 minutes old).');
    }

    // 3. Verify Trip Existence and Active Status
    const trip = await this.tripsRepository.findById(dto.tripId);
    if (!trip) {
      throw new NotFoundException('Trip', dto.tripId);
    }

    if (trip.status !== TripStatus.ACTIVE) {
      throw new AppException(
        'INVALID_TRIP_STATE',
        `Location pings can only be ingested for ACTIVE trips. Current status: ${trip.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 4. Authorization / Ownership Verification
    if (currentUser.role === UserRole.DRIVER && currentUser.driverId !== trip.driverId) {
      throw new ForbiddenException(
        'Drivers may only ingest GPS locations for trips assigned to them.',
      );
    }

    // 5. Jump / Teleportation Anomaly Detection
    const latestLocation = await this.locationsRepository.findLatestByTripId(dto.tripId);
    if (latestLocation) {
      const elapsedSeconds = (pingTime.getTime() - latestLocation.timestamp.getTime()) / 1000;
      if (elapsedSeconds > 0 && elapsedSeconds < 120) {
        const distanceMeters = haversineDistance(
          latestLocation.latitude,
          latestLocation.longitude,
          dto.latitude,
          dto.longitude,
        );
        const calculatedSpeedKmh = (distanceMeters / elapsedSeconds) * 3.6;

        if (calculatedSpeedKmh > this.MAX_TELEPORT_SPEED_KMH) {
          this.logger.warn(
            `Teleportation anomaly detected on trip ${dto.tripId}: calculated velocity ${calculatedSpeedKmh.toFixed(
              1,
            )} km/h over ${distanceMeters.toFixed(1)}m in ${elapsedSeconds.toFixed(1)}s`,
          );
          throw new ValidationException(
            `Implausible geographic jump detected (teleportation anomaly: calculated speed ${calculatedSpeedKmh.toFixed(
              1,
            )} km/h exceeds ${this.MAX_TELEPORT_SPEED_KMH} km/h threshold).`,
          );
        }
      }
    }

    // 6. Ingest & Persist
    const location = await this.locationsRepository.create({
      busId: trip.busId,
      tripId: dto.tripId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed: dto.speed,
      heading: dto.heading,
      accuracy: dto.accuracy,
      timestamp: pingTime,
    });

    // 7. Emit to Real-time Stream
    this.streamService.emitLocation({
      ...location,
      busNumber: trip.bus?.busNumber,
      routeCode: trip.route?.code,
    });

    return location;
  }

  async getLatestByTripId(tripId: string): Promise<LiveLocation> {
    const trip = await this.tripsRepository.findById(tripId);
    if (!trip) {
      throw new NotFoundException('Trip', tripId);
    }

    const latest = await this.locationsRepository.findLatestByTripId(tripId);
    if (!latest) {
      throw new NotFoundException('Live location for trip', tripId);
    }

    return latest;
  }

  async getLatestByBusId(busId: string): Promise<LiveLocation> {
    const latest = await this.locationsRepository.findLatestByBusId(busId);
    if (!latest) {
      throw new NotFoundException('Live location for bus', busId);
    }

    return latest;
  }

  async getHistoryByTripId(
    tripId: string,
    query: QueryLocationHistoryDto,
  ): Promise<LiveLocation[]> {
    const trip = await this.tripsRepository.findById(tripId);
    if (!trip) {
      throw new NotFoundException('Trip', tripId);
    }

    const since = query.since ? new Date(query.since) : undefined;
    return this.locationsRepository.findHistoryByTripId(tripId, query.limit, since);
  }
}
