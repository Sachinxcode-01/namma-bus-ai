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
import { TripEtaBroadcastEvent } from '../domain/eta.types';
import {
  REALTIME_BUS,
  RealtimeBus,
  RealtimeSubscription,
} from '../../realtime/interfaces/realtime-bus.interface';
import { REALTIME_CHANNELS, REALTIME_DEFAULTS } from '../../realtime/constants/realtime.constants';

/**
 * EtaStreamService
 * Real-time SSE event broker for dynamic arrival predictions.
 * Provides resilient, distributed real-time streams to student and admin clients.
 */
@Injectable()
export class EtaStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EtaStreamService.name);
  private readonly etaSubject = new Subject<TripEtaBroadcastEvent>();
  private busSubscription: RealtimeSubscription | null = null;
  private activeConnections = 0;

  constructor(
    @Inject(REALTIME_BUS)
    private readonly realtimeBus: RealtimeBus,
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  onModuleInit(): void {
    this.logger.log('Subscribing EtaStreamService to distributed realtime bus channel');
    this.busSubscription = this.realtimeBus.subscribe(
      REALTIME_CHANNELS.ETA,
      (payload: unknown) => {
        try {
          const event = payload as TripEtaBroadcastEvent;
          this.etaSubject.next(event);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to handle incoming distributed ETA payload: ${msg}`);
        }
      },
    );
  }

  onModuleDestroy(): void {
    if (this.busSubscription) {
      this.busSubscription.unsubscribe();
      this.busSubscription = null;
    }
    this.etaSubject.complete();
  }

  private getMaxConnectionLifetimeMs(): number {
    return (
      this.configService?.get<number>('realtime.maxConnectionLifetimeMs') ||
      REALTIME_DEFAULTS.DEFAULT_MAX_CONNECTION_LIFETIME_MS
    );
  }

  /**
   * Broadcasts a validated ETA calculation update across the distributed real-time bus.
   */
  emitEtaUpdate(event: TripEtaBroadcastEvent): void {
    this.logger.debug(
      `Publishing real-time ETA for trip ${event.tripId}: ${event.etaMinutes} min (Status: ${event.status})`,
    );
    this.realtimeBus.publish(REALTIME_CHANNELS.ETA, event);
  }

  /**
   * Returns an SSE Observable stream of arrival predictions for an active trip.
   */
  getTripEtaStream(
    tripId: string,
    initialEvent?: TripEtaBroadcastEvent | null,
  ): Observable<MessageEvent> {
    this.activeConnections++;
    const lifetimeMs = this.getMaxConnectionLifetimeMs();
    this.logger.debug(
      `Client subscribed to trip ${tripId} ETA stream. Active: ${this.activeConnections} (Max lifetime: ${lifetimeMs}ms)`,
    );

    // Keepalive heartbeat
    const heartbeat$ = interval(15000).pipe(
      map(() => ({
        data: { timestamp: new Date().toISOString() },
        type: 'ping',
      })),
    );

    const initial$: Observable<MessageEvent>[] = [];
    if (initialEvent) {
      initial$.push(
        new Observable<MessageEvent>((subscriber) => {
          subscriber.next({
            data: initialEvent,
            type: 'trip_eta_updated',
            id: `${initialEvent.tripId}-${Date.now()}`,
          });
          subscriber.complete();
        }),
      );
    }

    const live$ = this.etaSubject.asObservable().pipe(
      filter((e) => e.tripId === tripId),
      map((e) => ({
        data: e,
        type: 'trip_eta_updated',
        id: `${e.tripId}-${Date.now()}`,
      })),
    );

    return merge(...initial$, live$, heartbeat$).pipe(
      takeUntil(timer(lifetimeMs)),
      finalize(() => {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
        this.logger.debug(
          `Client disconnected from trip ${tripId} ETA stream. Active: ${this.activeConnections}`,
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
