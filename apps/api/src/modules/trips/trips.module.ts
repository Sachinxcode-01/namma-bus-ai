import { Module, forwardRef } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { TripsRepository } from './trips.repository';
import { BusesModule } from '../buses/buses.module';
import { DriversModule } from '../drivers/drivers.module';
import { RoutesModule } from '../routes/routes.module';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [BusesModule, DriversModule, RoutesModule, forwardRef(() => LocationsModule)],
  controllers: [TripsController],
  providers: [TripsService, TripsRepository],
  exports: [TripsService, TripsRepository],
})
export class TripsModule {}
