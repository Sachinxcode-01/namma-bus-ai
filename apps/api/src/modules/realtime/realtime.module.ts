import { Global, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { REALTIME_BUS } from './interfaces/realtime-bus.interface';
import { InMemoryRealtimeBus } from './services/in-memory-realtime-bus.service';
import { RedisRealtimeBus } from './services/redis-realtime-bus.service';
import { SseRateLimitGuard } from './guards/sse-rate-limit.guard';
import { SseExceptionFilter } from './filters/sse-exception.filter';

const realtimeBusProvider: Provider = {
  provide: REALTIME_BUS,
  useFactory: (
    configService: ConfigService,
    inMemoryBus: InMemoryRealtimeBus,
    redisBus: RedisRealtimeBus,
  ) => {
    const backend = configService.get<string>('realtime.backend', 'memory');
    if (backend === 'redis') {
      return redisBus;
    }
    return inMemoryBus;
  },
  inject: [ConfigService, InMemoryRealtimeBus, RedisRealtimeBus],
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    InMemoryRealtimeBus,
    RedisRealtimeBus,
    realtimeBusProvider,
    SseRateLimitGuard,
    SseExceptionFilter,
  ],
  exports: [
    REALTIME_BUS,
    InMemoryRealtimeBus,
    RedisRealtimeBus,
    SseRateLimitGuard,
    SseExceptionFilter,
  ],
})
export class RealtimeModule {}
