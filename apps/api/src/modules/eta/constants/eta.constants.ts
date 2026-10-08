/**
 * Production Constants for NammaBus AI ETA Engine
 * Centralizes all configurable thresholds, speed fallbacks, geofence radii,
 * and stabilization factors. Zero magic numbers permitted in business logic.
 */
export const ETA_CONFIG = {
  // Speed thresholds (km/h)
  DEFAULT_FLEET_SPEED_KMH: 25.0, // Typical average speed for college bus on semi-urban/suburban Karnataka routes
  MIN_MOVING_SPEED_KMH: 5.0, // Speeds below this are treated as stationary (traffic signal, boarding stop, congestion)
  MAX_PLAUSIBLE_SPEED_KMH: 100.0, // Speeds above this are treated as GPS telemetry anomalies and capped/fallback applied

  // Dwell times and stop delays
  INTERVENING_STOP_DWELL_SECONDS: 45, // Expected boarding/alighting dwell time per intermediate route stop

  // GPS freshness thresholds (seconds)
  FRESH_GPS_THRESHOLD_SECONDS: 45, // High confidence window
  MEDIUM_GPS_THRESHOLD_SECONDS: 120, // Medium confidence window
  STALE_GPS_THRESHOLD_SECONDS: 120, // Beyond 120s, ETA state is marked STALE
  OFFLINE_GPS_THRESHOLD_SECONDS: 300, // Beyond 300s, ETA state is marked GPS_UNAVAILABLE

  // Spatial and geofence thresholds (meters)
  STOP_ARRIVAL_RADIUS_METERS: 50.0, // Distance within stop coordinates considered arrived / passed
  STOP_APPROACHING_RADIUS_METERS: 250.0, // Distance within stop coordinates considered approaching
  OFF_ROUTE_THRESHOLD_METERS: 300.0, // Distance perpendicular from route line indicating off-route anomaly

  // Accuracy quality thresholds (meters)
  ACCURACY_HIGH_CONFIDENCE_METERS: 25.0,
  ACCURACY_MEDIUM_CONFIDENCE_METERS: 60.0,

  // ETA stabilization & smoothing
  SPEED_SMOOTHING_ALPHA: 0.6, // Weight given to current validated speed vs. baseline in EWMA
  SIGNIFICANT_ETA_CHANGE_MINUTES: 1.0, // Minimum delta required to trigger real-time SSE broadcast

  // In-memory calculation cache TTL (milliseconds)
  CACHE_TTL_MS: 5000, // 5 seconds cache to shield DB during high-concurrency student refresh spikes

  // Routing provider timeouts (milliseconds)
  ROUTING_PROVIDER_TIMEOUT_MS: 1500,
} as const;
