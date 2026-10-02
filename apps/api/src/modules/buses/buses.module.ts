import { Module } from '@nestjs/common';
import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';
import { BusesRepository } from './buses.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BusesController],
  providers: [BusesService, BusesRepository],
  exports: [BusesService, BusesRepository],
})
export class BusesModule {}
