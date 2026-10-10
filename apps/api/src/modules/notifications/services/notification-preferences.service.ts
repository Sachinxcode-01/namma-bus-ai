import { Injectable, Logger } from '@nestjs/common';
import { NotificationPreference, NotificationType } from '@prisma/client';
import { NotificationsRepository } from '../notifications.repository';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto';

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(private readonly repository: NotificationsRepository) {}

  /**
   * Retrieves notification preferences for a user, returning system defaults if none saved.
   */
  async getPreferences(userId: string): Promise<NotificationPreference> {
    const existing = await this.repository.findPreferencesByUserId(userId);
    if (existing) {
      return existing;
    }

    // Default: all alerts enabled
    return {
      id: `default-${userId}`,
      userId,
      etaAlertsEnabled: true,
      arrivalAlertsEnabled: true,
      tripLifecycleAlertsEnabled: true,
      incidentAlertsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Updates notification preferences for the user.
   */
  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreference> {
    this.logger.log(`Updating notification preferences for user ${userId}`);
    return this.repository.upsertPreferences(userId, dto);
  }

  /**
   * Checks whether a specific notification type is permitted by user preferences.
   */
  async isNotificationEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const prefs = await this.getPreferences(userId);

    switch (type) {
      case NotificationType.ETA_10_MIN:
        return prefs.etaAlertsEnabled;
      case NotificationType.STOP_REACHED:
        return prefs.arrivalAlertsEnabled;
      case NotificationType.TRIP_STARTED:
      case NotificationType.TRIP_COMPLETED:
        return prefs.tripLifecycleAlertsEnabled;
      case NotificationType.BREAKDOWN:
      case NotificationType.SOS:
      case NotificationType.DELAY:
      case NotificationType.CANCELLATION:
      case NotificationType.ROUTE_ANOMALY:
        return prefs.incidentAlertsEnabled;
      case NotificationType.BROADCAST:
        return true; // Broadcasts cannot be disabled by user preferences
      default:
        return true;
    }
  }
}
