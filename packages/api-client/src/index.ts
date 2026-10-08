import {
  ApiResponse,
  UserProfile,
  UserRole,
  BusEntity,
  RouteEntity,
  StopEntity,
  TripEntity,
  TripStatus,
  LiveLocationEntity,
  TripEtaResponse,
  IncidentEntity,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  NotificationEntity,
  NotificationType,
  DriverProfile,
  LoginResponseData,
  IngestLocationPayload,
} from '@nammabus/shared-types';

export interface ApiClientConfig {
  baseUrl?: string;
  enableMockFallback?: boolean;
}

// Default Seed/Mock Data for robust UI development & testing
const MOCK_STOPS: StopEntity[] = [
  {
    id: 'stop-1',
    name: 'Hostel Gate 1',
    code: 'STP-HG1',
    latitude: 12.9716,
    longitude: 77.5946,
    geofenceRadiusMeters: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stop-2',
    name: 'Library & Tech Block',
    code: 'STP-LIB',
    latitude: 12.9760,
    longitude: 77.6010,
    geofenceRadiusMeters: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stop-3',
    name: 'Engineering Annex',
    code: 'STP-ENG',
    latitude: 12.9810,
    longitude: 77.6080,
    geofenceRadiusMeters: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stop-4',
    name: 'Sports Complex Arena',
    code: 'STP-SPT',
    latitude: 12.9870,
    longitude: 77.6150,
    geofenceRadiusMeters: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stop-5',
    name: 'Main Campus Terminal',
    code: 'STP-MCT',
    latitude: 12.9930,
    longitude: 77.6220,
    geofenceRadiusMeters: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_BUSES: BusEntity[] = [
  {
    id: 'bus-1',
    busNumber: 'NB-01',
    registrationNumber: 'KA-01-EQ-1024',
    capacity: 54,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bus-2',
    busNumber: 'NB-02',
    registrationNumber: 'KA-01-EQ-2048',
    capacity: 48,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_ROUTES: RouteEntity[] = [
  {
    id: 'route-1',
    name: 'Greenfield Campus Express',
    code: 'RT-GREEN-01',
    description: 'Direct express route connecting student hostels to Main Academic Complex',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    routeStops: MOCK_STOPS.map((s, idx) => ({
      id: `rs-${idx + 1}`,
      routeId: 'route-1',
      stopId: s.id,
      sequenceOrder: idx + 1,
      estimatedMinutesFromStart: idx * 6,
      createdAt: new Date().toISOString(),
      stop: s,
    })),
  },
];

const MOCK_DRIVERS: (DriverProfile & { status?: string; assignedBus?: string })[] = [
  {
    id: 'drv-sim-1',
    userId: 'usr-sim-101',
    licenseNumber: 'KA-05-2020-0098',
    name: 'Ramesh Kumar',
    phone: '+91 9845012345',
    status: 'ON_DUTY',
    assignedBus: 'NB-01',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'drv-sim-2',
    userId: 'usr-sim-102',
    licenseNumber: 'KA-05-2018-0042',
    name: 'Suresh Gowda',
    phone: '+91 9845098765',
    status: 'STANDBY',
    assignedBus: 'NB-02',
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
  {
    id: 'drv-sim-3',
    userId: 'usr-sim-103',
    licenseNumber: 'KA-05-2022-0311',
    name: 'Anand Murthy',
    phone: '+91 9845054321',
    status: 'OFF_DUTY',
    assignedBus: 'Unassigned',
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
];

export class ApiClient {
  private baseUrl: string;
  private enableMockFallback: boolean;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:4000/api/v1';
    this.enableMockFallback = config.enableMockFallback ?? true;
  }

  // Token Management
  public getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('nb_access_token');
  }

  public setTokens(access: string, refresh: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('nb_access_token', access);
    localStorage.setItem('nb_refresh_token', refresh);
  }

  public clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('nb_access_token');
    localStorage.removeItem('nb_refresh_token');
    localStorage.removeItem('nb_user_profile');
  }

  public getStoredUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const str = localStorage.getItem('nb_user_profile');
    return str ? JSON.parse(str) : null;
  }

  public setStoredUser(user: UserProfile): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('nb_user_profile', JSON.stringify(user));
  }

  // Base HTTP Request Wrapper
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAccessToken();
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    headers.set('X-Request-ID', `req_${Math.random().toString(36).substring(2, 10)}`);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
      });

      if (response.status === 401 && token) {
        // Attempt token refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          headers.set('Authorization', `Bearer ${this.getAccessToken()}`);
          const retryRes = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
          const retryJson: ApiResponse<T> = await retryRes.json();
          if (retryJson.success && retryJson.data !== undefined) return retryJson.data;
        } else {
          this.clearTokens();
        }
      }

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || `Request failed with status ${response.status}`);
      }
      return json.data as T;
    } catch (err) {
      if (this.enableMockFallback) {
        return this.handleMockFallback<T>(path, options);
      }
      throw err;
    }
  }

  private async refreshToken(): Promise<boolean> {
    const refresh = localStorage.getItem('nb_refresh_token');
    if (!refresh) return false;
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      const json: ApiResponse<LoginResponseData> = await res.json();
      if (json.success && json.data) {
        this.setTokens(json.data.accessToken, json.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Fallback / Development Simulation Provider
  private handleMockFallback<T>(path: string, options: RequestInit = {}): T {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body as string) : {};

    // Auth Login
    if (path === '/auth/login' && method === 'POST') {
      const email = body.email || '';
      let role = UserRole.STUDENT;
      if (email.includes('driver')) role = UserRole.DRIVER;
      if (email.includes('admin')) role = UserRole.ADMIN;

      const mockUser: UserProfile = {
        id: 'usr-sim-101',
        email,
        role,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        student:
          role === UserRole.STUDENT
            ? {
                id: 'std-sim-1',
                userId: 'usr-sim-101',
                usn: '1RV23CS001',
                name: 'Prem (Student Demo)',
                phone: '+91 9876543210',
                createdAt: new Date().toISOString(),
              }
            : undefined,
        driver:
          role === UserRole.DRIVER
            ? {
                id: 'drv-sim-1',
                userId: 'usr-sim-101',
                licenseNumber: 'KA-05-2020-0098',
                name: 'Ramesh Kumar (Driver Demo)',
                phone: '+91 9845012345',
                createdAt: new Date().toISOString(),
              }
            : undefined,
      };

      const loginData: LoginResponseData = {
        accessToken: 'mock_jwt_access_token_demo',
        refreshToken: 'mock_jwt_refresh_token_demo',
        expiresIn: 3600,
        user: mockUser,
      };
      this.setTokens(loginData.accessToken, loginData.refreshToken);
      this.setStoredUser(mockUser);
      return loginData as unknown as T;
    }

    // Auth Me
    if (path === '/auth/me') {
      return (this.getStoredUser() || {
        id: 'usr-guest',
        email: 'guest@nammabus.ai',
        role: UserRole.STUDENT,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }) as unknown as T;
    }

    // Buses
    if (path === '/buses') return MOCK_BUSES as unknown as T;
    if (path.startsWith('/buses/') && path.endsWith('/live-location')) {
      const loc: LiveLocationEntity = {
        busId: 'bus-1',
        tripId: 'trip-1',
        latitude: 12.9785,
        longitude: 77.6045,
        speed: 28.5,
        heading: 65,
        accuracy: 8,
        timestamp: new Date().toISOString(),
      };
      return loc as unknown as T;
    }

    // Routes
    if (path === '/routes') return MOCK_ROUTES as unknown as T;
    if (path.includes('/routes/') && path.includes('/stops')) return MOCK_STOPS as unknown as T;

    // Stops
    if (path === '/stops') return MOCK_STOPS as unknown as T;

    // Trips
    if (path === '/trips') {
      const mockTrips: TripEntity[] = [
        {
          id: 'trip-1',
          busId: 'bus-1',
          driverId: 'drv-sim-1',
          routeId: 'route-1',
          status: TripStatus.ACTIVE,
          actualStartTime: new Date(Date.now() - 15 * 60000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          bus: MOCK_BUSES[0],
          route: MOCK_ROUTES[0],
        },
      ];
      return mockTrips as unknown as T;
    }

    // Trip ETA
    if (path.includes('/eta')) {
      const etaRes: TripEtaResponse = {
        tripId: 'trip-1',
        busId: 'bus-1',
        routeId: 'route-1',
        lastUpdated: new Date().toISOString(),
        currentDelayMinutes: 0,
        stops: [
          {
            stopId: 'stop-1',
            stopName: 'Hostel Gate 1',
            stopCode: 'STP-HG1',
            sequenceOrder: 1,
            latitude: 12.9716,
            longitude: 77.5946,
            estimatedMinutes: 0,
            estimatedArrivalTime: new Date().toISOString(),
            distanceRemainingMeters: 0,
            status: 'PASSED',
          },
          {
            stopId: 'stop-2',
            stopName: 'Library & Tech Block',
            stopCode: 'STP-LIB',
            sequenceOrder: 2,
            latitude: 12.9760,
            longitude: 77.6010,
            estimatedMinutes: 4,
            estimatedArrivalTime: new Date(Date.now() + 4 * 60000).toISOString(),
            distanceRemainingMeters: 650,
            status: 'APPROACHING',
          },
          {
            stopId: 'stop-3',
            stopName: 'Engineering Annex',
            stopCode: 'STP-ENG',
            sequenceOrder: 3,
            latitude: 12.9810,
            longitude: 77.6080,
            estimatedMinutes: 9,
            estimatedArrivalTime: new Date(Date.now() + 9 * 60000).toISOString(),
            distanceRemainingMeters: 1400,
            status: 'NEXT',
          },
          {
            stopId: 'stop-4',
            stopName: 'Sports Complex Arena',
            stopCode: 'STP-SPT',
            sequenceOrder: 4,
            latitude: 12.9870,
            longitude: 77.6150,
            estimatedMinutes: 16,
            estimatedArrivalTime: new Date(Date.now() + 16 * 60000).toISOString(),
            distanceRemainingMeters: 2300,
            status: 'UPCOMING',
          },
          {
            stopId: 'stop-5',
            stopName: 'Main Campus Terminal',
            stopCode: 'STP-MCT',
            sequenceOrder: 5,
            latitude: 12.9930,
            longitude: 77.6220,
            estimatedMinutes: 22,
            estimatedArrivalTime: new Date(Date.now() + 22 * 60000).toISOString(),
            distanceRemainingMeters: 3400,
            status: 'UPCOMING',
          },
        ],
      };
      return etaRes as unknown as T;
    }

    // Incidents
    if (path === '/incidents') {
      if (method === 'POST') {
        const incident: IncidentEntity = {
          id: `inc-${Date.now()}`,
          tripId: body.tripId,
          reportedById: 'usr-sim-101',
          type: body.type || IncidentType.BREAKDOWN,
          severity: body.severity || IncidentSeverity.HIGH,
          description: body.description || 'Reported incident',
          status: IncidentStatus.OPEN,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return incident as unknown as T;
      }
      return [] as unknown as T;
    }

    // Notifications
    if (path === '/notifications') {
      const mockNotifications: NotificationEntity[] = [
        {
          id: 'notif-1',
          recipientId: 'usr-sim-101',
          tripId: 'trip-1',
          type: NotificationType.TRIP_STARTED,
          title: 'Route Started',
          body: 'Bus NB-01 has commenced trip on Greenfield Campus Express.',
          isRead: false,
          createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
        },
        {
          id: 'notif-2',
          recipientId: 'usr-sim-101',
          tripId: 'trip-1',
          type: NotificationType.ETA_10_MIN,
          title: 'Arrival Alert (~9 mins)',
          body: 'Bus NB-01 is approximately 9 minutes away from Engineering Annex.',
          isRead: false,
          createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
        },
      ];
      return mockNotifications as unknown as T;
    }

    // Drivers
    if (path === '/drivers') {
      return MOCK_DRIVERS as unknown as T;
    }
    if (path.startsWith('/drivers/') && method === 'PATCH') {
      const driverId = path.split('/')[2];
      const found = MOCK_DRIVERS.find((d) => d.id === driverId);
      if (found) {
        Object.assign(found, body);
        return found as unknown as T;
      }
    }

    // Incidents update
    if (path.startsWith('/incidents/') && method === 'PATCH') {
      return { id: path.split('/')[2], ...body } as unknown as T;
    }

    return {} as unknown as T;
  }

  // Domain API Methods
  public auth = {
    login: (credentials: { email: string; password?: string }) =>
      this.request<LoginResponseData>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    getMe: () => this.request<UserProfile>('/auth/me'),
    logout: () => {
      this.clearTokens();
      return Promise.resolve();
    },
  };

  public buses = {
    list: () => this.request<BusEntity[]>('/buses'),
    getById: (busId: string) => this.request<BusEntity>(`/buses/${busId}`),
    create: (data: Partial<BusEntity>) =>
      this.request<BusEntity>('/buses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (busId: string, data: Partial<BusEntity>) =>
      this.request<BusEntity>(`/buses/${busId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (busId: string) =>
      this.request<{ deleted: boolean; id: string }>(`/buses/${busId}`, {
        method: 'DELETE',
      }),
    getLiveLocation: (busId: string) =>
      this.request<LiveLocationEntity>(`/buses/${busId}/live-location`),
  };

  public drivers = {
    list: () => this.request<(DriverProfile & { status?: string; assignedBus?: string })[]>('/drivers'),
    getById: (driverId: string) => this.request<DriverProfile>(`/drivers/${driverId}`),
    update: (driverId: string, data: Partial<DriverProfile & { status?: string; assignedBus?: string }>) =>
      this.request<DriverProfile>(`/drivers/${driverId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  };

  public routes = {
    list: () => this.request<RouteEntity[]>('/routes'),
    getById: (routeId: string) => this.request<RouteEntity>(`/routes/${routeId}`),
    getStops: (routeId: string) => this.request<StopEntity[]>(`/routes/${routeId}/stops`),
    create: (data: Partial<RouteEntity>) =>
      this.request<RouteEntity>('/routes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (routeId: string, data: Partial<RouteEntity>) =>
      this.request<RouteEntity>(`/routes/${routeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (routeId: string) =>
      this.request<{ deleted: boolean; id: string }>(`/routes/${routeId}`, {
        method: 'DELETE',
      }),
  };

  public stops = {
    list: () => this.request<StopEntity[]>('/stops'),
    getById: (stopId: string) => this.request<StopEntity>(`/stops/${stopId}`),
    create: (data: Partial<StopEntity>) =>
      this.request<StopEntity>('/stops', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (stopId: string, data: Partial<StopEntity>) =>
      this.request<StopEntity>(`/stops/${stopId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (stopId: string) =>
      this.request<{ deleted: boolean; id: string }>(`/stops/${stopId}`, {
        method: 'DELETE',
      }),
  };

  public trips = {
    list: () => this.request<TripEntity[]>('/trips'),
    findActive: () => this.request<TripEntity[]>('/trips/active'),
    getById: (tripId: string) => this.request<TripEntity>(`/trips/${tripId}`),
    create: (data: { busId: string; driverId: string; routeId: string; scheduledStartTime?: string }) =>
      this.request<TripEntity>('/trips', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    start: (tripId: string) =>
      this.request<TripEntity>(`/trips/${tripId}/start`, { method: 'POST' }),
    end: (tripId: string) =>
      this.request<TripEntity>(`/trips/${tripId}/end`, { method: 'POST' }),
    getEta: (tripId: string) => this.request<TripEtaResponse>(`/trips/${tripId}/eta`),
  };

  public locations = {
    ingest: (payload: IngestLocationPayload) =>
      this.request<void>('/locations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };

  public incidents = {
    list: () => this.request<IncidentEntity[]>('/incidents'),
    create: (data: Partial<IncidentEntity>) =>
      this.request<IncidentEntity>('/incidents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (incidentId: string, data: Partial<IncidentEntity>) =>
      this.request<IncidentEntity>(`/incidents/${incidentId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  };

  public notifications = {
    list: () => this.request<NotificationEntity[]>('/notifications'),
    markRead: (id: string) =>
      this.request<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
    broadcast: (data: { title: string; body: string; type?: NotificationType }) =>
      this.request<void>('/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };
}

export const api = new ApiClient();
