import { Injectable, Logger } from '@nestjs/common';
import { TripStatus } from '@prisma/client';
import { LocationsRepository } from '../locations.repository';
import { TripsRepository } from '../../trips/trips.repository';
import { GpsValidatorService } from './gps-validator.service';
import { BusOperationalStatus, GPS_CONFIG, GpsAccuracyQuality } from '../constants/gps.constants';
import { LiveBusState } from '../domain/gps-telemetry.types';
import { NotFoundException } from '../../../common/errors/app.exception';

@Injectable()
export class LiveTrackingService {
  private readonly logger = new Logger(LiveTrackingService.name);

  // In-memory cache for recent live operational states
  private readonly liveStateCache = new Map<string, LiveBusState>();
  private readonly busToTripCache = new Map<string, string>(); // busId -> tripId

  constructor(
    private readonly locationsRepository: LocationsRepository,
    private readonly tripsRepository: TripsRepository,
    private readonly gpsValidator: GpsValidatorService,
  ) {}

  /**
   * Retrieves the authoritative live operational state for a trip.
   */
  async getLiveTripState(tripId: string): Promise<LiveBusState> {
    const trip = await this.tripsRepository.findById(tripId);
    if (!trip) {
      throw new NotFoundException('Trip', tripId);
    }

    const latestLocation = await this.locationsRepository.findLatestByTripId(tripId);
    const now = Date.now();

    const status = this.deriveBusLiveStatus(
      trip.status,
      latestLocation ? latestLocation.timestamp : null,
      now,
    );

    const updateAgeSeconds = latestLocation
      ? Math.max(0, Math.floor((now - latestLocation.timestamp.getTime()) / 1000))
      : undefined;

    const accuracyQuality = latestLocation
      ? this.gpsValidator.evaluateAccuracy(latestLocation.accuracy)
      : GpsAccuracyQuality.UNKNOWN;

    const isMoving = latestLocation?.speed !== null && (latestLocation?.speed ?? 0) > 2.0;
    const isStale =
      status === BusOperationalStatus.STALE || status === BusOperationalStatus.OFFLINE;

    const state: LiveBusState = {
      busId: trip.busId,
      busNumber: trip.bus?.busNumber ?? 'Unknown',
      tripId: trip.id,
      routeId: trip.routeId,
      routeCode: trip.route?.code ?? 'Unknown',
      routeName: trip.route?.name ?? 'Unknown',
      driverId: trip.driverId,
      driverName: trip.driver?.name ?? 'Unknown',
      status,
      isStale,
      latitude: latestLocation?.latitude,
      longitude: latestLocation?.longitude,
      speed: latestLocation?.speed ?? null,
      heading: latestLocation?.heading ?? null,
      accuracy: latestLocation?.accuracy ?? null,
      accuracyQuality,
      recordedAt: latestLocation ? latestLocation.timestamp.toISOString() : undefined,
      receivedAt: latestLocation ? latestLocation.createdAt.toISOString() : undefined,
      ageSeconds: updateAgeSeconds,

      currentLocation: latestLocation
        ? {
            id: latestLocation.id,
            latitude: latestLocation.latitude,
            longitude: latestLocation.longitude,
            speed: latestLocation.speed,
            heading: latestLocation.heading,
            accuracy: latestLocation.accuracy,
            timestamp: latestLocation.timestamp.toISOString(),
            receivedAt: latestLocation.createdAt.toISOString(),
          }
        : null,
      lastLocationAt: latestLocation ? latestLocation.timestamp.toISOString() : null,
      updateAgeSeconds: updateAgeSeconds ?? null,
      speedKmh: latestLocation?.speed ?? null,
      accuracyMeters: latestLocation?.accuracy ?? null,
      signalQuality: accuracyQuality,
      isMoving,
    };

    this.liveStateCache.set(tripId, state);

    return state;
  }

