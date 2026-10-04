process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '4001';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/nammabus_test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test-jwt-access-secret-at-least-16-chars';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-at-least-16-chars';
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'warn';
