import { RouteProgressService } from './route-progress.service';
import { RouteStopDetail } from '../domain/eta.types';

describe('RouteProgressService', () => {
  let service: RouteProgressService;

  // Realistic Karnataka rural/suburban college route: Hulkoti to Gadag Engineering College
  const mockRouteStops: RouteStopDetail[] = [
    {
      id: 'rs-1',
      routeId: 'route-hulkoti-gadag',
      stopId: 'stop-1',
      sequenceOrder: 1,
      estimatedMinutesFromStart: 0,
      createdAt: new Date(),
      stop: {
        id: 'stop-1',
        name: 'Hulkoti Village Center',
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
      routeId: 'route-hulkoti-gadag',
      stopId: 'stop-2',
      sequenceOrder: 2,
      estimatedMinutesFromStart: 8,
      createdAt: new Date(),
      stop: {
        id: 'stop-2',
        name: 'Rural Cross By-pass',
        code: 'STP-RCB',
        latitude: 15.352,
        longitude: 75.545,
        geofenceRadiusMeters: 50.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'rs-3',
      routeId: 'route-hulkoti-gadag',
      stopId: 'stop-3',
      sequenceOrder: 3,
      estimatedMinutesFromStart: 18,
      createdAt: new Date(),
      stop: {
        id: 'stop-3',
        name: 'Gadag Ring Road Junction',
        code: 'STP-GRR',
        latitude: 15.39,
        longitude: 75.58,
        geofenceRadiusMeters: 60.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'rs-4',
      routeId: 'route-hulkoti-gadag',
      stopId: 'stop-4',
      sequenceOrder: 4,
      estimatedMinutesFromStart: 28,
      createdAt: new Date(),
      stop: {
        id: 'stop-4',
        name: 'Gadag Bus Terminal Central',
        code: 'STP-GTC',
        latitude: 15.424,
        longitude: 75.62,
        geofenceRadiusMeters: 50.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'rs-5',
      routeId: 'route-hulkoti-gadag',
      stopId: 'stop-5',
      sequenceOrder: 5,
      estimatedMinutesFromStart: 40,
      createdAt: new Date(),
      stop: {
        id: 'stop-5',
        name: 'Engineering College Main Gate',
        code: 'STP-ENG',
        latitude: 15.45,
        longitude: 75.65,
        geofenceRadiusMeters: 50.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ];

  beforeEach(() => {
    service = new RouteProgressService();
  });

  it('should correctly identify bus progressing between Stop 2 and Stop 3', () => {
    // Bus location halfway between Stop 2 and Stop 3
    const busLat = (15.352 + 15.39) / 2;
    const busLon = (75.545 + 75.58) / 2;

    const progress = service.computeProgress(mockRouteStops, busLat, busLon);

    expect(progress.isOffRoute).toBe(false);
    expect(progress.currentSegmentIndex).toBe(1); // segment stop-2 -> stop-3
    expect(progress.nextStop?.stopId).toBe('stop-3');
    expect(progress.nextStop?.stopCode).toBe('STP-GRR');

    // Check stop progression states
    const s1 = progress.stops.find((s) => s.stopId === 'stop-1');
    const s2 = progress.stops.find((s) => s.stopId === 'stop-2');
    const s3 = progress.stops.find((s) => s.stopId === 'stop-3');
    const s4 = progress.stops.find((s) => s.stopId === 'stop-4');
    const s5 = progress.stops.find((s) => s.stopId === 'stop-5');

    expect(s1?.status).toBe('PASSED');
    expect(s1?.distanceAlongRouteMeters).toBe(0);

    expect(s2?.status).toBe('PASSED');
    expect(s2?.distanceAlongRouteMeters).toBe(0);

    expect(s3?.status).toBe('NEXT');
    expect(s3?.distanceAlongRouteMeters).toBeGreaterThan(0);
    expect(s3?.interveningStopsCount).toBe(0);

    expect(s4?.status).toBe('UPCOMING');
    expect(s4?.distanceAlongRouteMeters).toBeGreaterThan(s3!.distanceAlongRouteMeters);
    expect(s4?.interveningStopsCount).toBe(1);

    expect(s5?.status).toBe('UPCOMING');
    expect(s5?.distanceAlongRouteMeters).toBeGreaterThan(s4!.distanceAlongRouteMeters);
    expect(s5?.interveningStopsCount).toBe(2);
  });

  it('should detect APPROACHING when bus enters stop geofence radius', () => {
    // Bus is 20m from Stop 4 (within 50m radius)
    const busLat = 15.42405;
    const busLon = 75.62005;

    const progress = service.computeProgress(mockRouteStops, busLat, busLon);

    const s4 = progress.stops.find((s) => s.stopId === 'stop-4');
    expect(s4?.status).toBe('APPROACHING');
    expect(progress.nextStop?.stopId).toBe('stop-4');
  });

  it('should flag off-route when bus deviates significantly from route segments', () => {
    // Location far off in Hubli (15.3647, 75.1240) ~40 km west
    const busLat = 15.3647;
    const busLon = 75.124;

    const progress = service.computeProgress(mockRouteStops, busLat, busLon);

    expect(progress.isOffRoute).toBe(true);
    expect(progress.nearestSegmentDistanceMeters).toBeGreaterThan(1000);
  });

  it('should handle single-stop route gracefully without crashing', () => {
    const singleStopRoute = [mockRouteStops[0]];
    const progress = service.computeProgress(
      singleStopRoute,
      mockRouteStops[0].stop.latitude,
      mockRouteStops[0].stop.longitude,
    );

    expect(progress.stops.length).toBe(1);
    expect(progress.nextStop?.stopId).toBe('stop-1');
  });

  it('should handle empty route stops array gracefully', () => {
    const progress = service.computeProgress([], 15.3, 75.5);
    expect(progress.stops.length).toBe(0);
    expect(progress.nextStop).toBeNull();
  });
});
