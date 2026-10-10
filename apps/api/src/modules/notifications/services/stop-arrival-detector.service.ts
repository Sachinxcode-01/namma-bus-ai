import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { LiveLocation, Stop, StopEventType, TripStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { haversineDistance } from '../../../common/utils/geo.util';
import { NOTIFICATION_CONFIG } from '../constants/notification.constants';
import { CandidateArrival, StopArrivalEvaluationResult } from '../domain/notification.types';
import { NotificationsService } from '../notifications.service';

interface RouteStopWithStop {
  stopId: string;
  sequenceOrder: number;
  stop: Stop;
}

interface TripWithRoute {
  id: string;
  busId: string;
  routeId: string;
  status: TripStatus;
  route?: {
    id: string;
    code: string;
    name: string;
    routeStops: RouteStopWithStop[];
  } | null;
}

@Injectable()
export class StopArrivalDetectorService {
  private readonly logger = new Logger(StopArrivalDetectorService.name);

  // In-memory stabilization tracker for pending stop arrivals: tripId -> (stopId -> CandidateArrival)
  private readonly arrivalCandidates = new Map<string, Map<string, CandidateArrival>>();

  // Set of stops where bus is currently dwelling: `${tripId}:${stopId}`
  private readonly dwellingStops = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Evaluates incoming accepted GPS telemetry to detect stop arrivals and departures.
   */
  async evaluate(
    trip: TripWithRoute,
    location: LiveLocation,
  ): Promise<StopArrivalEvaluationResult> {
    if (trip.status !== TripStatus.ACTIVE) {
      return { hasArrived: false, isStabilized: false };
    }

    // 1. GPS Accuracy Guard: Discard noisy GPS pings that could trigger false arrivals
    if (
      location.accuracy !== null &&
      location.accuracy > NOTIFICATION_CONFIG.MAX_ARRIVAL_GPS_ACCURACY_METERS
    ) {
      this.logger.debug(
        `Skipping stop arrival check for trip ${trip.id}: GPS accuracy (${location.accuracy}m) exceeds threshold (${NOTIFICATION_CONFIG.MAX_ARRIVAL_GPS_ACCURACY_METERS}m).`,
      );
      return { hasArrived: false, isStabilized: false };
    }

    // 2. Freshness Guard: Discard excessively delayed or stale telemetry pings
    const pingAgeSeconds = (Date.now() - new Date(location.timestamp).getTime()) / 1000;
    if (pingAgeSeconds > NOTIFICATION_CONFIG.MAX_GPS_AGE_FOR_ARRIVAL_SECONDS) {
      this.logger.debug(
        `Skipping stop arrival check for trip ${trip.id}: GPS timestamp is stale (${Math.round(pingAgeSeconds)}s old).`,
      );
      return { hasArrived: false, isStabilized: false };
    }

    // 3. Extract and sort authoritative route stops
    const routeStops = trip.route?.routeStops ?? [];
    if (routeStops.length === 0) {
      return { hasArrived: false, isStabilized: false };
    }

    const sortedRouteStops = [...routeStops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    // Fetch existing recorded stop events for this trip
    const existingEvents = await this.prisma.stopEvent.findMany({
      where: { tripId: trip.id },
    });

    const arrivedStopIds = new Set(
      existingEvents.filter((e) => e.eventType === StopEventType.ARRIVED).map((e) => e.stopId),
    );
    const departedStopIds = new Set(
      existingEvents.filter((e) => e.eventType === StopEventType.DEPARTED).map((e) => e.stopId),
    );

    // Get candidate tracking map for this trip
    if (!this.arrivalCandidates.has(trip.id)) {
      this.arrivalCandidates.set(trip.id, new Map());
    }
    const tripCandidates = this.arrivalCandidates.get(trip.id)!;

    // 4. Evaluate each route stop in authoritative sequence
    for (const rs of sortedRouteStops) {
      const stop = rs.stop;
      const geofenceRadius =
        stop.geofenceRadiusMeters || NOTIFICATION_CONFIG.DEFAULT_STOP_ARRIVAL_RADIUS_METERS;

      const distance = haversineDistance(
        location.latitude,
        location.longitude,
        stop.latitude,
        stop.longitude,
      );

      // A) Handle Stop Departure: If arrived previously, bus is moving away past boundary, record DEPARTED
      if (arrivedStopIds.has(stop.id) && !departedStopIds.has(stop.id)) {
        const departureThreshold =
          geofenceRadius + NOTIFICATION_CONFIG.STOP_DEPARTURE_BUFFER_METERS;
        if (distance > departureThreshold) {
          await this.recordDeparture(trip.id, stop.id, location.timestamp);
          this.dwellingStops.delete(`${trip.id}:${stop.id}`);
        }
      }

      // B) Skip stops that have already had an arrival recorded
      if (arrivedStopIds.has(stop.id)) {
        continue;
      }

      // C) Check if bus is inside stop arrival geofence
      if (distance <= geofenceRadius) {
        let candidate = tripCandidates.get(stop.id);
        const speed = location.speed ?? 0;

        if (!candidate) {
          candidate = {
            stopId: stop.id,
            firstDetectedAt: new Date(location.timestamp),
            consecutivePings: 1,
            lastDistanceMeters: Math.round(distance),
          };
          tripCandidates.set(stop.id, candidate);
        } else {
          candidate.consecutivePings++;
          candidate.lastDistanceMeters = Math.round(distance);
        }

        // Multi-sample stabilization:
        // Confirmed if:
        // - 2 consecutive pings inside geofence OR
        // - Bus is slow/stationary (< 15 km/h) picking up students inside geofence
        const isLowSpeed = speed < 15.0;
        const isStabilized =
          candidate.consecutivePings >= NOTIFICATION_CONFIG.CONSECUTIVE_PINGS_FOR_ARRIVAL ||
          isLowSpeed;

        if (isStabilized) {
          this.logger.log(
            `Stop arrival confirmed for trip ${trip.id} at stop '${stop.name}' (${stop.code}). Distance: ${Math.round(distance)}m, Pings: ${candidate.consecutivePings}, Speed: ${speed} km/h`,
          );

          // Atomic persistence of ARRIVED event with unique constraint protection
          await this.recordArrival(trip.id, stop.id, location.timestamp);

          // Clean up candidate tracking
          tripCandidates.delete(stop.id);
          this.dwellingStops.add(`${trip.id}:${stop.id}`);

          // Trigger stop arrival notifications to subscribed students
          if (this.notificationsService) {
            this.notificationsService
              .handleStopArrival(trip, stop)
              .catch((err) =>
                this.logger.error(
                  `Error dispatching arrival notifications for stop ${stop.id}: ${err?.message || err}`,
                ),
              );
          }

          return {
            hasArrived: true,
            stopId: stop.id,
            stopName: stop.name,
            distanceMeters: Math.round(distance),
            isStabilized: true,
          };
        }
      } else {
        // Bus is outside geofence: reset candidate counter if bus previously grazed boundary
        tripCandidates.delete(stop.id);
      }
    }

    return { hasArrived: false, isStabilized: false };
  }

  /**
   * Resets arrival state tracking when a trip completes, cancels, or starts afresh.
   */
  resetTripState(tripId: string): void {
    this.arrivalCandidates.delete(tripId);
    for (const key of Array.from(this.dwellingStops)) {
      if (key.startsWith(`${tripId}:`)) {
        this.dwellingStops.delete(key);
      }
    }
  }

  private async recordArrival(tripId: string, stopId: string, timestamp: Date): Promise<void> {
    try {
      await this.prisma.stopEvent.upsert({
        where: {
          tripId_stopId_eventType: {
            tripId,
            stopId,
            eventType: StopEventType.ARRIVED,
          },
        },
        create: {
          tripId,
          stopId,
          eventType: StopEventType.ARRIVED,
          timestamp,
        },
        update: {},
      });
    } catch (err) {
      this.logger.debug(`Idempotent stop arrival event record for trip ${tripId}, stop ${stopId}`);
    }
  }

  private async recordDeparture(tripId: string, stopId: string, timestamp: Date): Promise<void> {
    try {
      await this.prisma.stopEvent.upsert({
        where: {
          tripId_stopId_eventType: {
            tripId,
            stopId,
            eventType: StopEventType.DEPARTED,
          },
        },
        create: {
          tripId,
          stopId,
          eventType: StopEventType.DEPARTED,
          timestamp,
        },
        update: {},
      });
    } catch (err) {
      this.logger.debug(
        `Idempotent stop departure event record for trip ${tripId}, stop ${stopId}`,
      );
    }
  }
}
