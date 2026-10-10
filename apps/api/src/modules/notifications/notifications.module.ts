import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { DeviceTokensService } from './services/device-tokens.service';
import { NotificationDispatchService } from './services/notification-dispatch.service';
import { NotificationStreamService } from './services/notification-stream.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { FirebasePushService } from './providers/firebase-push.service';
import { StopArrivalDetectorService } from './services/stop-arrival-detector.service';
import { EtaAlertEvaluatorService } from './services/eta-alert-evaluator.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationsService,
    DeviceTokensService,
    NotificationDispatchService,
    NotificationStreamService,
    NotificationPreferencesService,
    FirebasePushService,
    StopArrivalDetectorService,
    EtaAlertEvaluatorService,
  ],
  exports: [
    NotificationsService,
    StopArrivalDetectorService,
    EtaAlertEvaluatorService,
    DeviceTokensService,
    NotificationStreamService,
    FirebasePushService,
  ],
})
export class NotificationsModule {}
