import { Module } from '@nestjs/common';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { RoutesRepository } from './routes.repository';
import { AuthModule } from '../auth/auth.module';
import { StopsModule } from '../stops/stops.module';

@Module({
  imports: [AuthModule, StopsModule],
  controllers: [RoutesController],
  providers: [RoutesService, RoutesRepository],
  exports: [RoutesService, RoutesRepository],
})
export class RoutesModule {}
