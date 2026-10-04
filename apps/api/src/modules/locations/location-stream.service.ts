import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { LiveLocation } from '@prisma/client';

export type LiveLocationEvent = LiveLocation & {
  busNumber?: string;
  routeCode?: string;
};

@Injectable()
export class LocationStreamService {
  private readonly logger = new Logger(LocationStreamService.name);
  private readonly locationSubject = new Subject<LiveLocationEvent>();

  emitLocation(event: LiveLocationEvent): void {
    this.logger.debug(
      `Broadcasting live location for trip ${event.tripId} (bus ${event.busId}): [${event.latitude}, ${event.longitude}]`,
    );
    this.locationSubject.next(event);
  }

  getTripStream(tripId: string): Observable<MessageEvent> {
    return this.locationSubject.asObservable().pipe(
      filter((loc) => loc.tripId === tripId),
      map((loc) => ({
        data: loc,
        type: 'location_update',
        id: loc.id,
      })),
    );
  }

  getFleetStream(): Observable<MessageEvent> {
    return this.locationSubject.asObservable().pipe(
      map((loc) => ({
        data: loc,
        type: 'fleet_location_update',
        id: loc.id,
      })),
    );
  }
}
