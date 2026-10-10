import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_NAME: z.string().default('NammaBus-API'),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required' })
    .min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  REDIS_URL: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  ETA_ALERT_THRESHOLD_MINUTES: z.coerce.number().int().positive().default(10),
  STOP_ARRIVAL_GEOFENCE_RADIUS_METERS: z.coerce.number().positive().default(50.0),
  CONSECUTIVE_PINGS_FOR_ARRIVAL: z.coerce.number().int().positive().default(2),
  MAX_ARRIVAL_GPS_ACCURACY_METERS: z.coerce.number().positive().default(50.0),
  NOTIFICATION_MAX_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`\n❌ [Configuration Error] Invalid environment configuration:\n${issues}\n`);
  }

  return parsed.data;
}
