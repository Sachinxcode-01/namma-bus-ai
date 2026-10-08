/**
 * GPS and Real-time Tracking Operational Constants
 *
 * Centralized, configurable thresholds governing GPS telemetry validation,
 * vehicle movement plausibility, clock drift tolerance, and staleness detection.
 */

export const GPS_CONFIG = {
  // Vehicle speed plausibility limits
  MAX_PLAUSIBLE_SPEED_KMH: 120.0,
  // Jump / teleportation anomaly threshold
  MAX_TELEPORT_SPEED_KMH: 160.0,
  // Teleportation time evaluation window in seconds
  MAX_TELEPORT_EVAL_WINDOW_SECONDS: 120,
  // Suspicious speed threshold (flagged but handled carefully)
  SUSPICIOUS_SPEED_KMH: 95.0,

  // Timestamp tolerances
  MAX_FUTURE_SKEW_MS: 60 * 1000, // 60 seconds clock skew tolerance
  MAX_STALE_AGE_MS: 10 * 60 * 1000, // 10 minutes maximum age for ingestion

  // Live operational bus status thresholds (based on last accepted ping)
  LIVE_THRESHOLD_MS: 45 * 1000, // < 45 seconds = LIVE
  STALE_THRESHOLD_MS: 120 * 1000, // 45s - 2m = STALE
  OFFLINE_THRESHOLD_MS: 180 * 1000, // > 3m = OFFLINE

  // GPS Accuracy telemetry thresholds (in meters)
  ACCURACY_EXCELLENT_METERS: 10.0,
  ACCURACY_GOOD_METERS: 25.0,
  ACCURACY_ACCEPTABLE_METERS: 50.0,
  MAX_ACCURACY_REJECTION_METERS: 200.0, // GPS readings with accuracy > 200m are discarded as unusable

  // Micro-jitter and deduplication suppression
  MIN_PING_INTERVAL_MS: 500, // Half a second minimum delta between pings
  MIN_DISTANCE_DELTA_METERS: 2.0, // Suppress stationary micro-jitter under 2 meters

  // Server-Sent Events (SSE) keep-alive heartbeat interval (20 seconds)
  SSE_HEARTBEAT_INTERVAL_MS: 20 * 1000,
} as const;

export enum BusOperationalStatus {
  TRIP_NOT_STARTED = 'TRIP_NOT_STARTED',
  LIVE = 'LIVE',
  STALE = 'STALE',
  OFFLINE = 'OFFLINE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum GpsAccuracyQuality {
  EXCELLENT = 'EXCELLENT',
  ACCEPTABLE = 'ACCEPTABLE',
  POOR = 'POOR',
  UNKNOWN = 'UNKNOWN',
}

export enum MovementClassification {
  VALID = 'VALID',
  SUSPICIOUS = 'SUSPICIOUS',
  REJECTED = 'REJECTED',
}
