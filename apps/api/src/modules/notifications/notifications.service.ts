import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  Incident,
  Notification,
  NotificationType,
  Prisma,
  Stop,
  Trip,
  UserRole,
} from '@prisma/client';
import { NotificationsRepository } from './notifications.repository';
import { NotificationDispatchService } from './services/notification-dispatch.service';
import { NotificationStreamService } from './services/notification-stream.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { NotificationPayload } from './domain/notification.types';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { BroadcastIncidentDto } from './dto/broadcast-incident.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ForbiddenException, NotFoundException } from '../../common/errors/app.exception';
import { PaginatedResult } from '../users/users.service';
import {
  REALTIME_BUS,
  RealtimeBus,
} from '../realtime/interfaces/realtime-bus.interface';
import { REALTIME_CHANNELS } from '../realtime/constants/realtime.constants';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationsRepository,
    private readonly dispatchService: NotificationDispatchService,
    private readonly streamService: NotificationStreamService,
    private readonly preferencesService: NotificationPreferencesService,
    @Inject(REALTIME_BUS)
    private readonly realtimeBus: RealtimeBus,
  ) {}

  /**
   * Authoritative notification creation and dispatch pipeline.
   * Checks recipient preferences, enforces database-level idempotency via deduplication keys,
   * persists records, and asynchronously dispatches push notifications and real-time SSE streams.
   */
  async sendNotification(payload: NotificationPayload): Promise<Notification | null> {
    // 1. Respect recipient notification preferences
    const isEnabled = await this.preferencesService.isNotificationEnabled(
      payload.recipientId,
      payload.type,
    );
    if (!isEnabled) {
      this.logger.debug(
        `Notification of type ${payload.type} suppressed for user ${payload.recipientId} per notification preferences.`,
      );
      return null;
    }

    // 2. Persistent Deduplication Check: Prevent duplicate notifications across restarts / concurrency
    if (payload.deduplicationKey) {
      const existing = await this.repository.findByRecipientAndDedupKey(
        payload.recipientId,
        payload.deduplicationKey,
      );
      if (existing) {
        this.logger.debug(
          `Idempotent duplicate notification suppressed: Key='${payload.deduplicationKey}' User='${payload.recipientId}'`,
        );
        return existing;
      }
    }

    // 3. Persist Notification Record
    let notification: Notification;
    try {
      notification = await this.repository.createNotification({
        recipient: { connect: { id: payload.recipientId } },
        ...(payload.tripId ? { trip: { connect: { id: payload.tripId } } } : {}),
        type: payload.type,
        title: payload.title,
        body: payload.body,
        deduplicationKey: payload.deduplicationKey,
        metadata: (payload.metadata as Prisma.InputJsonValue) ?? undefined,
      });
    } catch (err: unknown) {
      // Catch race-condition duplicate key violation gracefully
      const isUniqueViolation =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002';

      if (isUniqueViolation && payload.deduplicationKey) {
        this.logger.debug(
          `Race-condition duplicate caught for key '${payload.deduplicationKey}' on user '${payload.recipientId}'`,
        );
        const existing = await this.repository.findByRecipientAndDedupKey(
          payload.recipientId,
          payload.deduplicationKey,
        );
        return existing;
      }
      throw err;
    }

    this.logger.log(
      `Notification created: ID=${notification.id} Type=${notification.type} User=${notification.recipientId}`,
    );

    // 4. Asynchronously dispatch push delivery to mobile clients (outside DB transaction)
    this.dispatchService
      .dispatch(notification)
      .catch((err) =>
        this.logger.error(
          `Push delivery failed for notification ${notification.id}: ${err?.message || err}`,
        ),
      );

    // 5. Emit real-time in-app SSE event to connected active clients
    this.streamService.emitNotification({
      id: notification.id,
      recipientId: notification.recipientId,
      tripId: notification.tripId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      isRead: notification.isRead,
      metadata: notification.metadata,
      createdAt: (notification.createdAt ?? new Date()).toISOString(),
    });

    return notification;
  }

  // ---------------------------------------------------------------------------
  // Domain Workflow Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handles ~10-minute ETA threshold crossing alert for a stop along an active trip.
   */
  async handleEtaThresholdAlert(
    tripId: string,
    stopId: string,
    etaMinutes: number,
    routeId: string,
    stopName?: string,
  ): Promise<void> {
    const studentUserIds = await this.repository.findSubscribedUserIdsByStopAndRoute(
      routeId,
      stopId,
    );

    if (studentUserIds.length === 0) {
      return;
    }

    this.logger.log(
      `Dispatching ~10-min ETA alerts for trip ${tripId}, stop ${stopId} to ${studentUserIds.length} subscribed students.`,
    );

    for (const userId of studentUserIds) {
      await this.sendNotification({
        recipientId: userId,
        tripId,
        type: NotificationType.ETA_10_MIN,
        title: `Bus Approaching: ${stopName || 'Your Stop'}`,
        body: `Your college bus is approximately ${etaMinutes} minutes away from ${stopName || 'your stop'}. Please be ready to board.`,
        deduplicationKey: `trip:${tripId}:stop:${stopId}:type:ETA_10_MIN`,
        metadata: {
          tripId,
          stopId,
          etaMinutes,
          routeId,
        },
      });
    }
  }

  /**
   * Handles confirmed stop arrival detection.
   */
  async handleStopArrival(trip: { id: string; routeId: string }, stop: Stop): Promise<void> {
    const studentUserIds = await this.repository.findSubscribedUserIdsByStopAndRoute(
      trip.routeId,
      stop.id,
    );

    if (studentUserIds.length === 0) {
      return;
    }

    this.logger.log(
      `Dispatching stop arrival alerts for trip ${trip.id}, stop '${stop.name}' to ${studentUserIds.length} subscribed students.`,
    );

    for (const userId of studentUserIds) {
      await this.sendNotification({
        recipientId: userId,
        tripId: trip.id,
        type: NotificationType.STOP_REACHED,
        title: `Bus Arrived: ${stop.name}`,
        body: `Your college bus has arrived at ${stop.name}. Please board now.`,
        deduplicationKey: `trip:${trip.id}:stop:${stop.id}:type:STOP_REACHED`,
        metadata: {
          tripId: trip.id,
          stopId: stop.id,
          stopCode: stop.code,
        },
      });
    }
  }

  /**
   * Handles driver starting an authorized trip.
   */
  async handleTripStarted(trip: {
    id: string;
    routeId: string;
    route?: { code: string; name: string } | null;
  }): Promise<void> {
    const studentUserIds = await this.repository.findSubscribedUserIdsByRoute(trip.routeId);

    if (studentUserIds.length === 0) {
      return;
    }

    const routeName = trip.route?.name || 'your route';
    const routeCode = trip.route?.code || '';

    this.logger.log(
      `Dispatching TRIP_STARTED alerts for trip ${trip.id} to ${studentUserIds.length} subscribed students on route ${trip.routeId}.`,
    );

    for (const userId of studentUserIds) {
      await this.sendNotification({
        recipientId: userId,
        tripId: trip.id,
        type: NotificationType.TRIP_STARTED,
        title: `Bus Started: ${routeCode ? `${routeCode} - ` : ''}${routeName}`,
        body: `Your college bus has started its trip. Live tracking and ETA are now active.`,
        deduplicationKey: `trip:${trip.id}:type:TRIP_STARTED`,
        metadata: {
          tripId: trip.id,
          routeId: trip.routeId,
        },
      });
    }
  }

  /**
   * Handles driver or admin completing a trip.
   */
  async handleTripCompleted(trip: {
    id: string;
    routeId: string;
    route?: { code: string; name: string } | null;
  }): Promise<void> {
    const studentUserIds = await this.repository.findSubscribedUserIdsByRoute(trip.routeId);

    if (studentUserIds.length === 0) {
      return;
    }

    const routeName = trip.route?.name || 'your route';

    this.logger.log(
      `Dispatching TRIP_COMPLETED alerts for trip ${trip.id} to ${studentUserIds.length} subscribed students.`,
    );

    for (const userId of studentUserIds) {
      await this.sendNotification({
        recipientId: userId,
        tripId: trip.id,
        type: NotificationType.TRIP_COMPLETED,
        title: `Trip Completed: ${routeName}`,
        body: `The bus trip along ${routeName} has safely completed.`,
        deduplicationKey: `trip:${trip.id}:type:TRIP_COMPLETED`,
        metadata: {
          tripId: trip.id,
          routeId: trip.routeId,
        },
      });
    }
  }

  /**
   * Handles incident reporting (Breakdown, SOS, Delay).
   */
  async handleIncidentReported(incident: Incident, trip?: Trip | null): Promise<void> {
    if (incident.type === 'BREAKDOWN' && trip) {
      const studentUserIds = await this.repository.findSubscribedUserIdsByRoute(trip.routeId);
      for (const userId of studentUserIds) {
        await this.sendNotification({
          recipientId: userId,
          tripId: trip.id,
          type: NotificationType.BREAKDOWN,
          title: 'Service Advisory: Bus Technical Issue',
          body: 'Your college bus has encountered a technical issue. Transport administration is actively monitoring the situation.',
          deduplicationKey: `incident:${incident.id}:type:BREAKDOWN`,
          metadata: { incidentId: incident.id, tripId: trip.id },
        });
      }
    } else if (incident.type === 'SOS') {
      // 1. Immediately notify all administrators with full emergency details
      const adminUserIds = await this.repository.findAdminUserIds();
      for (const adminId of adminUserIds) {
        await this.sendNotification({
          recipientId: adminId,
          tripId: trip?.id,
          type: NotificationType.SOS,
          title: '🚨 EMERGENCY: SOS Triggered',
          body: `Emergency alert raised for Trip ${trip?.id || 'Unknown'}: "${incident.description}". Immediate response required.`,
          deduplicationKey: `incident:${incident.id}:type:SOS:admin:${adminId}`,
          metadata: { incidentId: incident.id, tripId: trip?.id, severity: incident.severity },
        });
      }

      // 2. Notify students on route with sanitized non-panic advisory
      if (trip) {
        const studentUserIds = await this.repository.findSubscribedUserIdsByRoute(trip.routeId);
        for (const userId of studentUserIds) {
          await this.sendNotification({
            recipientId: userId,
            tripId: trip.id,
            type: NotificationType.DELAY,
            title: 'Service Delay Advisory',
            body: 'Your bus is currently halted due to an operational delay. Please monitor live tracking.',
            deduplicationKey: `incident:${incident.id}:type:SOS:student`,
            metadata: { incidentId: incident.id, tripId: trip.id },
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // User Notification History & Interactions
  // ---------------------------------------------------------------------------

  async getUserNotifications(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<PaginatedResult<Notification>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { notifications, total } = await this.repository.findMany({
      recipientId: userId,
      skip,
      take: limit,
      isRead: query.isRead,
      type: query.type,
    });

    return {
      items: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const count = await this.repository.countUnread(userId);
    return { unreadCount: count };
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.repository.findNotificationById(notificationId);
    if (!notification) {
      throw new NotFoundException('Notification', notificationId);
    }

    if (notification.recipientId !== userId) {
      throw new ForbiddenException(
        'You cannot access or modify notifications belonging to another user.',
      );
    }

    return this.repository.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const count = await this.repository.markAllAsRead(userId);
    return { updatedCount: count };
  }

  async broadcast(
    dto: BroadcastNotificationDto,
    currentUser: AuthenticatedUser,
  ): Promise<{ recipientCount: number }> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators may broadcast operational notifications.');
    }

    let recipientUserIds: string[] = [];

    if (dto.routeId) {
      recipientUserIds = await this.repository.findSubscribedUserIdsByRoute(dto.routeId);
    } else {
      recipientUserIds = await this.repository.findAllActiveUserIds();
    }

    this.logger.log(
      `Admin ${currentUser.id} broadcasting notification to ${recipientUserIds.length} users (Route filter: ${dto.routeId || 'ALL'}).`,
    );

    const dedupBase = `broadcast:${Date.now()}`;
    for (const userId of recipientUserIds) {
      await this.sendNotification({
        recipientId: userId,
        type: dto.type || NotificationType.BROADCAST,
        title: dto.title,
        body: dto.body,
        deduplicationKey: `${dedupBase}:${userId}`,
        metadata: dto.metadata,
      });
    }

    return { recipientCount: recipientUserIds.length };
  }

  /**
   * Broadcasts an incident event across distributed realtime channels (INCIDENTS channel)
   * and dispatches push notifications to affected route students and staff.
   */
  async broadcastIncident(
    dto: BroadcastIncidentDto,
    currentUser: AuthenticatedUser,
  ): Promise<{ recipientCount: number }> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators may broadcast incident alerts.');
    }

    this.logger.log(
      `Broadcasting incident "${dto.title}" across realtime pub/sub and notification channels`,
    );

    // 1. Publish incident to realtime pub/sub backbone
    const effectiveType = dto.type || 'DELAY';
    const effectiveSeverity = dto.severity || 'HIGH';

    this.realtimeBus.publish(REALTIME_CHANNELS.INCIDENTS, {
      id: `inc-broadcast-${Date.now()}`,
      title: dto.title,
      message: dto.message,
      type: effectiveType,
      severity: effectiveSeverity,
      routeId: dto.routeId,
      tripId: dto.tripId,
      broadcastBy: currentUser.id,
      timestamp: new Date().toISOString(),
    });

    // 2. Map incident category to NotificationType
    let notifType: NotificationType = NotificationType.BROADCAST;
    if (effectiveType === 'DELAY') notifType = NotificationType.DELAY;
    else if (effectiveType === 'BREAKDOWN') notifType = NotificationType.BREAKDOWN;
    else if (effectiveType === 'ROUTE_CHANGE') notifType = NotificationType.ROUTE_ANOMALY;

    return this.broadcast(
      {
        title: dto.title,
        body: dto.message,
        type: notifType,
        routeId: dto.routeId,
        metadata: {
          incidentType: effectiveType,
          severity: effectiveSeverity,
          tripId: dto.tripId,
        },
      },
      currentUser,
    );
  }
}

