import { Injectable, Logger } from '@nestjs/common';
import {
  RouteProgressSnapshot,
  RouteStopDetail,
  StopProgressEvaluation,
  StopProgressionStatus,
  NextStopSummary,
} from '../domain/eta.types';
import { haversineDistance, projectPointOnSegment } from '../../../common/utils/geo.util';
import { ETA_CONFIG } from '../constants/eta.constants';

/**
 * RouteProgressService
 * Deterministically projects a bus's GPS position onto an authoritative ordered sequence of route stops.
 * Accurately determines:
 * - Current active route segment
 * - Cumulative road distance to each stop along the route
 * - Authoritative stop progression status (PASSED, APPROACHING, NEXT, UPCOMING)
 * - Immediate next stop
 * - Off-route detection
 */
@Injectable()
export class RouteProgressService {
  private readonly logger = new Logger(RouteProgressService.name);

  computeProgress(
    routeStops: RouteStopDetail[],
    busLat: number,
    busLon: number,
  ): RouteProgressSnapshot {
    if (!routeStops || routeStops.length === 0) {
      return {
        currentSegmentIndex: 0,
        nearestSegmentDistanceMeters: 0,
        isOffRoute: false,
        projectedLat: busLat,
        projectedLon: busLon,
        nextStop: null,
        stops: [],
        passedStopsCount: 0,
        remainingStopsCount: 0,
      };
    }

    // Sort by sequenceOrder to guarantee authoritative sequence
    const sortedStops = [...routeStops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    // Single stop route edge case
    if (sortedStops.length === 1) {
      const stop = sortedStops[0].stop;
      const dist = haversineDistance(busLat, busLon, stop.latitude, stop.longitude);
      const isApproaching =
        dist <= (stop.geofenceRadiusMeters || ETA_CONFIG.STOP_ARRIVAL_RADIUS_METERS);
      const status: StopProgressionStatus = isApproaching ? 'APPROACHING' : 'NEXT';

      const singleEval: StopProgressEvaluation = {
        stopId: stop.id,
        stopName: stop.name,
        stopCode: stop.code,
        sequenceOrder: sortedStops[0].sequenceOrder,
        latitude: stop.latitude,
        longitude: stop.longitude,
        geofenceRadiusMeters: stop.geofenceRadiusMeters || ETA_CONFIG.STOP_ARRIVAL_RADIUS_METERS,
        status,
        distanceFromBusMeters: Math.round(dist),
        distanceAlongRouteMeters: Math.round(dist),
        interveningStopsCount: 0,
      };

      return {
        currentSegmentIndex: 0,
        nearestSegmentDistanceMeters: Math.round(dist),
        isOffRoute: dist > ETA_CONFIG.OFF_ROUTE_THRESHOLD_METERS,
        projectedLat: stop.latitude,
        projectedLon: stop.longitude,
        nextStop: {
          stopId: stop.id,
          stopName: stop.name,
          stopCode: stop.code,
          sequenceOrder: sortedStops[0].sequenceOrder,
        },
        stops: [singleEval],
        passedStopsCount: 0,
        remainingStopsCount: 1,
      };
    }

    // 1. Evaluate all segments to identify best projection and current position
    let bestSegmentIndex = 0;
    let minPerpDistance = Number.MAX_VALUE;
    let bestProjection = projectPointOnSegment(
      busLat,
      busLon,
      sortedStops[0].stop.latitude,
      sortedStops[0].stop.longitude,
      sortedStops[1].stop.latitude,
      sortedStops[1].stop.longitude,
    );

    // Calculate distances between consecutive stops
    const segmentLengths: number[] = [];
    for (let i = 0; i < sortedStops.length - 1; i++) {
      const s1 = sortedStops[i].stop;
      const s2 = sortedStops[i + 1].stop;
      const length = haversineDistance(s1.latitude, s1.longitude, s2.latitude, s2.longitude);
      segmentLengths.push(length);

      const proj = projectPointOnSegment(
        busLat,
        busLon,
        s1.latitude,
        s1.longitude,
        s2.latitude,
        s2.longitude,
      );

      // We favor the segment that minimizes perpendicular distance to the bus
      if (proj.perpendicularDistanceMeters < minPerpDistance) {
        minPerpDistance = proj.perpendicularDistanceMeters;
        bestSegmentIndex = i;
        bestProjection = proj;
      }
    }

    // Check if the bus has advanced right up to or into the geofence of the segment end
    const segmentEndStop = sortedStops[bestSegmentIndex + 1].stop;
    const distToEndStop = haversineDistance(
      busLat,
      busLon,
      segmentEndStop.latitude,
      segmentEndStop.longitude,
    );
    const endStopRadius =
      segmentEndStop.geofenceRadiusMeters || ETA_CONFIG.STOP_ARRIVAL_RADIUS_METERS;

    // If bus is practically at the segment end stop and there is a subsequent segment, advance if moving forward
    if (
      bestProjection.fraction >= 0.95 &&
      distToEndStop <= endStopRadius &&
      bestSegmentIndex < sortedStops.length - 2
    ) {
      const nextSegProj = projectPointOnSegment(
        busLat,
        busLon,
        sortedStops[bestSegmentIndex + 1].stop.latitude,
        sortedStops[bestSegmentIndex + 1].stop.longitude,
        sortedStops[bestSegmentIndex + 2].stop.latitude,
        sortedStops[bestSegmentIndex + 2].stop.longitude,
      );
      if (nextSegProj.perpendicularDistanceMeters <= minPerpDistance * 1.5) {
        bestSegmentIndex++;
        bestProjection = nextSegProj;
        minPerpDistance = nextSegProj.perpendicularDistanceMeters;
      }
    }

    const isOffRoute = minPerpDistance > ETA_CONFIG.OFF_ROUTE_THRESHOLD_METERS;
    const evaluatedStops: StopProgressEvaluation[] = [];

    // Distance remaining on the current active segment to reach stop (bestSegmentIndex + 1)
    const remainingOnActiveSegment = bestProjection.remainingSegmentDistanceMeters;

    // 2. Classify each stop along the authoritative sequence
    for (let idx = 0; idx < sortedStops.length; idx++) {
      const routeStop = sortedStops[idx];
      const stop = routeStop.stop;
      const geofenceRadius = stop.geofenceRadiusMeters || ETA_CONFIG.STOP_ARRIVAL_RADIUS_METERS;
      const directDist = haversineDistance(busLat, busLon, stop.latitude, stop.longitude);

      let status: StopProgressionStatus;
      let distanceAlongRoute = 0;
      let interveningStopsCount = 0;

      if (idx <= bestSegmentIndex) {
        // Stops prior to or at the start of current active segment
        // Check if bus is still lingering at the start stop of this segment
        if (
          idx === bestSegmentIndex &&
          bestProjection.fraction < 0.1 &&
          directDist <= geofenceRadius
        ) {
          status = 'APPROACHING';
          distanceAlongRoute = Math.round(directDist);
        } else {
          status = 'PASSED';
          distanceAlongRoute = 0;
        }
      } else if (idx === bestSegmentIndex + 1) {
        // Immediate next stop of current active segment
        if (directDist <= geofenceRadius || remainingOnActiveSegment <= geofenceRadius) {
          status = 'APPROACHING';
        } else {
          status = 'NEXT';
        }
        distanceAlongRoute = Math.round(remainingOnActiveSegment);
        interveningStopsCount = 0;
      } else {
        // Subsequent upcoming stops
        status = 'UPCOMING';
        interveningStopsCount = idx - (bestSegmentIndex + 1);

        // Sum remaining on active segment + intervening full segment lengths
        let distAccum = remainingOnActiveSegment;
        for (let s = bestSegmentIndex + 1; s < idx; s++) {
          distAccum += segmentLengths[s];
        }
        distanceAlongRoute = Math.round(distAccum);
      }

      evaluatedStops.push({
        stopId: stop.id,
        stopName: stop.name,
        stopCode: stop.code,
        sequenceOrder: routeStop.sequenceOrder,
        latitude: stop.latitude,
        longitude: stop.longitude,
        geofenceRadiusMeters: geofenceRadius,
        status,
        distanceFromBusMeters: Math.round(directDist),
        distanceAlongRouteMeters: distanceAlongRoute,
        interveningStopsCount,
      });
    }

    // 3. Find immediate next stop
    const nextStopEval =
      evaluatedStops.find((s) => s.status === 'NEXT' || s.status === 'APPROACHING') ??
      evaluatedStops.find((s) => s.status === 'UPCOMING') ??
      null;

    const nextStop: NextStopSummary | null = nextStopEval
      ? {
          stopId: nextStopEval.stopId,
          stopName: nextStopEval.stopName,
          stopCode: nextStopEval.stopCode,
          sequenceOrder: nextStopEval.sequenceOrder,
        }
      : null;

    const passedStopsCount = evaluatedStops.filter((s) => s.status === 'PASSED').length;
    const remainingStopsCount = evaluatedStops.length - passedStopsCount;

    return {
      currentSegmentIndex: bestSegmentIndex,
      nearestSegmentDistanceMeters: Math.round(minPerpDistance),
      isOffRoute,
      projectedLat: bestProjection.projectedLat,
      projectedLon: bestProjection.projectedLon,
      nextStop,
      stops: evaluatedStops,
      passedStopsCount,
      remainingStopsCount,
    };
  }
}
