export enum UserRole {
  STUDENT = 'STUDENT',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

export enum TripStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum StopEventType {
  ARRIVED = 'ARRIVED',
  DEPARTED = 'DEPARTED',
}

export enum NotificationType {
  TRIP_STARTED = 'TRIP_STARTED',
  ETA_10_MIN = 'ETA_10_MIN',
  STOP_REACHED = 'STOP_REACHED',
  DELAY = 'DELAY',
  CANCELLATION = 'CANCELLATION',
  BREAKDOWN = 'BREAKDOWN',
  ROUTE_ANOMALY = 'ROUTE_ANOMALY',
  BROADCAST = 'BROADCAST',
}

export enum IncidentType {
  BREAKDOWN = 'BREAKDOWN',
  ACCIDENT = 'ACCIDENT',
  DELAY = 'DELAY',
  SOS = 'SOS',
  OTHER = 'OTHER',
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}

