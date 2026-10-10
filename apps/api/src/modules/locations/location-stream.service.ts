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
import { LiveLocation } from '@prisma/client';
import { GPS_CONFIG } from './constants/gps.constants';
import {
  BusLiveStatus,
  GpsSignalQuality,
  LiveLocationBroadcastEvent,
} from './domain/gps-telemetry.types';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  REALTIME_BUS,
  RealtimeBus,
  RealtimeSubscription,
} from '../realtime/interfaces/realtime-bus.interface';
import { REALTIME_CHANNELS, REALTIME_DEFAULTS } from '../realtime/constants/realtime.constants';

export type LiveLocationEvent = LiveLocation & {
  busNumber?: string;
  routeCode?: string;
  status?: BusLiveStatus;
  signalQuality?: GpsSignalQuality;
};

@Injectable()
export class LocationStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LocationStreamService.name);
  private readonly locationSubject = new Subject<LiveLocationBroadcastEvent>();
  private busSubscription: RealtimeSubscription | null = null;
  private activeConnections = 0;

  constructor(
    @Inject(REALTIME_BUS)
    private readonly realtimeBus: RealtimeBus,
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  onModuleInit(): void {
    this.logger.log('Subscribing LocationStreamService to distributed realtime bus channel');
    this.busSubscription = this.realtimeBus.subscribe(
      REALTIME_CHANNELS.LOCATIONS,
      (payload: unknown) => {
        try {
          const event = payload as LiveLocationBroadcastEvent;
          this.locationSubject.next(event);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to handle incoming distributed location payload: ${msg}`);
        }
      },
    );
  }

  onModuleDestroy(): void {
    if (this.busSubscription) {
      this.busSubscription.unsubscribe();
      this.busSubscription = null;
    }
    this.locationSubject.complete();
  }

  private getMaxConnectionLifetimeMs(): number {
    return (
      this.configService?.get<number>('realtime.maxConnectionLifetimeMs') ||
      REALTIME_DEFAULTS.DEFAULT_MAX_CONNECTION_LIFETIME_MS
    );
  }

  /**
   * Broadcasts an accepted GPS location event across the distributed real-time backbone.
   */
  emitLocation(event: LiveLocationBroadcastEvent): void {
    this.logger.debug(
      `Publishing GPS event for trip ${event.tripId} (Bus: ${event.busNumber}): [${event.latitude}, ${event.longitude}]`,
    );
    this.realtimeBus.publish(REALTIME_CHANNELS.LOCATIONS, event);
  }

  /**
   * Real-time SSE stream for a specific trip.
   */
  getTripStream(
    tripId: string,
    initialEvent?: LiveLocationBroadcastEvent | null,
    _user?: AuthenticatedUser,
  ): Observable<MessageEvent> {
    this.activeConnections++;
    const lifetimeMs = this.getMaxConnectionLifetimeMs();
    this.logger.debug(
      `Client subscribed to trip ${tripId} stream. Active connections: ${this.activeConnections} (Max lifetime: ${lifetimeMs}ms)`,
    );

    // Heartbeat ping stream to keep SSE connection alive through proxies
    const heartbeat$ = interval(GPS_CONFIG.SSE_HEARTBEAT_INTERVAL_MS).pipe(
      map(() => ({
        data: { timestamp: new Date().toISOString() },
        type: 'ping',
      })),
    );

    // Initial state event (if available)
    const initial$: Observable<MessageEvent>[] = [];
    if (initialEvent) {
      initial$.push(
        new Observable<MessageEvent>((subscriber) => {
          subscriber.next({
            data: initialEvent,
            type: 'location_update',
            id: initialEvent.locationId,
          });
          subscriber.complete();
        }),
      );
    }

    const live$ = this.locationSubject.asObservable().pipe(
      filter((loc) => loc.tripId === tripId),
      map((loc) => ({
        data: loc,
        type: 'location_update',
        id: loc.locationId,
      })),
    );

    return merge(...initial$, live$, heartbeat$).pipe(
      takeUntil(timer(lifetimeMs)),
      finalize(() => {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
        this.logger.debug(
          `Client disconnected from trip ${tripId} stream. Active: ${this.activeConnections}`,
        );
      }),
      share(),
    );
  }

  /**
   * Real-time SSE stream for a specific bus.
   */
  getBusStream(
    busId: string,
    initialEvent?: LiveLocationBroadcastEvent | null,
    _user?: AuthenticatedUser,
  ): Observable<MessageEvent> {
    this.activeConnections++;
    const lifetimeMs = this.getMaxConnectionLifetimeMs();
    this.logger.debug(
      `Client subscribed to bus ${busId} stream. Active: ${this.activeConnections}`,
    );

    const heartbeat$ = interval(GPS_CONFIG.SSE_HEARTBEAT_INTERVAL_MS).pipe(
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
            type: 'location_update',
            id: initialEvent.locationId,
          });
          subscriber.complete();
        }),
      );
    }

    const live$ = this.locationSubject.asObservable().pipe(
      filter((loc) => loc.busId === busId),
      map((loc) => ({
        data: loc,
        type: 'location_update',
        id: loc.locationId,
      })),
    );

    return merge(...initial$, live$, heartbeat$).pipe(
      takeUntil(timer(lifetimeMs)),
      finalize(() => {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
        this.logger.debug(
          `Client disconnected from bus ${busId} stream. Active: ${this.activeConnections}`,
        );
      }),
      share(),
    );
  }

  /**
   * Real-time SSE stream for a route.
   */
  getRouteStream(routeCode: string, _user?: AuthenticatedUser): Observable<MessageEvent> {
    this.activeConnections++;
    const lifetimeMs = this.getMaxConnectionLifetimeMs();

    const heartbeat$ = interval(GPS_CONFIG.SSE_HEARTBEAT_INTERVAL_MS).pipe(
      map(() => ({
        data: { timestamp: new Date().toISOString() },
        type: 'ping',
      })),
    );

    const live$ = this.locationSubject.asObservable().pipe(
      filter((loc) => loc.routeCode === routeCode),
      map((loc) => ({
        data: loc,
        type: 'location_update',
        id: loc.locationId,
      })),
    );

    return merge(live$, heartbeat$).pipe(
      takeUntil(timer(lifetimeMs)),
      finalize(() => {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
      }),
      share(),
    );
  }

  /**
   * Real-time SSE stream for entire fleet (Fleet Monitoring - Admin Only).
   */
  getFleetStream(_user?: AuthenticatedUser): Observable<MessageEvent> {
    this.activeConnections++;
    const lifetimeMs = this.getMaxConnectionLifetimeMs();

    const heartbeat$ = interval(GPS_CONFIG.SSE_HEARTBEAT_INTERVAL_MS).pipe(
      map(() => ({
        data: { timestamp: new Date().toISOString() },
        type: 'ping',
      })),
    );

    const live$ = this.locationSubject.asObservable().pipe(
      map((loc) => ({
        data: loc,
        type: 'fleet_location_update',
        id: loc.locationId,
      })),
    );

    return merge(live$, heartbeat$).pipe(
      takeUntil(timer(lifetimeMs)),
      finalize(() => {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
      }),
      share(),
    );
  }

  getActiveConnectionCount(): number {
    return this.activeConnections;
  }

  getActiveConnectionsCount(): number {
    return this.activeConnections;
  }

  decrementConnectionCount(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }
}
