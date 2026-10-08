import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import type {
  BusEntity,
  TripEntity,
  IncidentEntity,
} from '@nammabus/shared-types';
import type { MetricSummary, ExtendedDriverProfile } from '../types/index.ts';

const UserRole = {
  STUDENT: 'STUDENT',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN',
} as const;

const TripStatus = {
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

const IncidentStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
} as const;

const IncidentSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

// Domain helper for testing metrics calculation
function calculateFleetMetrics(
  buses: BusEntity[],
  trips: TripEntity[],
  drivers: ExtendedDriverProfile[],
  incidents: IncidentEntity[]
): MetricSummary {
  const activeBuses = buses.filter((b) => b.isActive).length;
  const activeTrips = trips.filter((t) => (t.status as string) === TripStatus.ACTIVE).length;
  const onDutyDrivers = drivers.filter((d) => d.status === 'ON_DUTY').length;
  const openIncidents = incidents.filter((i) => (i.status as string) !== IncidentStatus.RESOLVED).length;
  const criticalIncidents = incidents.filter(
    (i) => (i.status as string) !== IncidentStatus.RESOLVED && (i.severity as string) === IncidentSeverity.CRITICAL
  ).length;

  return {
    activeBusesCount: activeBuses,
    totalBusesCount: buses.length,
    activeTripsCount: activeTrips,
    onDutyDriversCount: onDutyDrivers,
    totalDriversCount: drivers.length,
    openIncidentsCount: openIncidents,
    criticalIncidentsCount: criticalIncidents,
    onTimePercentage: 98.4,
  };
}

