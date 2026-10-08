import { Injectable, Logger } from '@nestjs/common';
import { RouteProgressService } from './route-progress.service';
import {
  EtaCalculationInput,
  EtaConfidence,
  EtaStatus,
  GpsFreshnessEvaluation,
  SpeedEvaluation,
  StopEtaDto,
  TripEtaDomainResult,
} from '../domain/eta.types';
import { ETA_CONFIG } from '../constants/eta.constants';
import { ValidationException } from '../../../common/errors/app.exception';

/**
 * EtaCalculatorService
 * Authoritative deterministic baseline arrival prediction engine.
 * Computes route-aware, explainable travel times based on:
 * - Active route geometry and stop sequence progression
 * - Robust GPS speed evaluation with stationary dwell handling
 * - Multi-tier fallback hierarchy
 * - Stale/offline GPS safety flags
 * - Stop geofence detection and passed stop isolation
 */
@Injectable()
export class EtaCalculatorService {
  private readonly logger = new Logger(EtaCalculatorService.name);

  constructor(private readonly routeProgressService: RouteProgressService) {}

  calculate(input: EtaCalculationInput): TripEtaDomainResult {
    const now = input.now ?? new Date();
    const { routeStops, latestLocation, selectedStopId } = input;

    // 1. Evaluate GPS Freshness and Signal Quality
    const freshness = this.evaluateGpsFreshness(latestLocation, now);

    // 2. Evaluate Speed with Stationary Fallback Hierarchy
    const speedEval = this.evaluateSpeed(latestLocation);

    // 3. Compute Route Progression Along Authoritative Stop Sequence
    let progress;
    if (latestLocation) {
      progress = this.routeProgressService.computeProgress(
        routeStops,
        latestLocation.latitude,
        latestLocation.longitude,
      );
    } else {
      // Fallback: If no GPS ping ever recorded, bus assumed at start of route
      const startLat = routeStops[0]?.stop.latitude ?? 0;
      const startLon = routeStops[0]?.stop.longitude ?? 0;
      progress = this.routeProgressService.computeProgress(routeStops, startLat, startLon);
    }

    // 4. Determine Global ETA Status & Confidence
    let globalStatus: EtaStatus;
    if (!latestLocation || freshness.isOffline) {
      globalStatus = EtaStatus.GPS_UNAVAILABLE;
    } else if (freshness.isStale) {
      globalStatus = EtaStatus.STALE;
    } else {
      globalStatus = EtaStatus.AVAILABLE;
    }

    let globalConfidence = freshness.confidence;
    if (progress.isOffRoute) {
      globalConfidence = EtaConfidence.LOW;
    } else if (speedEval.isStationary && globalConfidence === EtaConfidence.HIGH) {
      globalConfidence = EtaConfidence.MEDIUM;
    }

    // 5. Calculate Per-Stop ETAs
    const effectiveSpeedMps = (speedEval.effectiveSpeedKmh * 1000) / 3600;
    const calculatedStops: StopEtaDto[] = progress.stops.map((evalStop) => {
      let etaMins = 0;
      let arrivalIso = now.toISOString();

      if (evalStop.status === 'PASSED') {
        etaMins = 0;
        arrivalIso = now.toISOString();
      } else if (evalStop.status === 'APPROACHING') {
        // Within geofence radius
        etaMins = evalStop.distanceAlongRouteMeters <= 75 ? 0 : 1;
        const arrivalDate = new Date(now.getTime() + etaMins * 60000);
        arrivalIso = arrivalDate.toISOString();
      } else {
        // NEXT or UPCOMING
        const travelSeconds = evalStop.distanceAlongRouteMeters / effectiveSpeedMps;
        const dwellSeconds =
          evalStop.interveningStopsCount * ETA_CONFIG.INTERVENING_STOP_DWELL_SECONDS;
        const totalSeconds = travelSeconds + dwellSeconds;
        etaMins = Math.max(1, Math.ceil(totalSeconds / 60));

        const arrivalDate = new Date(now.getTime() + etaMins * 60000);
        arrivalIso = arrivalDate.toISOString();
      }

      return {
        stopId: evalStop.stopId,
        stopName: evalStop.stopName,
        stopCode: evalStop.stopCode,
        sequenceOrder: evalStop.sequenceOrder,
        latitude: evalStop.latitude,
        longitude: evalStop.longitude,
        estimatedMinutes: etaMins,
        estimatedArrivalTime: arrivalIso,
        distanceRemainingMeters: evalStop.distanceAlongRouteMeters,
        status: evalStop.status,
      };
    });

    // 6. Handle Selected Stop Focus vs Next Stop Default
    let focusedStop: StopEtaDto | undefined;
    if (selectedStopId) {
      focusedStop = calculatedStops.find((s) => s.stopId === selectedStopId);
      if (!focusedStop) {
        throw new ValidationException(
          `Stop ${selectedStopId} is not a valid stop along route ${input.routeId}.`,
        );
      }
    } else {
      // Default focus to immediate next stop or upcoming stop
      focusedStop =
        calculatedStops.find((s) => s.status === 'APPROACHING' || s.status === 'NEXT') ??
        calculatedStops.find((s) => s.status === 'UPCOMING') ??
        calculatedStops[calculatedStops.length - 1];
    }

    // 7. Adjust Focused Status
    let focusedStatus: EtaStatus = globalStatus;
    if (globalStatus === EtaStatus.AVAILABLE) {
      if (focusedStop?.status === 'PASSED') {
        focusedStatus = EtaStatus.STOP_PASSED;
      } else if (focusedStop?.status === 'APPROACHING') {
        focusedStatus = EtaStatus.APPROACHING;
      }
    }

    // 8. Calculate Current Trip Delay
    const currentDelayMinutes = this.calculateDelay(routeStops, calculatedStops, now);

    return {
      tripId: input.tripId,
      busId: input.busId,
      routeId: input.routeId,
      lastUpdated: latestLocation ? latestLocation.timestamp.toISOString() : now.toISOString(),
      currentDelayMinutes,
      stops: calculatedStops,
      stopId: focusedStop?.stopId,
      etaMinutes: focusedStop?.estimatedMinutes ?? 0,
      estimatedArrivalTime: focusedStop?.estimatedArrivalTime ?? now.toISOString(),
      distanceRemainingMeters: focusedStop?.distanceRemainingMeters ?? 0,
      nextStop: progress.nextStop,
      status: focusedStatus,
      confidence: globalConfidence,
      calculatedAt: now.toISOString(),
      isOffRoute: progress.isOffRoute,
    };
  }

