import { Module } from '@nestjs/common';
import { StopsController } from './stops.controller';
import { StopsService } from './stops.service';
import { StopsRepository } from './stops.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [StopsController],
  providers: [StopsService, StopsRepository],
  exports: [StopsService, StopsRepository],
})
export class StopsModule {}
