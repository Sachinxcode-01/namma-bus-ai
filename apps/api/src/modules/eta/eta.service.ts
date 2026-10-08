import { Injectable, Logger } from '@nestjs/common';
import { TripStatus } from '@prisma/client';
import { TripsRepository } from '../trips/trips.repository';
import { LocationsRepository } from '../locations/locations.repository';
import { EtaCalculatorService } from './services/eta-calculator.service';
import { EtaCacheService } from './services/eta-cache.service';
import { EtaStreamService } from './services/eta-stream.service';
import {
  EtaConfidence,
  EtaStatus,
  TripEtaBroadcastEvent,
  TripEtaDomainResult,
} from './domain/eta.types';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { NotFoundException, ValidationException } from '../../common/errors/app.exception';
import { ETA_CONFIG } from './constants/eta.constants';

/**
 * EtaService
 * Authoritative business service coordinating arrival prediction calculation,
 * caching, real-time broadcasts, and trip status lifecycle evaluation.
 */
@Injectable()
export class EtaService {
  private readonly logger = new Logger(EtaService.name);

  // Tracks the last broadcasted ETA values per trip to prevent real-time notification spam
  private readonly lastBroadcastMap = new Map<
    string,
    { etaMinutes: number; nextStopId?: string; status: EtaStatus }
  >();

  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly locationsRepository: LocationsRepository,
    private readonly etaCalculator: EtaCalculatorService,
    private readonly etaCache: EtaCacheService,
    private readonly etaStream: EtaStreamService,
  ) {}

  /**
   * Retrieves or computes authoritative ETA for a trip and optionally a specific stop.
   */
  async getTripEta(
    tripId: string,
    stopId?: string,
    _user?: AuthenticatedUser,
  ): Promise<TripEtaDomainResult> {
    // 1. Check in-memory fast cache
    const cached = this.etaCache.get(tripId, stopId);
    if (cached) {
      return cached;
    }

    // 2. Fetch authoritative trip details
    const trip = await this.tripsRepository.findById(tripId);
    if (!trip) {
      throw new NotFoundException('Trip', tripId);
    }

    const now = new Date();

    // 3. Handle non-ACTIVE trip states explicitly
    if (trip.status !== TripStatus.ACTIVE) {
      return this.handleInactiveTrip(trip, stopId, now);
    }

    // 4. Validate route structure
    const routeStops = trip.route?.routeStops ?? [];
    if (routeStops.length === 0) {
      throw new ValidationException(
        `Route ${trip.routeId} associated with trip ${tripId} has no configured stops.`,
      );
    }

    // 5. Retrieve latest validated GPS location
    const latestLocation =
      trip.lastKnownLocation ?? (await this.locationsRepository.findLatestByTripId(tripId));

    // 6. Execute deterministic baseline calculation
    const result = this.etaCalculator.calculate({
      tripId: trip.id,
      busId: trip.busId,
      routeId: trip.routeId,
      routeStops,
      latestLocation,
      now,
      selectedStopId: stopId,
    });

    // 7. Store in fast in-memory cache
    this.etaCache.set(tripId, result, stopId);

    return result;
  }

  /**
   * Recalculates ETA upon receipt of fresh accepted GPS telemetry and broadcasts if change is significant.
   */
  async recalculateAndBroadcast(tripId: string): Promise<TripEtaDomainResult | null> {
    this.etaCache.invalidate(tripId);

    try {
      const result = await this.getTripEta(tripId);

      const last = this.lastBroadcastMap.get(tripId);
      const nextStopChanged = last?.nextStopId !== result.nextStop?.stopId;
      const statusChanged = last?.status !== result.status;
      const etaDelta = last ? Math.abs(last.etaMinutes - result.etaMinutes) : 999;

      // Broadcast if first time, next stop transitioned, status changed, or ETA shifted >= 1 minute
      if (
        !last ||
        nextStopChanged ||
        statusChanged ||
        etaDelta >= ETA_CONFIG.SIGNIFICANT_ETA_CHANGE_MINUTES
      ) {
        this.lastBroadcastMap.set(tripId, {
          etaMinutes: result.etaMinutes,
          nextStopId: result.nextStop?.stopId,
          status: result.status,
        });

        const broadcastEvent: TripEtaBroadcastEvent = {
          tripId: result.tripId,
          busId: result.busId,
          routeId: result.routeId,
          stopId: result.stopId,
          etaMinutes: result.etaMinutes,
          estimatedArrivalTime: result.estimatedArrivalTime,
          status: result.status,
          confidence: result.confidence,
          calculatedAt: result.calculatedAt,
          nextStop: result.nextStop,
          distanceRemainingMeters: result.distanceRemainingMeters,
        };

        this.etaStream.emitEtaUpdate(broadcastEvent);
      }

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to recalculate and broadcast ETA for trip ${tripId}: ${msg}`);
      return null;
    }
  }

  /**
   * Produces an explainable, safe ETA response for inactive (SCHEDULED, COMPLETED, CANCELLED) trips.
   */
  private handleInactiveTrip(
    trip: NonNullable<Awaited<ReturnType<TripsRepository['findById']>>>,
    stopId: string | undefined,
    now: Date,
  ): TripEtaDomainResult {
    const routeStops = trip.route?.routeStops ?? [];
    const isCompleted = trip.status === TripStatus.COMPLETED;

    const stops = routeStops.map((rs) => ({
      stopId: rs.stop.id,
      stopName: rs.stop.name,
      stopCode: rs.stop.code,
      sequenceOrder: rs.sequenceOrder,
      latitude: rs.stop.latitude,
      longitude: rs.stop.longitude,
      estimatedMinutes: 0,
      estimatedArrivalTime: now.toISOString(),
      distanceRemainingMeters: 0,
      status: (isCompleted ? 'PASSED' : 'UPCOMING') as 'PASSED' | 'UPCOMING',
    }));

    let focused = stops.find((s) => s.stopId === stopId);
    if (stopId && !focused) {
      throw new ValidationException(
        `Stop ${stopId} is not a valid stop along route ${trip.routeId}.`,
      );
    }
    if (!focused) {
      focused = stops[0];
    }

    return {
      tripId: trip.id,
      busId: trip.busId,
      routeId: trip.routeId,
      lastUpdated: trip.updatedAt.toISOString(),
      currentDelayMinutes: 0,
      stops,
      stopId: focused?.stopId,
      etaMinutes: 0,
      estimatedArrivalTime: now.toISOString(),
      distanceRemainingMeters: 0,
      nextStop: null,
      status: EtaStatus.NO_ACTIVE_TRIP,
      confidence: EtaConfidence.LOW,
      calculatedAt: now.toISOString(),
      isOffRoute: false,
    };
  }
}
