import {
  Injectable,
  Inject,
  Logger,
  MessageEvent,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject, interval, merge, timer } from 'rxjs';
import { filter, map, finalize, share, takeUntil } from 'rxjs/operators';
import { NotificationBroadcastEvent } from '../domain/notification.types';
import { NOTIFICATION_CONFIG } from '../constants/notification.constants';
import {
  REALTIME_BUS,
  RealtimeBus,
  RealtimeSubscription,
} from '../../realtime/interfaces/realtime-bus.interface';
import { REALTIME_CHANNELS, REALTIME_DEFAULTS } from '../../realtime/constants/realtime.constants';

@Injectable()
export class NotificationStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationStreamService.name);
  private readonly notificationSubject = new Subject<NotificationBroadcastEvent>();
  private busSubscription: RealtimeSubscription | null = null;
  private activeConnections = 0;

  constructor(
    @Inject(REALTIME_BUS)
    private readonly realtimeBus: RealtimeBus,
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  onModuleInit(): void {
    this.logger.log('Subscribing NotificationStreamService to distributed realtime bus channel');
    this.busSubscription = this.realtimeBus.subscribe(
      REALTIME_CHANNELS.NOTIFICATIONS,
      (payload: unknown) => {
        try {
          const event = payload as NotificationBroadcastEvent;
          this.notificationSubject.next(event);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to handle incoming distributed notification payload: ${msg}`);
        }
      },
    );
  }

  onModuleDestroy(): void {
    if (this.busSubscription) {
      this.busSubscription.unsubscribe();
      this.busSubscription = null;
    }
    this.notificationSubject.complete();
  }

  private getMaxConnectionLifetimeMs(): number {
    return (
      this.configService?.get<number>('realtime.maxConnectionLifetimeMs') ||
      REALTIME_DEFAULTS.DEFAULT_MAX_CONNECTION_LIFETIME_MS
    );
  }

  /**
   * Broadcasts a notification event across all active real-time SSE listeners.
   */
  emitNotification(event: NotificationBroadcastEvent): void {
    this.logger.debug(
      `Publishing distributed realtime notification for user ${event.recipientId}: [${event.type}] ${event.title}`,
    );
    this.realtimeBus.publish(REALTIME_CHANNELS.NOTIFICATIONS, event);
  }

  /**
   * Returns an SSE stream of real-time notifications filtered strictly for the authenticated user.
   */
  getUserStream(userId: string): Observable<MessageEvent> {
    this.activeConnections++;
    const lifetimeMs = this.getMaxConnectionLifetimeMs();
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
      takeUntil(timer(lifetimeMs)),
      finalize(() => {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
        this.logger.debug(
          `User ${userId} disconnected from notification stream. Active: ${this.activeConnections}`,
        );
      }),
      share(),
    );
  }

  getActiveConnectionsCount(): number {
    return this.activeConnections;
  }

  decrementConnectionCount(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }
}