  /**
   * Retrieves the authoritative live operational state for a bus vehicle.
   * If the bus is currently operating an ACTIVE trip, returns the active trip's live telemetry.
   * Otherwise returns the inactive bus with its last known stationary coordinates.
   */
  async getLiveBusState(busId: string): Promise<LiveBusState> {
    const cachedTripId = this.busToTripCache.get(busId);
    if (cachedTripId) {
      const cached = this.liveStateCache.get(cachedTripId);
      if (cached) {
        const now = Date.now();
        const recordedAtMs = cached.recordedAt ? new Date(cached.recordedAt).getTime() : 0;
        const ageMs = now - recordedAtMs;
        const status =
          ageMs > GPS_CONFIG.OFFLINE_THRESHOLD_MS
            ? BusOperationalStatus.OFFLINE
            : ageMs > GPS_CONFIG.LIVE_THRESHOLD_MS
              ? BusOperationalStatus.STALE
              : BusOperationalStatus.LIVE;
        return {
          ...cached,
          status,
          isStale: status !== BusOperationalStatus.LIVE,
          ageSeconds: Math.max(0, Math.round(ageMs / 1000)),
        };
      }
    }

    const activeTrip = await this.tripsRepository.findActiveByBus(busId);
    if (activeTrip) {
      return this.getLiveTripState(activeTrip.id);
    }

    const latestLocation = await this.locationsRepository.findLatestByBusId(busId);
    const now = Date.now();

    const updateAgeSeconds = latestLocation
      ? Math.max(0, Math.floor((now - latestLocation.timestamp.getTime()) / 1000))
      : undefined;

    const accuracyQuality = latestLocation
      ? this.gpsValidator.evaluateAccuracy(latestLocation.accuracy)
      : GpsAccuracyQuality.UNKNOWN;

    return {
      busId,
      busNumber: 'Bus',
      tripId: latestLocation?.tripId,
      routeId: undefined,
      routeCode: undefined,
      routeName: undefined,
      driverId: undefined,
      driverName: undefined,
      status: latestLocation ? BusOperationalStatus.OFFLINE : BusOperationalStatus.TRIP_NOT_STARTED,
      isStale: true,
      latitude: latestLocation?.latitude,
      longitude: latestLocation?.longitude,
      speed: latestLocation?.speed ?? null,
      heading: latestLocation?.heading ?? null,
      accuracy: latestLocation?.accuracy ?? null,
      accuracyQuality,
      recordedAt: latestLocation ? latestLocation.timestamp.toISOString() : undefined,
      receivedAt: latestLocation ? latestLocation.createdAt.toISOString() : undefined,
      ageSeconds: updateAgeSeconds,

      currentLocation: latestLocation
        ? {
            id: latestLocation.id,
            latitude: latestLocation.latitude,
            longitude: latestLocation.longitude,
            speed: latestLocation.speed,
            heading: latestLocation.heading,
            accuracy: latestLocation.accuracy,
            timestamp: latestLocation.timestamp.toISOString(),
            receivedAt: latestLocation.createdAt.toISOString(),
          }
        : null,
      lastLocationAt: latestLocation ? latestLocation.timestamp.toISOString() : null,
      updateAgeSeconds: updateAgeSeconds ?? null,
      speedKmh: latestLocation?.speed ?? null,
      accuracyMeters: latestLocation?.accuracy ?? null,
      signalQuality: accuracyQuality,
      isMoving: false,
    };
  }

  /**
   * Deterministic calculation of bus live status based on trip lifecycle and telemetry freshness.
   */
  deriveBusLiveStatus(
    tripStatus: TripStatus,
    lastLocationAt: Date | null,
    nowMs: number = Date.now(),
  ): BusOperationalStatus {
    if (tripStatus === TripStatus.COMPLETED) {
      return BusOperationalStatus.COMPLETED;
    }

    if (tripStatus === TripStatus.CANCELLED) {
      return BusOperationalStatus.CANCELLED;
    }

    if (tripStatus !== TripStatus.ACTIVE) {
      return BusOperationalStatus.TRIP_NOT_STARTED;
    }

    if (!lastLocationAt) {
      return BusOperationalStatus.OFFLINE;
    }

    const elapsedMs = nowMs - lastLocationAt.getTime();

    if (elapsedMs > GPS_CONFIG.OFFLINE_THRESHOLD_MS) {
      return BusOperationalStatus.OFFLINE;
    }

    if (elapsedMs > GPS_CONFIG.LIVE_THRESHOLD_MS) {
      return BusOperationalStatus.STALE;
    }

    return BusOperationalStatus.LIVE;
  }

  /**
   * Updates cached state directly upon accepted ingestion to avoid database re-query.
   */
  updateCache(tripId: string, state: LiveBusState): void {
    this.liveStateCache.set(tripId, state);
    if (state.busId) {
      this.busToTripCache.set(state.busId, tripId);
    }
  }

  /**
   * Clears state for trip upon completion or cancellation.
   */
  evictCache(tripId: string): void {
    const existing = this.liveStateCache.get(tripId);
    if (existing?.busId) {
      this.busToTripCache.delete(existing.busId);
    }
    this.liveStateCache.delete(tripId);
  }

  getMetrics(): {
    activeTripsTracked: number;
    totalPingsAccepted: number;
    totalPingsRejected: number;
  } {
    return {
      activeTripsTracked: this.liveStateCache.size,
      totalPingsAccepted: 0,
      totalPingsRejected: 0,
    };
  }
}
