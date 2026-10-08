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

export interface PaginatedMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginatedMeta;
}

// Domain Model Types
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  student?: StudentProfile;
  driver?: DriverProfile;
}

export interface StudentProfile {
  id: string;
  userId: string;
  usn: string;
  name: string;
  phone?: string | null;
  createdAt: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface BusEntity {
  id: string;
  busNumber: string;
  registrationNumber: string;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StopEntity {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  createdAt: string;
  updatedAt: string;
}

export interface RouteStopEntity {
  id: string;
  routeId: string;
  stopId: string;
  sequenceOrder: number;
  estimatedMinutesFromStart: number | null;
  createdAt: string;
  stop?: StopEntity;
}

export interface RouteEntity {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  routeStops?: RouteStopEntity[];
}

export interface TripEntity {
  id: string;
  busId: string;
  driverId: string;
  routeId: string;
  status: TripStatus;
  scheduledStartTime?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  createdAt: string;
  updatedAt: string;
  bus?: BusEntity;
  driver?: DriverProfile;
  route?: RouteEntity;
  liveLocations?: LiveLocationEntity[];
}

export interface LiveLocationEntity {
  id?: string;
  busId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  timestamp: string;
}

export interface StopEtaDto {
  stopId: string;
  stopName: string;
  stopCode: string;
  sequenceOrder: number;
  latitude: number;
  longitude: number;
  estimatedMinutes: number;
  estimatedArrivalTime: string;
  distanceRemainingMeters: number;
  status: 'PASSED' | 'APPROACHING' | 'NEXT' | 'UPCOMING';
}

export interface TripEtaResponse {
  tripId: string;
  busId: string;
  routeId: string;
  lastUpdated: string;
  currentDelayMinutes: number;
  stops: StopEtaDto[];
}

export interface NotificationEntity {
  id: string;
  recipientId: string;
  tripId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface IncidentEntity {
  id: string;
  tripId?: string | null;
  reportedById: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  status: IncidentStatus;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  trip?: TripEntity;
  reportedBy?: UserProfile;
}

// Authentication DTOs
export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export enum BusLiveStatus {
  TRIP_NOT_STARTED = 'TRIP_NOT_STARTED',
  LIVE = 'LIVE',
  STALE = 'STALE',
  OFFLINE = 'OFFLINE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum GpsSignalQuality {
  EXCELLENT = 'EXCELLENT',
  ACCEPTABLE = 'ACCEPTABLE',
  POOR = 'POOR',
  UNKNOWN = 'UNKNOWN',
}

export interface LiveBusState {
  busId: string;
  busNumber?: string;
  tripId?: string;
  routeId?: string;
  routeCode?: string;
  routeName?: string;
  driverId?: string;
  driverName?: string;
  status: BusLiveStatus;
  isStale: boolean;
  latitude?: number;
  longitude?: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  accuracyQuality: GpsSignalQuality;
  recordedAt?: string;
  receivedAt?: string;
  ageSeconds?: number;
}

export interface LiveLocationBroadcastEvent {
  tripId: string;
  busId: string;
  routeId: string;
  routeCode: string;
  busNumber: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
  receivedAt: string;
  status: BusLiveStatus;
  signalQuality: GpsSignalQuality;
  locationId: string;
}

export interface IngestLocationPayload {
  busId?: string;
  tripId?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: string;
}

