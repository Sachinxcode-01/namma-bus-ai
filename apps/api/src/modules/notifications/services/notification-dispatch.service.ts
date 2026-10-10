import { Injectable, Logger } from '@nestjs/common';
import { DeliveryStatus, Notification } from '@prisma/client';
import { NotificationsRepository } from '../notifications.repository';
import { DeviceTokensService } from './device-tokens.service';
import { FirebasePushService } from '../providers/firebase-push.service';
import { NOTIFICATION_CHANNELS, NOTIFICATION_CONFIG } from '../constants/notification.constants';

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly repository: NotificationsRepository,
    private readonly deviceTokensService: DeviceTokensService,
    private readonly pushService: FirebasePushService,
  ) {}

  /**
   * Dispatches a persisted notification across all registered devices for the recipient.
   * Tracks delivery attempts, records provider message IDs or failures, and handles retries.
   */
  async dispatch(notification: Notification): Promise<void> {
    const devices = await this.deviceTokensService.getActiveTokens(notification.recipientId);

    // If recipient has no active push tokens registered, record an IN_APP delivery record
    if (devices.length === 0) {
      this.logger.debug(
        `Recipient ${notification.recipientId} has no registered mobile devices; delivery queued in-app only.`,
      );
      await this.repository.createDelivery({
        notificationId: notification.id,
        channel: NOTIFICATION_CHANNELS.IN_APP,
        status: DeliveryStatus.SENT,
      });
      return;
    }

    // Dispatch to each registered device independently (handles multiple devices per user)
    for (const device of devices) {
      await this.deliverToDevice(notification, device.id, device.token);
    }
  }

  /**
   * Attempts push delivery to a specific device with bounded exponential backoff retries.
   */
  private async deliverToDevice(
    notification: Notification,
    deviceTokenId: string,
    token: string,
  ): Promise<void> {
    const delivery = await this.repository.createDelivery({
      notificationId: notification.id,
      deviceTokenId,
      channel: NOTIFICATION_CHANNELS.FCM,
      status: DeliveryStatus.PENDING,
    });

    let attempts = 0;
    let lastError: string | null = null;
    let providerMsgId: string | null = null;
    let isDelivered = false;

    const maxAttempts = NOTIFICATION_CONFIG.MAX_RETRY_ATTEMPTS;

    while (attempts < maxAttempts && !isDelivered) {
      attempts++;

      const metadata: Record<string, unknown> = {
        notificationId: notification.id,
        type: notification.type,
        tripId: notification.tripId || '',
        createdAt: notification.createdAt.toISOString(),
        ...(typeof notification.metadata === 'object' && notification.metadata !== null
          ? (notification.metadata as Record<string, unknown>)
          : {}),
      };

      const result = await this.pushService.send(
        token,
        notification.title,
        notification.body,
        metadata,
      );

      if (result.success) {
        isDelivered = true;
        providerMsgId = result.providerMsgId || null;
        lastError = null;
        break;
      }

      lastError = result.error || 'Unknown FCM delivery error';

      // Permanent token failure: stop retrying immediately and deactivate token
      if (result.isInvalidToken) {
        this.logger.warn(
          `Permanent token invalidation for device ${deviceTokenId}. Aborting retries.`,
        );
        await this.deviceTokensService.deactivateInvalidToken(token, lastError);
        break;
      }

      // Retryable failure: apply exponential backoff before next attempt
      if (attempts < maxAttempts) {
        const backoffMs =
          NOTIFICATION_CONFIG.INITIAL_RETRY_BACKOFF_MS *
          Math.pow(NOTIFICATION_CONFIG.BACKOFF_MULTIPLIER, attempts - 1);
        await this.sleep(backoffMs);
      }
    }

    // Update delivery record with outcome
    await this.repository.updateDelivery(delivery.id, {
      status: isDelivered ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
      attempts,
      lastError,
      providerMsgId,
      sentAt: isDelivered ? new Date() : null,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
