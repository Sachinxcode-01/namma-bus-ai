import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { TooManyRequestsException } from '../errors/app.exception';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RateLimitGuard(reflector);
  });

  afterEach(() => {
    guard.onModuleDestroy();
  });

  function createMockContext(ip = '127.0.0.1', path = '/auth/login', method = 'POST') {
    const headers: Record<string, string | number> = {};
    const req = {
      ip,
      method,
      path,
      headers: {},
      socket: { remoteAddress: ip },
      route: { path },
    };
    const res = {
      setHeader: jest.fn((k: string, v: string | number) => {
        headers[k] = v;
      }),
    };

    return {
      context: {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => res,
        }),
      } as unknown as ExecutionContext,
      req,
      res,
      headers,
    };
  }

  it('should allow requests when no rate limit is configured on handler', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const { context } = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow requests within configured limit and set telemetry headers', () => {
    reflector.getAllAndOverride.mockReturnValue({ limit: 3, ttlSeconds: 60 });
    const { context, res } = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 3);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 2);
  });

  it('should throw TooManyRequestsException when request count exceeds limit', () => {
    reflector.getAllAndOverride.mockReturnValue({ limit: 2, ttlSeconds: 60 });
    const { context: ctx1 } = createMockContext();
    const { context: ctx2 } = createMockContext();
    const { context: ctx3, res } = createMockContext();

    expect(guard.canActivate(ctx1)).toBe(true);
    expect(guard.canActivate(ctx2)).toBe(true);

    expect(() => guard.canActivate(ctx3)).toThrow(TooManyRequestsException);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });

  it('should track different IPs independently', () => {
    reflector.getAllAndOverride.mockReturnValue({ limit: 1, ttlSeconds: 60 });
    const { context: ctxA } = createMockContext('192.168.1.10');
    const { context: ctxB } = createMockContext('192.168.1.20');

    expect(guard.canActivate(ctxA)).toBe(true);
    expect(guard.canActivate(ctxB)).toBe(true);
  });
});
