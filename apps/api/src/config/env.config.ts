import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  appName: process.env.APP_NAME || 'NammaBus-API',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  logLevel: process.env.LOG_LEVEL || 'info',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

export const authConfig = registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));

export const notificationsConfig = registerAs('notifications', () => ({
  etaAlertThresholdMinutes: parseInt(process.env.ETA_ALERT_THRESHOLD_MINUTES || '10', 10),
  stopArrivalGeofenceRadiusMeters: parseFloat(
    process.env.STOP_ARRIVAL_GEOFENCE_RADIUS_METERS || '50.0',
  ),
  consecutivePingsForArrival: parseInt(process.env.CONSECUTIVE_PINGS_FOR_ARRIVAL || '2', 10),
  maxArrivalGpsAccuracyMeters: parseFloat(process.env.MAX_ARRIVAL_GPS_ACCURACY_METERS || '50.0'),
  maxRetryAttempts: parseInt(process.env.NOTIFICATION_MAX_RETRY_ATTEMPTS || '3', 10),
}));

export const firebaseConfig = registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}));

export const realtimeConfig = registerAs('realtime', () => ({
  backend: (process.env.REALTIME_BACKEND || 'memory') as 'memory' | 'redis',
  redisUrl: process.env.REDIS_URL,
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD,
  maxConnectionLifetimeMs: parseInt(
    process.env.SSE_MAX_CONNECTION_LIFETIME_MS || '900000',
    10,
  ),
  sseMaxConnectionLifetimeMs: parseInt(
    process.env.SSE_MAX_CONNECTION_LIFETIME_MS || '900000',
    10,
  ),
  sseMaxConcurrentPerUser: parseInt(process.env.SSE_MAX_CONCURRENT_PER_USER || '10', 10),
  sseMaxConcurrentPerIp: parseInt(process.env.SSE_MAX_CONCURRENT_PER_IP || '30', 10),
}));
