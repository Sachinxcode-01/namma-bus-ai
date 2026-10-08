import { Stop, RouteStop, LiveLocation } from '@prisma/client';
import {
  EtaStatus,
  EtaConfidence,
  NextStopSummary,
  StopEtaDto,
  TripEtaBroadcastEvent,
} from '@nammabus/shared-types';

export { EtaStatus, EtaConfidence, NextStopSummary, StopEtaDto, TripEtaBroadcastEvent };

export type StopProgressionStatus = 'PASSED' | 'APPROACHING' | 'NEXT' | 'UPCOMING';

export interface RouteStopDetail extends RouteStop {
  stop: Stop;
}

export interface StopProgressEvaluation {
  stopId: string;
  stopName: string;
  stopCode: string;
  sequenceOrder: number;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  status: StopProgressionStatus;
  distanceFromBusMeters: number;
  distanceAlongRouteMeters: number;
  interveningStopsCount: number;
}

export interface RouteProgressSnapshot {
  currentSegmentIndex: number;
  nearestSegmentDistanceMeters: number;
  isOffRoute: boolean;
  projectedLat: number;
  projectedLon: number;
  nextStop: NextStopSummary | null;
  stops: StopProgressEvaluation[];
  passedStopsCount: number;
  remainingStopsCount: number;
}

export interface SpeedEvaluation {
  effectiveSpeedKmh: number;
  source: 'GPS_CURRENT' | 'SMOOTHED_RECENT' | 'SEGMENT_SCHEDULED' | 'FLEET_FALLBACK';
  rawSpeedKmh: number | null;
  isStationary: boolean;
}

export interface GpsFreshnessEvaluation {
  ageSeconds: number;
  isFresh: boolean;
  isStale: boolean;
  isOffline: boolean;
  confidence: EtaConfidence;
}

export interface EtaCalculationInput {
  tripId: string;
  busId: string;
  routeId: string;
  routeStops: RouteStopDetail[];
  latestLocation: LiveLocation | null;
  now?: Date;
  selectedStopId?: string;
}

export interface TripEtaDomainResult {
  tripId: string;
  busId: string;
  routeId: string;
  lastUpdated: string;
  currentDelayMinutes: number;
  stops: StopEtaDto[];
  // Single stop focused / summary operational fields:
  stopId?: string;
  etaMinutes: number;
  estimatedArrivalTime: string;
  distanceRemainingMeters: number;
  nextStop: NextStopSummary | null;
  status: EtaStatus;
  confidence: EtaConfidence;
  calculatedAt: string;
  isOffRoute: boolean;
}
