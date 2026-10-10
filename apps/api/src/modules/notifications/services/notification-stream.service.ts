import { Injectable, Logger, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, interval, merge } from 'rxjs';
import { filter, map, finalize, share } from 'rxjs/operators';
import { NotificationBroadcastEvent } from '../domain/notification.types';
import { NOTIFICATION_CONFIG } from '../constants/notification.constants';

@Injectable()
export class NotificationStreamService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationStreamService.name);
  private readonly notificationSubject = new Subject<NotificationBroadcastEvent>();
  private activeConnections = 0;

  onModuleDestroy(): void {
    this.notificationSubject.complete();
  }

  /**
   * Broadcasts a notification event across all active real-time SSE listeners.
   */
  emitNotification(event: NotificationBroadcastEvent): void {
    this.logger.debug(
      `Emitting real-time SSE notification for user ${event.recipientId}: [${event.type}] ${event.title}`,
    );
    this.notificationSubject.next(event);
  }

  /**
   * Returns an SSE stream of real-time notifications filtered strictly for the authenticated user.
   */
  getUserStream(userId: string): Observable<MessageEvent> {
    this.activeConnections++;
    this.logger.debug(
      `User ${userId} subscribed to real-time notification stream. Active: ${this.activeConnections}`,
    );

    // Keepalive ping stream
    const heartbeat$ = interval(NOTIFICATION_CONFIG.SSE_HEARTBEAT_INTERVAL_MS).pipe(
      map(() => ({
        data: { timestamp: new Date().toISOString() },
        type: 'ping',
      })),
    );

    const live$ = this.notificationSubject.asObservable().pipe(
      filter((n) => n.recipientId === userId),
      map((n) => ({
        data: n,
        type: 'notification',
        id: n.id,
      })),
    );

    return merge(live$, heartbeat$).pipe(
      finalize(() => {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
        this.logger.debug(
          `User ${userId} disconnected from notification stream. Active: ${this.activeConnections}`,
        );
      }),
      share(),
    );
  }
}
