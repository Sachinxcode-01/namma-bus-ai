export const REALTIME_CHANNELS = {
  LOCATIONS: 'nammabus:locations',
  ETA: 'nammabus:eta',
  NOTIFICATIONS: 'nammabus:notifications',
  INCIDENTS: 'nammabus:incidents',
} as const;

export type RealtimeChannel = (typeof REALTIME_CHANNELS)[keyof typeof REALTIME_CHANNELS];

export const REALTIME_DEFAULTS = {
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: 3,
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: 60000, // 1 minute
  REDIS_CONNECT_TIMEOUT_MS: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,
  DEFAULT_MAX_CONNECTION_LIFETIME_MS: 900000, // 15 minutes
  DEFAULT_MAX_CONCURRENT_PER_USER: 10,
  DEFAULT_MAX_CONCURRENT_PER_IP: 30,
} as const;
