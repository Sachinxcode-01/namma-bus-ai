import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EtaController } from './eta.controller';
import { EtaService } from './eta.service';
import { EtaCalculatorService } from './services/eta-calculator.service';
import { RouteProgressService } from './services/route-progress.service';
import { EtaCacheService } from './services/eta-cache.service';
import { EtaStreamService } from './services/eta-stream.service';
import { LocalGeometryRoutingProvider } from './providers/local-geometry-routing.provider';
import { OsrmRoutingProvider } from './providers/osrm-routing.provider';
import { ROUTING_PROVIDER } from './interfaces/routing-provider.interface';
import { TripsModule } from '../trips/trips.module';
import { LocationsModule } from '../locations/locations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@Module({
  imports: [
    ConfigModule,
    TripsModule,
    forwardRef(() => LocationsModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [EtaController],
  providers: [
    EtaService,
    EtaCalculatorService,
    RouteProgressService,
    EtaCacheService,
    EtaStreamService,
    LocalGeometryRoutingProvider,
    OsrmRoutingProvider,
    {
      provide: ROUTING_PROVIDER,
      useClass: LocalGeometryRoutingProvider,
    },
    RateLimitGuard,
  ],
  exports: [
    EtaService,
    EtaCalculatorService,
    RouteProgressService,
    EtaStreamService,
    ROUTING_PROVIDER,
  ],
})
export class EtaModule {}
