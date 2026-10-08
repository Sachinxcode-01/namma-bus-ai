import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { LiveLocation, TripStatus, UserRole } from '@prisma/client';
import { LocationsRepository } from './locations.repository';
import { TripsRepository } from '../trips/trips.repository';
import { LocationStreamService } from './location-stream.service';
import { GpsValidatorService } from './services/gps-validator.service';
import { GpsDeduplicationService } from './services/gps-deduplication.service';
import { LiveTrackingService } from './services/live-tracking.service';
import { GpsMetricsService, GpsMetricsSnapshot } from './services/gps-metrics.service';
import { IngestLocationDto } from './dto/ingest-location.dto';
import { BatchIngestLocationDto } from './dto/batch-ingest-location.dto';
import { QueryLocationHistoryDto } from './dto/query-location-history.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  AppException,
  ForbiddenException,
  NotFoundException,
  ValidationException,
} from '../../common/errors/app.exception';
import {
  BatchIngestResult,
  BusLiveStatus,
  GpsMovementClassification,
  LiveBusState,
} from './domain/gps-telemetry.types';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    private readonly locationsRepository: LocationsRepository,
    private readonly tripsRepository: TripsRepository,
    private readonly streamService: LocationStreamService,
    private readonly validatorService: GpsValidatorService,
    private readonly deduplicationService: GpsDeduplicationService,
    private readonly liveTrackingService: LiveTrackingService,
    private readonly metricsService: GpsMetricsService,
  ) {}

  /**
   * Authoritative GPS Ingestion Workflow
   * Coordinates validation, driver ownership, deduplication, persistence, and real-time streaming.
   */
  async ingest(dto: IngestLocationDto, currentUser: AuthenticatedUser): Promise<LiveLocation> {
    this.metricsService.recordReceived();

    // 0. Auto-resolve Active Trip if Driver Omitted tripId
    let tripId = dto.tripId;
    if (!tripId) {
      if (currentUser.driverId) {
        const activeTripsResult = await this.tripsRepository.findAll({
          driverId: currentUser.driverId,
          status: TripStatus.ACTIVE,
        });
        const activeTrip = activeTripsResult.items?.[0] ?? activeTripsResult.trips?.[0];
        if (activeTrip) {
          tripId = activeTrip.id;
        }
      }
      if (!tripId) {
        this.metricsService.recordRejected();
        throw new ValidationException(
          'tripId is required or driver must be assigned to an active trip.',
        );
      }
    }

    // 1. Verify Trip Existence and Active Status
    const trip = await this.tripsRepository.findById(tripId);
    if (!trip) {
      this.metricsService.recordRejected();
      throw new NotFoundException('Trip', tripId);
    }

    if (trip.status !== TripStatus.ACTIVE) {
      this.metricsService.recordRejected();
      throw new AppException(
        'INVALID_TRIP_STATE',
        `Location pings can only be ingested for ACTIVE trips. Current status: ${trip.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Authorization / Ownership Verification
    if (currentUser.role === UserRole.DRIVER && currentUser.driverId !== trip.driverId) {
      this.metricsService.recordRejected();
      throw new ForbiddenException(
        'Drivers may only ingest GPS locations for trips assigned to them.',
      );
    }

    // 3. Vehicle Association Integrity (if busId supplied)
    if (dto.busId && dto.busId !== trip.busId) {
      this.metricsService.recordRejected();
      throw new ValidationException(
        `Vehicle mismatch: provided busId (${dto.busId}) does not match the bus assigned to this trip (${trip.busId}).`,
      );
    }

    // 4. Retrieve latest recorded location for comparative anomaly detection
    const latestLocation = await this.locationsRepository.findLatestByTripId(tripId);

    // 5. Deduplication check (handle duplicate mobile network retries idempotently)
    const pingTime = new Date(dto.timestamp);
    const dedup = this.deduplicationService.check(tripId, dto.latitude, dto.longitude, pingTime);

    if (dedup.isDuplicate && latestLocation) {
      this.metricsService.recordDuplicate();
      this.logger.debug(`Idempotent duplicate GPS ping suppressed for trip ${tripId}`);
      return latestLocation;
    }

    // 6. Comprehensive Validation Pipeline (Coordinates, Timestamp, Accuracy, Teleportation)
    let validationResult;
    try {
      validationResult = this.validatorService.validatePayload(dto, latestLocation);
    } catch (err) {
      this.metricsService.recordRejected();
      throw err;
    }

    if (validationResult.classification === GpsMovementClassification.SUSPICIOUS) {
      this.metricsService.recordSuspicious();
    }

    // 7. Persist Validated Telemetry Record
    const location = await this.locationsRepository.create({
      busId: trip.busId,
      tripId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed: dto.speed,
      heading: dto.heading,
      accuracy: dto.accuracy,
      timestamp: pingTime,
    });

    this.metricsService.recordAccepted();

    // 8. Distribute Real-Time Event (unless stationary micro-jitter suppressed)
    if (!dedup.isJitterSuppressed) {
      this.streamService.emitLocation({
        tripId: trip.id,
        busId: trip.busId,
        routeId: trip.routeId,
        routeCode: trip.route?.code ?? '',
        busNumber: trip.bus?.busNumber ?? '',
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
        recordedAt: location.timestamp.toISOString(),
        receivedAt: location.createdAt.toISOString(),
        status: BusLiveStatus.LIVE,
        signalQuality: validationResult.signalQuality,
        locationId: location.id,
      });
    }

    // 9. Update Live Operational State Cache
    this.liveTrackingService.updateCache(trip.id, {
      tripId: trip.id,
      busId: trip.busId,
      busNumber: trip.bus?.busNumber ?? '',
      routeId: trip.routeId,
      routeCode: trip.route?.code ?? '',
      driverId: trip.driverId,
      driverName: trip.driver?.name ?? '',
      status: BusLiveStatus.LIVE,
      isStale: false,
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed,
      heading: location.heading,
      accuracy: location.accuracy,
      accuracyQuality: validationResult.signalQuality,
      recordedAt: location.timestamp.toISOString(),
      receivedAt: location.createdAt.toISOString(),
      ageSeconds: 0,
      currentLocation: {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        heading: location.heading,
        accuracy: location.accuracy,
        timestamp: location.timestamp.toISOString(),
        receivedAt: location.createdAt.toISOString(),
      },
      lastLocationAt: location.timestamp.toISOString(),
      updateAgeSeconds: 0,
      speedKmh: location.speed ?? null,
      accuracyMeters: location.accuracy ?? null,
      signalQuality: validationResult.signalQuality,
      isMoving: location.speed !== null && (location.speed ?? 0) > 2.0,
    });

    return location;
  }

  /**
   * Ingest a batch of buffered GPS telemetry pings accumulated during offline periods.
   * Persists historical breadcrumbs chronologically and updates current state only to the latest ping.
   */
  async ingestBatch(
    dto: BatchIngestLocationDto,
    currentUser: AuthenticatedUser,
  ): Promise<BatchIngestResult> {
    const sorted = [...dto.locations].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    let acceptedCount = 0;
    let rejectedCount = 0;
    let latestLocation: LiveLocation | null = null;

    for (const ping of sorted) {
      try {
        const result = await this.ingest(ping, currentUser);
        acceptedCount++;
        latestLocation = result;
      } catch (error) {
        rejectedCount++;
        this.logger.warn(
          `Failed to ingest ping in batch for trip ${ping.tripId}: ${(error as Error).message}`,
        );
      }
    }

    const latestStatus = latestLocation ? BusLiveStatus.LIVE : BusLiveStatus.OFFLINE;

    return {
      totalReceived: dto.locations.length,
      acceptedCount,
      ingestedCount: acceptedCount,
      rejectedCount,
      latestStatus,
      latestLocation,
    };
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

  async getLiveStateByTripId(tripId: string): Promise<LiveBusState> {
    return this.liveTrackingService.getLiveTripState(tripId);
  }

  async getLiveTripState(tripId: string): Promise<LiveBusState> {
    return this.liveTrackingService.getLiveTripState(tripId);
  }

  async getLiveStateByBusId(busId: string): Promise<LiveBusState> {
    return this.liveTrackingService.getLiveBusState(busId);
  }

  async getLiveBusState(busId: string): Promise<LiveBusState> {
    return this.liveTrackingService.getLiveBusState(busId);
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

  getMetrics(): GpsMetricsSnapshot {
    return this.metricsService.getMetricsSnapshot();
  }

  getHealthMetrics(): {
    activeConnections: number;
    activeTripsTracked: number;
    totalPingsAccepted: number;
    totalPingsRejected: number;
    [key: string]: unknown;
  } {
    const liveMetrics = this.liveTrackingService.getMetrics();
    return {
      activeConnections: this.streamService.getActiveConnectionCount(),
      activeTripsTracked: liveMetrics.activeTripsTracked,
      totalPingsAccepted: liveMetrics.totalPingsAccepted,
      totalPingsRejected: liveMetrics.totalPingsRejected,
      ...this.metricsService.getMetricsSnapshot(),
    };
  }
}
