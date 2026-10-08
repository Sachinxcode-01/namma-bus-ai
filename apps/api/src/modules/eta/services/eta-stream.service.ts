import { Injectable, Logger, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, interval, merge } from 'rxjs';
import { filter, map, finalize, share } from 'rxjs/operators';
import { TripEtaBroadcastEvent } from '../domain/eta.types';

/**
 * EtaStreamService
 * Real-time SSE event broker for dynamic arrival predictions.
 * Provides resilient, filtered real-time streams to student and admin clients.
 */
@Injectable()
export class EtaStreamService implements OnModuleDestroy {
  private readonly logger = new Logger(EtaStreamService.name);
  private readonly etaSubject = new Subject<TripEtaBroadcastEvent>();
  private activeConnections = 0;

  onModuleDestroy(): void {
    this.etaSubject.complete();
  }

  /**
   * Broadcasts a validated ETA calculation update across real-time SSE listeners.
   */
  emitEtaUpdate(event: TripEtaBroadcastEvent): void {
    this.logger.debug(
      `Broadcasting real-time ETA for trip ${event.tripId}: ${event.etaMinutes} min (Status: ${event.status})`,
    );
    this.etaSubject.next(event);
  }

  /**
   * Returns an SSE Observable stream of arrival predictions for an active trip.
   */
  getTripEtaStream(
    tripId: string,
    initialEvent?: TripEtaBroadcastEvent | null,
  ): Observable<MessageEvent> {
    this.activeConnections++;
    this.logger.debug(
      `Client subscribed to trip ${tripId} ETA stream. Active: ${this.activeConnections}`,
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
}