  /**
   * Evaluates GPS freshness and classifies confidence.
   */
  private evaluateGpsFreshness(
    location: { timestamp: Date; accuracy?: number | null } | null,
    now: Date,
  ): GpsFreshnessEvaluation {
    if (!location) {
      return {
        ageSeconds: Number.MAX_SAFE_INTEGER,
        isFresh: false,
        isStale: true,
        isOffline: true,
        confidence: EtaConfidence.LOW,
      };
    }

    const ageSeconds = Math.max(
      0,
      Math.floor((now.getTime() - location.timestamp.getTime()) / 1000),
    );
    const isOffline = ageSeconds > ETA_CONFIG.OFFLINE_GPS_THRESHOLD_SECONDS;
    const isStale = ageSeconds > ETA_CONFIG.STALE_GPS_THRESHOLD_SECONDS;
    const isFresh = ageSeconds <= ETA_CONFIG.FRESH_GPS_THRESHOLD_SECONDS;

    const accuracy = location.accuracy ?? 15.0;
    let confidence: EtaConfidence;

    if (isOffline || isStale || accuracy > ETA_CONFIG.ACCURACY_MEDIUM_CONFIDENCE_METERS) {
      confidence = EtaConfidence.LOW;
    } else if (!isFresh || accuracy > ETA_CONFIG.ACCURACY_HIGH_CONFIDENCE_METERS) {
      confidence = EtaConfidence.MEDIUM;
    } else {
      confidence = EtaConfidence.HIGH;
    }

    return { ageSeconds, isFresh, isStale, isOffline, confidence };
  }

  /**
   * Evaluates speed according to the multi-tier fallback hierarchy:
   * 1. Validated GPS moving speed (5.0 <= v <= 100.0 km/h)
   * 2. Exponential smoothing if moving
   * 3. Stationary bus fallback to baseline fleet speed (25 km/h) when stopped at traffic/stops
   */
  private evaluateSpeed(location: { speed?: number | null } | null): SpeedEvaluation {
    const rawSpeed = location?.speed ?? null;

    if (rawSpeed === null || rawSpeed < ETA_CONFIG.MIN_MOVING_SPEED_KMH) {
      return {
        effectiveSpeedKmh: ETA_CONFIG.DEFAULT_FLEET_SPEED_KMH,
        source: 'FLEET_FALLBACK',
        rawSpeedKmh: rawSpeed,
        isStationary: true,
      };
    }

    // Cap excessive speeds at max plausible speed
    const clampedSpeed = Math.min(rawSpeed, ETA_CONFIG.MAX_PLAUSIBLE_SPEED_KMH);

    // Apply exponential smoothing between current moving speed and baseline
    const smoothedSpeed =
      ETA_CONFIG.SPEED_SMOOTHING_ALPHA * clampedSpeed +
      (1 - ETA_CONFIG.SPEED_SMOOTHING_ALPHA) * ETA_CONFIG.DEFAULT_FLEET_SPEED_KMH;

    return {
      effectiveSpeedKmh: Math.round(smoothedSpeed * 10) / 10,
      source: 'SMOOTHED_RECENT',
      rawSpeedKmh: rawSpeed,
      isStationary: false,
    };
  }

  /**
   * Estimates schedule delay in minutes based on route stop schedule targets.
   */
  private calculateDelay(
    routeStops: Array<{ estimatedMinutesFromStart?: number | null }>,
    stops: StopEtaDto[],
    _now: Date,
  ): number {
    // If schedule offsets are defined on route stops
    const nextStopIndex = stops.findIndex((s) => s.status === 'NEXT' || s.status === 'APPROACHING');
    if (nextStopIndex < 0) return 0;

    const scheduledMinutes = routeStops[nextStopIndex]?.estimatedMinutesFromStart;
    if (scheduledMinutes === undefined || scheduledMinutes === null) return 0;

    const currentPredictedMinutes = stops[nextStopIndex]?.estimatedMinutes ?? 0;
    const diff = currentPredictedMinutes - scheduledMinutes;
    return Math.max(0, diff);
  }
}
