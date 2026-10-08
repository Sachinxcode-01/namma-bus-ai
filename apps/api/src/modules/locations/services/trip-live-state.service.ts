import { Injectable, Logger } from '@nestjs/common';
import {
  BusOperationalStatus,
  GPS_CONFIG,
  GpsAccuracyQuality,
  MovementClassification,
} from '../constants/gps.constants';
import { LiveBusStateDto } from '../dto/live-bus-state.dto';

export interface InternalLiveState {
  busId: string;
  busNumber?: string;
  tripId: string;
  routeId: string;
  routeCode?: string;
  routeName?: string;
  driverId: string;
  driverName?: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  accuracyQuality: GpsAccuracyQuality;
  movementClassification: MovementClassification;
  recordedAt: Date; // Device timestamp
  receivedAt: Date; // Server timestamp
  totalPingsReceived: number;
  totalPingsAccepted: number;
  totalPingsRejected: number;
}

@Injectable()
export class TripLiveStateService {
  private readonly logger = new Logger(TripLiveStateService.name);

  // Authoritative in-memory state indexed by tripId and busId
  private readonly tripState = new Map<string, InternalLiveState>();
  private readonly busToTrip = new Map<string, string>(); // busId -> tripId

  /**
   * Updates the authoritative current operational position for an active trip.
   * Enforces invariant: Out-of-order delayed packets (new recordedAt <= current accepted recordedAt)
   * must NEVER move current operational position backwards in time.
   *
   * Returns true if this ping became the new authoritative live position.
   */
  updateCurrentPosition(params: {
    tripId: string;
    busId: string;
    routeId: string;
    driverId: string;
    busNumber?: string;
    routeCode?: string;
    routeName?: string;
    driverName?: string;
    latitude: number;
    longitude: number;
    speed?: number | null;
    heading?: number | null;
    accuracy?: number | null;
    accuracyQuality: GpsAccuracyQuality;
    movementClassification: MovementClassification;
    recordedAt: Date;
    receivedAt: Date;
  }): boolean {
    const existing = this.tripState.get(params.tripId);

    if (existing) {
      existing.totalPingsReceived += 1;

      // Invariant: Do not move authoritative live position backwards in time
      if (params.recordedAt.getTime() <= existing.recordedAt.getTime()) {
        this.logger.debug(
          `Ping for trip ${params.tripId} has timestamp ${params.recordedAt.toISOString()} <= accepted ${existing.recordedAt.toISOString()}. Preserving current live state.`,
        );
        return false;
      }

      // Update current live position
      existing.latitude = params.latitude;
      existing.longitude = params.longitude;
      existing.speed = params.speed ?? null;
      existing.heading = params.heading ?? null;
      existing.accuracy = params.accuracy ?? null;
      existing.accuracyQuality = params.accuracyQuality;
      existing.movementClassification = params.movementClassification;
      existing.recordedAt = params.recordedAt;
      existing.receivedAt = params.receivedAt;
      existing.totalPingsAccepted += 1;
      return true;
    }

    // First accepted ping for this trip
    const newState: InternalLiveState = {
      busId: params.busId,
      busNumber: params.busNumber,
      tripId: params.tripId,
      routeId: params.routeId,
      routeCode: params.routeCode,
      routeName: params.routeName,
      driverId: params.driverId,
      driverName: params.driverName,
      latitude: params.latitude,
      longitude: params.longitude,
      speed: params.speed ?? null,
      heading: params.heading ?? null,
      accuracy: params.accuracy ?? null,
      accuracyQuality: params.accuracyQuality,
      movementClassification: params.movementClassification,
      recordedAt: params.recordedAt,
      receivedAt: params.receivedAt,
      totalPingsReceived: 1,
      totalPingsAccepted: 1,
      totalPingsRejected: 0,
    };

    this.tripState.set(params.tripId, newState);
    this.busToTrip.set(params.busId, params.tripId);
    return true;
  }

  /**
   * Increments rejected pings counter for telemetry metrics.
   */
  recordRejectedPing(tripId: string): void {
    const existing = this.tripState.get(tripId);
    if (existing) {
      existing.totalPingsReceived += 1;
      existing.totalPingsRejected += 1;
    }
  }

  /**
   * Retrieves authoritative operational state for a trip.
   */
  getLiveTripState(tripId: string): LiveBusStateDto | null {
    const state = this.tripState.get(tripId);
    if (!state) return null;
    return this.buildLiveBusStateDto(state);
  }

  /**
   * Retrieves authoritative operational state for a bus vehicle.
   */
  getLiveBusState(busId: string): LiveBusStateDto | null {
    const tripId = this.busToTrip.get(busId);
    if (!tripId) return null;
    return this.getLiveTripState(tripId);
  }

  /**
   * Cleans up or completes state when a trip completes or is cancelled.
   */
  markTripEnded(tripId: string, finalStatus: BusOperationalStatus): void {
    const existing = this.tripState.get(tripId);
    if (existing) {
      this.busToTrip.delete(existing.busId);
      this.tripState.delete(tripId);
      this.logger.log(
        `Trip live state purged for completed/cancelled trip ${tripId} (${finalStatus})`,
      );
    }
  }

  /**
   * Computes dynamic operational status based on timestamp age against configured thresholds.
   */
  private buildLiveBusStateDto(state: InternalLiveState): LiveBusStateDto {
    const now = Date.now();
    const ageMs = now - state.recordedAt.getTime();
    const ageSeconds = Math.max(0, Math.round(ageMs / 1000));

    let status = BusOperationalStatus.LIVE;
    let isStale = false;

    if (ageMs > GPS_CONFIG.OFFLINE_THRESHOLD_MS) {
      status = BusOperationalStatus.OFFLINE;
      isStale = true;
    } else if (ageMs > GPS_CONFIG.STALE_THRESHOLD_MS) {
      status = BusOperationalStatus.STALE;
      isStale = true;
    }

    return {
      busId: state.busId,
      busNumber: state.busNumber,
      tripId: state.tripId,
      routeId: state.routeId,
      routeCode: state.routeCode,
      routeName: state.routeName,
      driverId: state.driverId,
      driverName: state.driverName,
      status,
      isStale,
      latitude: state.latitude,
      longitude: state.longitude,
      speed: state.speed,
      heading: state.heading,
      accuracy: state.accuracy,
      accuracyQuality: state.accuracyQuality,
      recordedAt: state.recordedAt.toISOString(),
      receivedAt: state.receivedAt.toISOString(),
      ageSeconds,
    };
  }

  /**
   * Metrics for health diagnostics.
   */
  getMetrics(): {
    activeTripsTracked: number;
    totalPingsAccepted: number;
    totalPingsRejected: number;
  } {
    let accepted = 0;
    let rejected = 0;
    for (const state of this.tripState.values()) {
      accepted += state.totalPingsAccepted;
      rejected += state.totalPingsRejected;
    }
    return {
      activeTripsTracked: this.tripState.size,
      totalPingsAccepted: accepted,
      totalPingsRejected: rejected,
    };
  }
}
