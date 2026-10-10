import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Notification,
  NotificationType,
  DeliveryStatus,
  DeviceToken,
  NotificationDelivery,
  NotificationPreference,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface NotificationWithDetails extends Notification {
  deliveries?: NotificationDelivery[];
}

/**
 * Repository layer for managing notification entities, outbox deliveries,
 * FCM device tokens, and student notification preferences.
 */
@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Notification CRUD & Queries
  // ---------------------------------------------------------------------------

  async createNotification(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return this.prisma.notification.create({
      data,
    });
  }

  async findNotificationById(id: string): Promise<NotificationWithDetails | null> {
    return this.prisma.notification.findUnique({
      where: { id },
      include: {
        deliveries: true,
      },
    });
  }

  async findByRecipientAndDedupKey(
    recipientId: string,
    deduplicationKey: string,
  ): Promise<Notification | null> {
    return this.prisma.notification.findFirst({
      where: {
        recipientId,
        deduplicationKey,
      },
    });
  }

  async findMany(params: {
    recipientId: string;
    skip: number;
    take: number;
    isRead?: boolean;
    type?: NotificationType;
  }): Promise<{ notifications: Notification[]; total: number }> {
    const where: Prisma.NotificationWhereInput = {
      recipientId: params.recipientId,
      ...(params.isRead !== undefined ? { isRead: params.isRead } : {}),
      ...(params.type ? { type: params.type } : {}),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  async countUnread(recipientId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        recipientId,
        isRead: false,
      },
    });
  }

  async markAsRead(id: string, readAt: Date = new Date()): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt,
      },
    });
  }

  async markAllAsRead(recipientId: string, readAt: Date = new Date()): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt,
      },
    });
    return result.count;
  }

  // ---------------------------------------------------------------------------
  // Device Tokens
  // ---------------------------------------------------------------------------

  async upsertDeviceToken(params: {
    userId: string;
    token: string;
    platform?: string;
    deviceModel?: string;
  }): Promise<DeviceToken> {
    return this.prisma.deviceToken.upsert({
      where: { token: params.token },
      create: {
        userId: params.userId,
        token: params.token,
        platform: params.platform,
        deviceModel: params.deviceModel,
        isActive: true,
        lastUsedAt: new Date(),
      },
      update: {
        userId: params.userId, // Reassign safely if device changed user account
        platform: params.platform,
        deviceModel: params.deviceModel,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  async findDeviceToken(token: string): Promise<DeviceToken | null> {
    return this.prisma.deviceToken.findUnique({
      where: { token },
    });
  }

  async findActiveTokensByUserId(userId: string): Promise<DeviceToken[]> {
    return this.prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async deactivateDeviceToken(token: string): Promise<DeviceToken | null> {
    return this.prisma.deviceToken
      .update({
        where: { token },
        data: { isActive: false },
      })
      .catch(() => null);
  }

  async deleteDeviceToken(token: string): Promise<boolean> {
    try {
      await this.prisma.deviceToken.delete({
        where: { token },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Notification Deliveries
  // ---------------------------------------------------------------------------

  async createDelivery(data: {
    notificationId: string;
    deviceTokenId?: string;
    channel?: string;
    status?: DeliveryStatus;
  }): Promise<NotificationDelivery> {
    return this.prisma.notificationDelivery.create({
      data: {
        notificationId: data.notificationId,
        deviceTokenId: data.deviceTokenId,
        channel: data.channel || 'FCM',
        status: data.status || DeliveryStatus.PENDING,
      },
    });
  }

  async updateDelivery(
    id: string,
    data: {
      status: DeliveryStatus;
      attempts: number;
      lastError?: string | null;
      providerMsgId?: string | null;
      sentAt?: Date | null;
    },
  ): Promise<NotificationDelivery> {
    return this.prisma.notificationDelivery.update({
      where: { id },
      data,
    });
  }

  // ---------------------------------------------------------------------------
  // Notification Preferences
  // ---------------------------------------------------------------------------

  async findPreferencesByUserId(userId: string): Promise<NotificationPreference | null> {
    return this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
  }

  async upsertPreferences(
    userId: string,
    data: Partial<Omit<NotificationPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: {
        ...data,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Recipient Eligibility Queries
  // ---------------------------------------------------------------------------

  /**
   * Returns unique user IDs of active students subscribed to a given route and stop.
   */
  async findSubscribedUserIdsByStopAndRoute(routeId: string, stopId: string): Promise<string[]> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        routeId,
        stopId,
        isActive: true,
      },
      select: {
        student: {
          select: {
            userId: true,
          },
        },
      },
    });

    const userIds = new Set<string>();
    for (const sub of subscriptions) {
      if (sub.student?.userId) {
        userIds.add(sub.student.userId);
      }
    }

    return Array.from(userIds);
  }

  /**
   * Returns unique user IDs of active students subscribed anywhere along a route.
   */
  async findSubscribedUserIdsByRoute(routeId: string): Promise<string[]> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        routeId,
        isActive: true,
      },
      select: {
        student: {
          select: {
            userId: true,
          },
        },
      },
    });

    const userIds = new Set<string>();
    for (const sub of subscriptions) {
      if (sub.student?.userId) {
        userIds.add(sub.student.userId);
      }
    }

    return Array.from(userIds);
  }

  /**
   * Returns user IDs for all active administrators (e.g. for urgent SOS alerts).
   */
  async findAdminUserIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        isActive: true,
      },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  }

  /**
   * Returns all active user IDs (for system-wide emergency broadcasts).
   */
  async findAllActiveUserIds(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
}
