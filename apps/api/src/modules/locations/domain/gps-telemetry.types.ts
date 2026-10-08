import { LiveLocation } from '@prisma/client';
import {
  BusOperationalStatus,
  GpsAccuracyQuality,
  MovementClassification,
} from '../constants/gps.constants';

export const BusLiveStatus = BusOperationalStatus;
export type BusLiveStatus = BusOperationalStatus;

export const GpsSignalQuality = GpsAccuracyQuality;
export type GpsSignalQuality = GpsAccuracyQuality;

export const GpsMovementClassification = MovementClassification;
export type GpsMovementClassification = MovementClassification;

/**
 * Result of comprehensive GPS validation & anomaly evaluation
 */
export interface GpsValidationResult {
  isValid: boolean;
  classification: MovementClassification;
  signalQuality: GpsAccuracyQuality;
  calculatedSpeedKmh?: number;
  displacementMeters?: number;
  elapsedSeconds?: number;
  reason?: string;
  isStaleOrHistorical: boolean;
  isDuplicate: boolean;
}

/**
 * Comprehensive live operational state for a bus and its trip
 */
export interface LiveBusState {
  busId: string;
  busNumber?: string;
  tripId?: string;
  routeId?: string;
  routeCode?: string;
  routeName?: string;
  driverId?: string;
  driverName?: string;
  status: BusOperationalStatus;
  isStale: boolean;
  latitude?: number;
  longitude?: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  accuracyQuality: GpsAccuracyQuality;
  recordedAt?: string;
  receivedAt?: string;
  ageSeconds?: number;

  // Additional rich telemetry fields
  currentLocation?: {
    id: string;
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    accuracy: number | null;
    timestamp: string;
    receivedAt: string;
  } | null;
  lastLocationAt?: string | null;
  updateAgeSeconds?: number | null;
  speedKmh?: number | null;
  accuracyMeters?: number | null;
  signalQuality?: GpsAccuracyQuality;
  isMoving?: boolean;
}

/**
 * Real-time event payload distributed to subscribers
 */
export interface LiveLocationBroadcastEvent {
  tripId: string;
  busId: string;
  routeId: string;
  routeCode: string;
  busNumber: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string; // Device timestamp
  receivedAt: string; // Server timestamp
  status: BusOperationalStatus;
  signalQuality: GpsAccuracyQuality;
  locationId: string;
}

/**
 * Ingestion response returned to driver mobile app
 */
export interface IngestLocationResult {
  accepted: boolean;
  status: BusOperationalStatus;
  location: LiveLocation;
  signalQuality: GpsAccuracyQuality;
  classification: MovementClassification;
  message?: string;
}

/**
 * Batch ingestion response for offline buffered telemetry sync
 */
export interface BatchIngestResult {
  totalReceived: number;
  acceptedCount: number;
  ingestedCount: number;
  rejectedCount: number;
  latestStatus: BusOperationalStatus;
  latestLocation: LiveLocation | null;
}
