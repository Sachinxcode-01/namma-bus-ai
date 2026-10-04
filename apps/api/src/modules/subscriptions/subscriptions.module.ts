import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsRepository } from './subscriptions.repository';
import { RoutesModule } from '../routes/routes.module';
import { StopsModule } from '../stops/stops.module';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [RoutesModule, StopsModule, StudentsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsRepository],
  exports: [SubscriptionsService, SubscriptionsRepository],
})
export class SubscriptionsModule {}
