import {
  UserProfile,
  BusEntity,
  RouteEntity,
  StopEntity,
  TripEntity,
  IncidentEntity,
  NotificationEntity,
  DriverProfile,
  LiveLocationEntity,
} from '@nammabus/shared-types';

export type AdminTab =
  | 'overview'
  | 'live'
  | 'buses'
  | 'drivers'
  | 'routes'
  | 'trips'
  | 'incidents'
  | 'broadcast'
  | 'settings';

export type DriverDutyStatus = 'ON_DUTY' | 'STANDBY' | 'OFF_DUTY';

export interface ExtendedDriverProfile extends DriverProfile {
  status?: DriverDutyStatus;
  assignedBus?: string;
  assignedRoute?: string;
}

export type ConnectionState = 'connected' | 'connecting' | 'stale' | 'offline';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  durationMs?: number;
}

export interface MetricSummary {
  activeBusesCount: number;
  totalBusesCount: number;
  activeTripsCount: number;
  onDutyDriversCount: number;
  totalDriversCount: number;
  openIncidentsCount: number;
  criticalIncidentsCount: number;
  onTimePercentage: number;
}
