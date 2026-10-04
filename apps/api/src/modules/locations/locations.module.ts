import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { LocationsRepository } from './locations.repository';
import { LocationStreamService } from './location-stream.service';
import { TripsModule } from '../trips/trips.module';

@Module({
  imports: [TripsModule],
  controllers: [LocationsController],
  providers: [LocationsService, LocationsRepository, LocationStreamService],
  exports: [LocationsService, LocationsRepository, LocationStreamService],
})
export class LocationsModule {}
