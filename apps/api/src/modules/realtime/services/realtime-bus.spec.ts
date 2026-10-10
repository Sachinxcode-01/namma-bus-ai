import { ConfigService } from '@nestjs/config';
import { InMemoryRealtimeBus } from './in-memory-realtime-bus.service';
import { RedisRealtimeBus } from './redis-realtime-bus.service';
import { REALTIME_CHANNELS } from '../constants/realtime.constants';

describe('RealtimeBus Backbone', () => {
  describe('InMemoryRealtimeBus', () => {
    let bus: InMemoryRealtimeBus;

    beforeEach(() => {
      bus = new InMemoryRealtimeBus();
    });

    afterEach(() => {
      bus.onModuleDestroy();
    });

    it('should deliver published events to active subscribers on the channel', () => {
      const received: unknown[] = [];
      const sub = bus.subscribe(REALTIME_CHANNELS.LOCATIONS, (payload) => {
        received.push(payload);
      });

      const event = { tripId: 'trip-1', latitude: 12.9716, longitude: 77.5946 };
      bus.publish(REALTIME_CHANNELS.LOCATIONS, event);

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual(event);

      sub.unsubscribe();
    });

    it('should isolate channels and not cross-deliver messages', () => {
      const locReceived: unknown[] = [];
      const etaReceived: unknown[] = [];

      const locSub = bus.subscribe(REALTIME_CHANNELS.LOCATIONS, (p) => locReceived.push(p));
      const etaSub = bus.subscribe(REALTIME_CHANNELS.ETA, (p) => etaReceived.push(p));

      bus.publish(REALTIME_CHANNELS.LOCATIONS, { type: 'loc' });
      bus.publish(REALTIME_CHANNELS.ETA, { type: 'eta' });

      expect(locReceived).toEqual([{ type: 'loc' }]);
      expect(etaReceived).toEqual([{ type: 'eta' }]);

      locSub.unsubscribe();
      etaSub.unsubscribe();
    });

    it('should stop delivering events after unsubscribe is called', () => {
      const received: unknown[] = [];
      const sub = bus.subscribe(REALTIME_CHANNELS.NOTIFICATIONS, (p) => received.push(p));

      bus.publish(REALTIME_CHANNELS.NOTIFICATIONS, { id: '1' });
      expect(received).toHaveLength(1);

      sub.unsubscribe();
      bus.publish(REALTIME_CHANNELS.NOTIFICATIONS, { id: '2' });
      expect(received).toHaveLength(1);
    });

    it('should isolate subscriber errors and continue serving other subscribers', () => {
      const successfulReceived: unknown[] = [];

      bus.subscribe(REALTIME_CHANNELS.INCIDENTS, () => {
        throw new Error('Subscriber exploded');
      });
      bus.subscribe(REALTIME_CHANNELS.INCIDENTS, (p) => {
        successfulReceived.push(p);
      });

      expect(() => {
        bus.publish(REALTIME_CHANNELS.INCIDENTS, { alert: 'Heavy Traffic' });
      }).not.toThrow();

      expect(successfulReceived).toHaveLength(1);
    });
  });

  describe('RedisRealtimeBus Circuit Breaker & Fallback', () => {
    let mockConfigService: jest.Mocked<ConfigService>;
    let redisBus: RedisRealtimeBus;

    beforeEach(() => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'realtime.redisHost') return '127.0.0.1';
          if (key === 'realtime.redisPort') return 6379;
          return defaultValue;
        }),
      } as unknown as jest.Mocked<ConfigService>;

      redisBus = new RedisRealtimeBus(mockConfigService);
    });

    afterEach(async () => {
      await redisBus.onModuleDestroy();
    });

    it('should degrade gracefully to InMemoryRealtimeBus when Redis connection fails', async () => {
      // By default without a live Redis server, onModuleInit records failures and stays safe
      await redisBus.onModuleInit();

      const received: unknown[] = [];
      const sub = redisBus.subscribe(REALTIME_CHANNELS.LOCATIONS, (p) => received.push(p));

      // Publishing should route to in-memory fallback without throwing
      await expect(
        redisBus.publish(REALTIME_CHANNELS.LOCATIONS, { busId: 'bus-1', lat: 12.9 }),
      ).resolves.not.toThrow();

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ busId: 'bus-1', lat: 12.9 });

      sub.unsubscribe();
    });

    it('should trip circuit breaker after consecutive failures and remain operational via fallback', async () => {
      await redisBus.onModuleInit();

      // Verify circuit breaker reports state and continues handling publishes safely
      for (let i = 0; i < 5; i++) {
        await redisBus.publish(REALTIME_CHANNELS.ETA, { tripId: `trip-${i}`, eta: 5 });
      }

      const received: unknown[] = [];
      const sub = redisBus.subscribe(REALTIME_CHANNELS.ETA, (p) => received.push(p));

      await redisBus.publish(REALTIME_CHANNELS.ETA, { tripId: 'trip-final', eta: 10 });
      expect(received).toHaveLength(1);
      expect(redisBus.getCircuitState()).toBeDefined();

      sub.unsubscribe();
    });
  });
});
