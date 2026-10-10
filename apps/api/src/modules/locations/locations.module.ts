import { Module, forwardRef } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { LocationsRepository } from './locations.repository';
import { LocationStreamService } from './location-stream.service';
import { GpsValidatorService } from './services/gps-validator.service';
import { GpsDeduplicationService } from './services/gps-deduplication.service';
import { LiveTrackingService } from './services/live-tracking.service';
import { GpsMetricsService } from './services/gps-metrics.service';
import { TripsModule } from '../trips/trips.module';
import { EtaModule } from '../eta/eta.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@Module({
  imports: [TripsModule, forwardRef(() => EtaModule), forwardRef(() => NotificationsModule)],
  controllers: [LocationsController],
  providers: [
    LocationsService,
    LocationsRepository,
    LocationStreamService,
    GpsValidatorService,
    GpsDeduplicationService,
    LiveTrackingService,
    GpsMetricsService,
    RateLimitGuard,
  ],
  exports: [LocationsService, LocationsRepository, LocationStreamService, LiveTrackingService],
})
export class LocationsModule {}
