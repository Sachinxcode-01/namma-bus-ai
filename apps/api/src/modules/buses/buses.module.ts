import { Module, forwardRef } from '@nestjs/common';
import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';
import { BusesRepository } from './buses.repository';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [forwardRef(() => LocationsModule)],
  controllers: [BusesController],
  providers: [BusesService, BusesRepository],
  exports: [BusesService, BusesRepository],
})
export class BusesModule {}
