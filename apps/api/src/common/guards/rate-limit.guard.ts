import { Injectable, CanActivate, ExecutionContext, Logger, OnModuleDestroy } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { TooManyRequestsException } from '../errors/app.exception';

interface RateBucket {
  timestamps: number[];
}

@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly store = new Map<string, RateBucket>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(private readonly reflector: Reflector) {
    // Periodically prune stale bucket entries every 60 seconds to prevent unbounded memory growth
    this.cleanupTimer = setInterval(() => this.pruneStaleBuckets(), 60_000);
    // Unref timer so it doesn't block process exit in tests or CLI runs
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true; // No rate limit set for this handler
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const clientIp = this.extractClientIp(request);
    const routeKey = `${request.method}:${request.route?.path || request.path}`;
    const key = `${clientIp}::${routeKey}`;

    const now = Date.now();
    const windowMs = options.ttlSeconds * 1000;
    const windowStart = now - windowMs;

    let bucket = this.store.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.store.set(key, bucket);
    }

    // Filter out timestamps outside the active sliding window
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

    if (bucket.timestamps.length >= options.limit) {
      const oldestActiveTimestamp = bucket.timestamps[0];
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldestActiveTimestamp + windowMs - now) / 1000),
      );

      response.setHeader('X-RateLimit-Limit', options.limit);
      response.setHeader('X-RateLimit-Remaining', 0);
      response.setHeader('Retry-After', retryAfterSeconds);

      this.logger.warn(
        `Rate limit exceeded for IP: ${clientIp} on route: ${routeKey}. Requests: ${bucket.timestamps.length}/${options.limit}`,
      );

      throw new TooManyRequestsException(
        `Rate limit exceeded. Please wait ${retryAfterSeconds} seconds before retrying.`,
        { retryAfterSeconds, limit: options.limit },
      );
    }

    bucket.timestamps.push(now);
    const remaining = Math.max(0, options.limit - bucket.timestamps.length);

    // Set standard rate limit telemetry headers
    response.setHeader('X-RateLimit-Limit', options.limit);
    response.setHeader('X-RateLimit-Remaining', remaining);

    return true;
  }

  private extractClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ip.trim();
    }
    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  }

  private pruneStaleBuckets(): void {
    const now = Date.now();
    for (const [key, bucket] of this.store.entries()) {
      // Remove records with no timestamps in the last 15 minutes
      if (bucket.timestamps.length === 0 || bucket.timestamps.every((ts) => ts < now - 900_000)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Helper for tests to reset in-memory buckets
   */
  clear(): void {
    this.store.clear();
  }
}