// Validation helpers
function validateCoordinates(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function validateBusCapacity(capacity: number): boolean {
  return !isNaN(capacity) && capacity >= 10 && capacity <= 100;
}

function validateGeofenceRadius(radiusMeters: number): boolean {
  return !isNaN(radiusMeters) && radiusMeters >= 10 && radiusMeters <= 500;
}

function evaluateGpsStaleness(timestampIso: string, nowMs: number = Date.now()): { isStale: boolean; secondsAgo: number } {
  const pingMs = new Date(timestampIso).getTime();
  const secondsAgo = Math.max(0, Math.floor((nowMs - pingMs) / 1000));
  return {
    isStale: secondsAgo > 45,
    secondsAgo,
  };
}

describe('NammaBus AI - Admin Dashboard Domain Logic', () => {
  describe('RBAC & Role Verification', () => {
    it('should grant access only to users with ADMIN role', () => {
      const isRoleAdmin = (role: string) => role === UserRole.ADMIN;

      assert.equal(isRoleAdmin(UserRole.ADMIN), true);
      assert.equal(isRoleAdmin(UserRole.STUDENT), false);
      assert.equal(isRoleAdmin(UserRole.DRIVER), false);
    });

    it('should reject passwords shorter than 6 characters', () => {
      const isPasswordValid = (pwd: string) => pwd.length >= 6;
      assert.equal(isPasswordValid('12345'), false);
      assert.equal(isPasswordValid('123456'), true);
      assert.equal(isPasswordValid('secure_pass_2026'), true);
    });
  });

  describe('Live Telemetry Freshness & Stale Calculation', () => {
    it('should flag telemetry older than 45 seconds as stale', () => {
      const now = Date.now();
      const freshPing = new Date(now - 12 * 1000).toISOString();
      const stalePing = new Date(now - 75 * 1000).toISOString();

      const freshResult = evaluateGpsStaleness(freshPing, now);
      assert.equal(freshResult.isStale, false);
      assert.equal(freshResult.secondsAgo, 12);

      const staleResult = evaluateGpsStaleness(stalePing, now);
      assert.equal(staleResult.isStale, true);
      assert.equal(staleResult.secondsAgo, 75);
    });
  });

  describe('Operational Fleet Metrics Calculation', () => {
    it('should accurately compute active buses, trips, and critical safety alerts', () => {
      const mockBuses: BusEntity[] = [
        { id: 'b1', busNumber: 'NB-01', registrationNumber: 'KA-01-1001', capacity: 54, isActive: true, createdAt: '', updatedAt: '' },
        { id: 'b2', busNumber: 'NB-02', registrationNumber: 'KA-01-1002', capacity: 48, isActive: false, createdAt: '', updatedAt: '' },
      ];

      const mockTrips: TripEntity[] = [
        { id: 't1', busId: 'b1', driverId: 'd1', routeId: 'r1', status: TripStatus.ACTIVE as unknown as TripEntity['status'], createdAt: '', updatedAt: '' },
        { id: 't2', busId: 'b2', driverId: 'd2', routeId: 'r1', status: TripStatus.COMPLETED as unknown as TripEntity['status'], createdAt: '', updatedAt: '' },
      ];

      const mockDrivers: ExtendedDriverProfile[] = [
        { id: 'd1', userId: 'u1', name: 'Ramesh', licenseNumber: 'KA-01', phone: '9845012345', status: 'ON_DUTY', createdAt: '' },
        { id: 'd2', userId: 'u2', name: 'Suresh', licenseNumber: 'KA-02', phone: '9845098765', status: 'STANDBY', createdAt: '' },
      ];

      const mockIncidents: IncidentEntity[] = [
        {
          id: 'inc-1',
          reportedById: 'u1',
          type: 'BREAKDOWN' as unknown as IncidentEntity['type'],
          severity: IncidentSeverity.CRITICAL as unknown as IncidentEntity['severity'],
          description: 'Emergency SOS reported',
          status: IncidentStatus.OPEN as unknown as IncidentEntity['status'],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'inc-2',
          reportedById: 'u2',
          type: 'DELAY' as unknown as IncidentEntity['type'],
          severity: IncidentSeverity.LOW as unknown as IncidentEntity['severity'],
          description: 'Minor traffic slow down',
          status: IncidentStatus.RESOLVED as unknown as IncidentEntity['status'],
          createdAt: '',
          updatedAt: '',
        },
      ];

      const metrics = calculateFleetMetrics(mockBuses, mockTrips, mockDrivers, mockIncidents);

      assert.equal(metrics.activeBusesCount, 1);
      assert.equal(metrics.totalBusesCount, 2);
      assert.equal(metrics.activeTripsCount, 1);
      assert.equal(metrics.onDutyDriversCount, 1);
      assert.equal(metrics.totalDriversCount, 2);
      assert.equal(metrics.openIncidentsCount, 1);
      assert.equal(metrics.criticalIncidentsCount, 1);
    });
  });

  describe('Form Validation Boundaries', () => {
    it('should validate GPS coordinate bounds properly', () => {
      assert.equal(validateCoordinates(12.9716, 77.5946), true);
      assert.equal(validateCoordinates(95.0, 77.5946), false); // Latitude > 90
      assert.equal(validateCoordinates(-95.0, 77.5946), false); // Latitude < -90
      assert.equal(validateCoordinates(12.9716, 185.0), false); // Longitude > 180
      assert.equal(validateCoordinates(12.9716, -185.0), false); // Longitude < -180
    });

    it('should validate bus passenger seating capacity bounds', () => {
      assert.equal(validateBusCapacity(54), true);
      assert.equal(validateBusCapacity(5), false); // Too small for college transit bus
      assert.equal(validateBusCapacity(120), false); // Exceeds realistic capacity limit
    });

    it('should validate geofence radius bounds', () => {
      assert.equal(validateGeofenceRadius(50), true);
      assert.equal(validateGeofenceRadius(5), false); // Under 10m is unreliable with GPS noise
      assert.equal(validateGeofenceRadius(600), false); // Too large, causes false arrivals
    });
  });

  describe('Incident State Transition Workflow', () => {
    it('should allow transitions from OPEN to RESOLVED with timestamp', () => {
      const incident: IncidentEntity = {
        id: 'inc-101',
        reportedById: 'usr-1',
        type: 'BREAKDOWN' as unknown as IncidentEntity['type'],
        severity: IncidentSeverity.HIGH as unknown as IncidentEntity['severity'],
        description: 'Tire puncture on route',
        status: IncidentStatus.OPEN as unknown as IncidentEntity['status'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      assert.equal((incident.status as string), IncidentStatus.OPEN);
      assert.equal(incident.resolvedAt, undefined);

      // Resolve incident
      const resolvedAt = new Date().toISOString();
      const updatedIncident: IncidentEntity = {
        ...incident,
        status: IncidentStatus.RESOLVED as unknown as IncidentEntity['status'],
        resolvedAt,
      };

      assert.equal((updatedIncident.status as string), IncidentStatus.RESOLVED);
      assert.ok(updatedIncident.resolvedAt);
    });
  });
});
