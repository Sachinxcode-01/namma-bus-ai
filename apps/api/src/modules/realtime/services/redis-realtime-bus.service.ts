import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { RealtimeBus, RealtimeSubscription } from '../interfaces/realtime-bus.interface';
import { InMemoryRealtimeBus } from './in-memory-realtime-bus.service';
import { REALTIME_DEFAULTS } from '../constants/realtime.constants';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * RedisRealtimeBus
 * Distributed multi-instance pub/sub event bus powered by Redis.
 * Implements a resilient circuit-breaker pattern with automatic fallback
 * to an internal InMemoryRealtimeBus if Redis is unavailable or fails.
 */
@Injectable()
export class RedisRealtimeBus implements RealtimeBus, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisRealtimeBus.name);
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  // Local fallback bus during outages or circuit-open periods
  private readonly memoryFallback = new InMemoryRealtimeBus();

  // Active subscription handlers registered locally
  private readonly channelHandlers = new Map<string, Set<(payload: unknown) => void>>();

  // Circuit breaker state
  private circuitState: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private circuitOpenedAt = 0;
  private isDestroyed = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeRedisClients();
  }

  async onModuleDestroy(): Promise<void> {
    this.isDestroyed = true;
    this.logger.log('Shutting down RedisRealtimeBus connections...');

    try {
      if (this.subClient) {
        await this.subClient.quit();
        this.subClient = null;
      }
      if (this.pubClient) {
        await this.pubClient.quit();
        this.pubClient = null;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Error while disconnecting Redis clients: ${msg}`);
    }

    this.memoryFallback.onModuleDestroy();
    this.channelHandlers.clear();
  }

  private buildRedisOptions(): RedisOptions {
    const redisUrl = this.configService.get<string>('realtime.redisUrl');
    const host = this.configService.get<string>('realtime.redisHost', '127.0.0.1');
    const port = this.configService.get<number>('realtime.redisPort', 6379);
    const password = this.configService.get<string>('realtime.redisPassword');

    const options: RedisOptions = {
      connectTimeout: REALTIME_DEFAULTS.REDIS_CONNECT_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (this.isDestroyed || times > REALTIME_DEFAULTS.MAX_RECONNECT_ATTEMPTS) {
          return null; // Stop retrying and rely on circuit breaker fallback
        }
        return Math.min(times * 500, 3000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    };

    if (password) {
      options.password = password;
    }

    if (redisUrl) {
      return { ...options, host: undefined, port: undefined };
    }

    return { ...options, host, port };
  }

  private async initializeRedisClients(): Promise<void> {
    const redisUrl = this.configService.get<string>('realtime.redisUrl');
    const options = this.buildRedisOptions();

    try {
      this.pubClient = redisUrl ? new Redis(redisUrl, options) : new Redis(options);
      this.subClient = redisUrl ? new Redis(redisUrl, options) : new Redis(options);

      this.pubClient.on('error', (err) => this.handleRedisError('pubClient', err));
      this.subClient.on('error', (err) => this.handleRedisError('subClient', err));

      this.subClient.on('message', (channel, message) => {
        this.handleInboundMessage(channel, message);
      });

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      this.circuitState = 'CLOSED';
      this.consecutiveFailures = 0;
      this.logger.log('RedisRealtimeBus successfully connected to distributed Redis backend.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to initialize Redis connections (${msg}). Falling back to InMemoryRealtimeBus.`,
      );
      this.recordFailure();
    }
  }

  private handleInboundMessage(channel: string, message: string): void {
    const handlers = this.channelHandlers.get(channel);
    if (!handlers || handlers.size === 0) return;

    try {
      const parsed = JSON.parse(message);
      for (const handler of handlers) {
        try {
          handler(parsed);
        } catch (handlerErr: unknown) {
          const msg = handlerErr instanceof Error ? handlerErr.message : String(handlerErr);
          this.logger.error(`Error in subscriber handler for channel ${channel}: ${msg}`);
        }
      }
    } catch {
      // If payload wasn't JSON, forward raw string
      for (const handler of handlers) {
        handler(message);
      }
    }
  }

  private handleRedisError(source: string, err: Error): void {
    if (this.isDestroyed) return;
    this.logger.warn(`Redis [${source}] error: ${err.message}`);
    this.recordFailure();
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (
      this.consecutiveFailures >= REALTIME_DEFAULTS.CIRCUIT_BREAKER_FAILURE_THRESHOLD &&
      this.circuitState !== 'OPEN'
    ) {
      this.circuitState = 'OPEN';
      this.circuitOpenedAt = Date.now();
      this.logger.warn(
        `Redis failure threshold (${this.consecutiveFailures}) reached. Circuit breaker is OPEN. Routing all events to InMemory fallback.`,
      );
    }
  }

  private checkCircuitState(): void {
    if (this.circuitState === 'OPEN') {
      const elapsed = Date.now() - this.circuitOpenedAt;
      if (elapsed > REALTIME_DEFAULTS.CIRCUIT_BREAKER_RESET_TIMEOUT_MS) {
        this.circuitState = 'HALF_OPEN';
        this.logger.log('Circuit breaker entering HALF_OPEN probe state. Testing Redis connectivity...');
      }
    }
  }

  async publish(channel: string, payload: unknown): Promise<void> {
    this.checkCircuitState();

    // If circuit is OPEN or pubClient not ready, fall back to in-memory bus
    if (this.circuitState === 'OPEN' || !this.pubClient || this.pubClient.status !== 'ready') {
      this.memoryFallback.publish(channel, payload);
      return;
    }

    try {
      const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
      await this.pubClient.publish(channel, serialized);

      if (this.circuitState === 'HALF_OPEN') {
        this.circuitState = 'CLOSED';
        this.consecutiveFailures = 0;
        this.logger.log('Redis probe succeeded. Circuit breaker reset to CLOSED.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis publish error on channel ${channel}: ${msg}. Falling back to in-memory.`);
      this.recordFailure();
      this.memoryFallback.publish(channel, payload);
    }
  }

  subscribe(channel: string, handler: (payload: unknown) => void): RealtimeSubscription {
    // 1. Register handler in local channel map for incoming Redis messages
    let handlers = this.channelHandlers.get(channel);
    if (!handlers) {
      handlers = new Set();
      this.channelHandlers.set(channel, handlers);

      // Subscribe on Redis subClient if connected
      if (this.subClient && this.subClient.status === 'ready') {
        this.subClient.subscribe(channel).catch((err) => {
          this.logger.warn(`Failed to subscribe to Redis channel ${channel}: ${err.message}`);
          this.recordFailure();
        });
      }
    }
    handlers.add(handler);

    // 2. Also subscribe to memory fallback (for events published locally while degraded)
    const memSub = this.memoryFallback.subscribe(channel, handler);

    return {
      unsubscribe: () => {
        handlers?.delete(handler);
        if (handlers && handlers.size === 0) {
          this.channelHandlers.delete(channel);
          if (this.subClient && this.subClient.status === 'ready') {
            this.subClient.unsubscribe(channel).catch(() => {});
          }
        }
        memSub.unsubscribe();
      },
    };
  }

  getActiveSubscribersCount(channel?: string): number {
    if (channel) {
      return this.channelHandlers.get(channel)?.size ?? 0;
    }
    let total = 0;
    for (const handlers of this.channelHandlers.values()) {
      total += handlers.size;
    }
    return total;
  }

  getCircuitState(): CircuitState {
    return this.circuitState;
  }
}
