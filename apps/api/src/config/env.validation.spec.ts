import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validBaseEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/nammabus_test',
    JWT_ACCESS_SECRET: 'super-secure-access-secret-minimum-16-chars',
    JWT_REFRESH_SECRET: 'super-secure-refresh-secret-minimum-16-chars',
  };

  it('should validate and set sensible defaults for minimal valid configuration', () => {
    const config = validateEnv(validBaseEnv);

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(4000);
    expect(config.APP_NAME).toBe('NammaBus-API');
    expect(config.JWT_ACCESS_EXPIRES_IN).toBe('15m');
    expect(config.JWT_REFRESH_EXPIRES_IN).toBe('7d');
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.DATABASE_URL).toBe(validBaseEnv.DATABASE_URL);
  });

  it('should throw an error if DATABASE_URL is missing', () => {
    const invalidEnv = { ...validBaseEnv };
    delete (invalidEnv as Record<string, unknown>).DATABASE_URL;

    expect(() => validateEnv(invalidEnv)).toThrow(/DATABASE_URL is required/);
  });

  it('should throw an error if JWT secrets are shorter than 16 characters', () => {
    const invalidEnv = {
      ...validBaseEnv,
      JWT_ACCESS_SECRET: 'short',
    };

    expect(() => validateEnv(invalidEnv)).toThrow(
      /JWT_ACCESS_SECRET must be at least 16 characters/,
    );
  });

  it('should reject invalid NODE_ENV', () => {
    const invalidEnv = {
      ...validBaseEnv,
      NODE_ENV: 'invalid_env',
    };

    expect(() => validateEnv(invalidEnv)).toThrow(/Invalid enum value/);
  });
});
