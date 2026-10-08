import { EtaCalculatorService } from './eta-calculator.service';
import { RouteProgressService } from './route-progress.service';
import { RouteStopDetail, EtaStatus, EtaConfidence } from '../domain/eta.types';
import { LiveLocation } from '@prisma/client';
import { ValidationException } from '../../../common/errors/app.exception';

describe('EtaCalculatorService', () => {
  let calculator: EtaCalculatorService;
  let progressService: RouteProgressService;

  const mockRouteStops: RouteStopDetail[] = [
    {
      id: 'rs-1',
      routeId: 'route-1',
      stopId: 'stop-1',
      sequenceOrder: 1,
      estimatedMinutesFromStart: 0,
      createdAt: new Date(),
      stop: {
        id: 'stop-1',
        name: 'Hulkoti Village',
        code: 'STP-HLK',
        latitude: 15.318,
        longitude: 75.512,
        geofenceRadiusMeters: 50.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'rs-2',
      routeId: 'route-1',
      stopId: 'stop-2',
      sequenceOrder: 2,
      estimatedMinutesFromStart: 10,
      createdAt: new Date(),
      stop: {
        id: 'stop-2',
        name: 'Bypass Cross',
        code: 'STP-BYP',
        latitude: 15.352,
        longitude: 75.545,
        geofenceRadiusMeters: 50.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'rs-3',
      routeId: 'route-1',
      stopId: 'stop-3',
      sequenceOrder: 3,
      estimatedMinutesFromStart: 25,
      createdAt: new Date(),
      stop: {
        id: 'stop-3',
        name: 'Gadag College Terminal',
        code: 'STP-GCT',
        latitude: 15.424,
        longitude: 75.62,
        geofenceRadiusMeters: 50.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ];

  beforeEach(() => {
    progressService = new RouteProgressService();
    calculator = new EtaCalculatorService(progressService);
  });

  it('should calculate valid ETA for an active moving bus with fresh GPS', () => {
    const now = new Date();
    const mockLocation: LiveLocation = {
      id: 'loc-1',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 15.32,
      longitude: 75.514,
      speed: 35.0, // 35 km/h moving
      heading: 45.0,
      accuracy: 10.0,
      timestamp: new Date(now.getTime() - 10000), // 10s old (fresh)
      createdAt: now,
    };

    const res = calculator.calculate({
      tripId: 'trip-1',
      busId: 'bus-1',
      routeId: 'route-1',
      routeStops: mockRouteStops,
      latestLocation: mockLocation,
      now,
    });

    expect(res.status).toBe(EtaStatus.AVAILABLE);
    expect(res.confidence).toBe(EtaConfidence.HIGH);
    expect(res.stops.length).toBe(3);
    expect(res.nextStop?.stopId).toBe('stop-2');
    expect(res.etaMinutes).toBeGreaterThan(0);
    expect(res.distanceRemainingMeters).toBeGreaterThan(0);
  });

  it('should handle stationary bus (speed ≈ 0) sensibly without dividing by zero', () => {
    const now = new Date();
    const mockLocation: LiveLocation = {
      id: 'loc-2',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 15.33,
      longitude: 75.52,
      speed: 0.0, // Bus waiting at traffic light or stop
      heading: 0,
      accuracy: 8.0,
      timestamp: new Date(now.getTime() - 15000), // 15s ago
      createdAt: now,
    };

    const res = calculator.calculate({
      tripId: 'trip-1',
      busId: 'bus-1',
      routeId: 'route-1',
      routeStops: mockRouteStops,
      latestLocation: mockLocation,
      now,
    });

    expect(res.status).toBe(EtaStatus.AVAILABLE);
    // Confidence degrades to MEDIUM due to stationary fallback
    expect(res.confidence).toBe(EtaConfidence.MEDIUM);
    // ETA must be finite and realistic based on fallback speed (25 km/h)
    expect(res.etaMinutes).toBeGreaterThan(0);
    expect(res.etaMinutes).toBeLessThan(120);
    expect(Number.isFinite(res.etaMinutes)).toBe(true);
  });

  it('should mark STALE when GPS timestamp is older than threshold', () => {
    const now = new Date();
    const mockLocation: LiveLocation = {
      id: 'loc-3',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 15.33,
      longitude: 75.52,
      speed: 30.0,
      heading: 45,
      accuracy: 12.0,
      timestamp: new Date(now.getTime() - 150000), // 150s ago (> 120s stale)
      createdAt: now,
    };

    const res = calculator.calculate({
      tripId: 'trip-1',
      busId: 'bus-1',
      routeId: 'route-1',
      routeStops: mockRouteStops,
      latestLocation: mockLocation,
      now,
    });

    expect(res.status).toBe(EtaStatus.STALE);
    expect(res.confidence).toBe(EtaConfidence.LOW);
  });

  it('should mark GPS_UNAVAILABLE when location is missing or offline (> 300s)', () => {
    const now = new Date();
    const res = calculator.calculate({
      tripId: 'trip-1',
      busId: 'bus-1',
      routeId: 'route-1',
      routeStops: mockRouteStops,
      latestLocation: null,
      now,
    });

    expect(res.status).toBe(EtaStatus.GPS_UNAVAILABLE);
    expect(res.confidence).toBe(EtaConfidence.LOW);
  });

  it('should handle selectedStopId query for focused stop', () => {
    const now = new Date();
    const mockLocation: LiveLocation = {
      id: 'loc-4',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 15.32,
      longitude: 75.514,
      speed: 40.0,
      heading: 45,
      accuracy: 10.0,
      timestamp: new Date(now.getTime() - 10000),
      createdAt: now,
    };

    // Student selects destination: Stop 3 (terminal)
    const res = calculator.calculate({
      tripId: 'trip-1',
      busId: 'bus-1',
      routeId: 'route-1',
      routeStops: mockRouteStops,
      latestLocation: mockLocation,
      now,
      selectedStopId: 'stop-3',
    });

    expect(res.stopId).toBe('stop-3');
    expect(res.status).toBe(EtaStatus.AVAILABLE);
    expect(res.etaMinutes).toBeGreaterThan(0);
    expect(res.distanceRemainingMeters).toBeGreaterThan(0);
  });

  it('should mark STOP_PASSED when bus has already moved past selected stop', () => {
    const now = new Date();
    // Bus is near stop 3 (has passed stop 1 and stop 2)
    const mockLocation: LiveLocation = {
      id: 'loc-5',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 15.42,
      longitude: 75.615,
      speed: 25.0,
      heading: 45,
      accuracy: 10.0,
      timestamp: new Date(now.getTime() - 10000),
      createdAt: now,
    };

    // Student asks for Stop 1 (which bus has already passed)
    const res = calculator.calculate({
      tripId: 'trip-1',
      busId: 'bus-1',
      routeId: 'route-1',
      routeStops: mockRouteStops,
      latestLocation: mockLocation,
      now,
      selectedStopId: 'stop-1',
    });

    expect(res.stopId).toBe('stop-1');
    expect(res.status).toBe(EtaStatus.STOP_PASSED);
    expect(res.etaMinutes).toBe(0);
    expect(res.distanceRemainingMeters).toBe(0);
  });

  it('should throw ValidationException if selectedStopId is not on the route', () => {
    const now = new Date();
    const mockLocation: LiveLocation = {
      id: 'loc-6',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 15.32,
      longitude: 75.514,
      speed: 30.0,
      heading: 45,
      accuracy: 10.0,
      timestamp: now,
      createdAt: now,
    };

    expect(() =>
      calculator.calculate({
        tripId: 'trip-1',
        busId: 'bus-1',
        routeId: 'route-1',
        routeStops: mockRouteStops,
        latestLocation: mockLocation,
        now,
        selectedStopId: 'invalid-stop-id',
      }),
    ).toThrow(ValidationException);
  });

  it('should cap implausible GPS speeds (e.g. 180 km/h) at MAX_PLAUSIBLE_SPEED_KMH', () => {
    const now = new Date();
    const mockLocation: LiveLocation = {
      id: 'loc-7',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 15.32,
      longitude: 75.514,
      speed: 180.0, // Crazy teleport speed
      heading: 45,
      accuracy: 10.0,
      timestamp: now,
      createdAt: now,
    };

    const res = calculator.calculate({
      tripId: 'trip-1',
      busId: 'bus-1',
      routeId: 'route-1',
      routeStops: mockRouteStops,
      latestLocation: mockLocation,
      now,
      selectedStopId: 'stop-2',
    });

    // Capped speed prevents unrealistic instant ETA (0 min)
    expect(res.etaMinutes).toBeGreaterThanOrEqual(1);
  });
});
