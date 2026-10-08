import { Injectable, Logger, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, interval, merge } from 'rxjs';
import { filter, map, finalize, share } from 'rxjs/operators';
import { LiveLocation } from '@prisma/client';
import { GPS_CONFIG } from './constants/gps.constants';
import {
  BusLiveStatus,
  GpsSignalQuality,
  LiveLocationBroadcastEvent,
} from './domain/gps-telemetry.types';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

export type LiveLocationEvent = LiveLocation & {
  busNumber?: string;
  routeCode?: string;
  status?: BusLiveStatus;
  signalQuality?: GpsSignalQuality;
};

@Injectable()
export class LocationStreamService implements OnModuleDestroy {
  private readonly logger = new Logger(LocationStreamService.name);
  private readonly locationSubject = new Subject<LiveLocationBroadcastEvent>();
  private activeConnections = 0;

  onModuleDestroy(): void {
    this.locationSubject.complete();
  }

  /**
   * Broadcasts an accepted GPS location event across all active real-time channels.
   */
  emitLocation(event: LiveLocationBroadcastEvent): void {
    this.logger.debug(
      `Broadcasting GPS event for trip ${event.tripId} (Bus: ${event.busNumber}): [${event.latitude}, ${event.longitude}]`,
    );
    this.locationSubject.next(event);
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
    this.logger.debug(
      `Client subscribed to trip ${tripId} stream. Active connections: ${this.activeConnections}`,
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
      finalize(() => {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
      }),
      share(),
    );
  }

  /**
   * Real-time SSE stream for entire fleet (Fleet Monitoring).
   */
  getFleetStream(_user?: AuthenticatedUser): Observable<MessageEvent> {
    this.activeConnections++;

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
}
