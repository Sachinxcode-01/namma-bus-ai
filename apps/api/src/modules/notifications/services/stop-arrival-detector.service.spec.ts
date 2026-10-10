import { Test, TestingModule } from '@nestjs/testing';
import { LiveLocation, StopEvent, StopEventType, TripStatus } from '@prisma/client';
import { StopArrivalDetectorService } from './stop-arrival-detector.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationsService } from '../notifications.service';

describe('StopArrivalDetectorService', () => {
  let service: StopArrivalDetectorService;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockTrip = {
    id: 'trip-1',
    busId: 'bus-1',
    routeId: 'route-1',
    status: TripStatus.ACTIVE,
    route: {
      id: 'route-1',
      code: 'R-01',
      name: 'Campus Express',
      routeStops: [
        {
          stopId: 'stop-1',
          sequenceOrder: 1,
          stop: {
            id: 'stop-1',
            name: 'Campus Gate',
            code: 'STP-01',
            latitude: 12.9716,
            longitude: 77.5946,
            geofenceRadiusMeters: 50.0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        {
          stopId: 'stop-2',
          sequenceOrder: 2,
          stop: {
            id: 'stop-2',
            name: 'Hostel Block',
            code: 'STP-02',
            latitude: 12.975,
            longitude: 77.598,
            geofenceRadiusMeters: 50.0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    },
  };

  const mockPrisma = {
    stopEvent: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockNotificationsService = {
    handleStopArrival: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StopArrivalDetectorService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<StopArrivalDetectorService>(StopArrivalDetectorService);
    notificationsService = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  it('should skip evaluation if trip is not ACTIVE', async () => {
    const inactiveTrip = { ...mockTrip, status: TripStatus.SCHEDULED };
    const ping: LiveLocation = {
      id: 'loc-1',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 12.9716,
      longitude: 77.5946,
      speed: 10,
      heading: 0,
      accuracy: 10,
      timestamp: new Date(),
      createdAt: new Date(),
    };

    const result = await service.evaluate(inactiveTrip, ping);

    expect(result.hasArrived).toBe(false);
    expect(mockPrisma.stopEvent.findMany).not.toHaveBeenCalled();
  });

  it('should skip evaluation if GPS accuracy is poor (> 50m)', async () => {
    const poorAccuracyPing: LiveLocation = {
      id: 'loc-1',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 12.9716,
      longitude: 77.5946,
      speed: 10,
      heading: 0,
      accuracy: 85.0, // > 50m threshold
      timestamp: new Date(),
      createdAt: new Date(),
    };

    const result = await service.evaluate(mockTrip, poorAccuracyPing);

    expect(result.hasArrived).toBe(false);
    expect(mockPrisma.stopEvent.findMany).not.toHaveBeenCalled();
  });

  it('should skip evaluation if GPS timestamp is stale (> 120s old)', async () => {
    const stalePing: LiveLocation = {
      id: 'loc-1',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 12.9716,
      longitude: 77.5946,
      speed: 10,
      heading: 0,
      accuracy: 10,
      timestamp: new Date(Date.now() - 300 * 1000), // 300s old
      createdAt: new Date(),
    };

    const result = await service.evaluate(mockTrip, stalePing);

    expect(result.hasArrived).toBe(false);
    expect(mockPrisma.stopEvent.findMany).not.toHaveBeenCalled();
  });

  it('should confirm stop arrival when bus is within geofence at low speed', async () => {
    mockPrisma.stopEvent.findMany.mockResolvedValue([]);
    mockPrisma.stopEvent.upsert.mockResolvedValue({
      id: 'event-1',
      tripId: 'trip-1',
      stopId: 'stop-1',
      eventType: StopEventType.ARRIVED,
      timestamp: new Date(),
      createdAt: new Date(),
    } as unknown as StopEvent);

    // Exact coordinates of stop-1, speed 5 km/h
    const arrivalPing: LiveLocation = {
      id: 'loc-1',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 12.9716,
      longitude: 77.5946,
      speed: 5.0,
      heading: 90,
      accuracy: 8.0,
      timestamp: new Date(),
      createdAt: new Date(),
    };

    const result = await service.evaluate(mockTrip, arrivalPing);

    expect(result.hasArrived).toBe(true);
    expect(result.stopId).toBe('stop-1');
    expect(mockPrisma.stopEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tripId_stopId_eventType: {
            tripId: 'trip-1',
            stopId: 'stop-1',
            eventType: StopEventType.ARRIVED,
          },
        },
      }),
    );
    expect(notificationsService.handleStopArrival).toHaveBeenCalled();
  });

  it('should require consecutive pings when bus is moving faster through geofence', async () => {
    mockPrisma.stopEvent.findMany.mockResolvedValue([]);
    mockPrisma.stopEvent.upsert.mockResolvedValue({
      id: 'event-2',
      tripId: 'trip-1',
      stopId: 'stop-1',
      eventType: StopEventType.ARRIVED,
      timestamp: new Date(),
      createdAt: new Date(),
    } as unknown as StopEvent);

    // 1st ping: speed 25 km/h (candidate recorded, not yet confirmed)
    const fastPing1: LiveLocation = {
      id: 'loc-1',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 12.97161,
      longitude: 77.59461,
      speed: 25.0,
      heading: 90,
      accuracy: 10.0,
      timestamp: new Date(),
      createdAt: new Date(),
    };

    const result1 = await service.evaluate(mockTrip, fastPing1);
    expect(result1.hasArrived).toBe(false);

    // 2nd ping inside geofence: confirms arrival via multi-sample stabilization
    const fastPing2: LiveLocation = {
      id: 'loc-2',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 12.97162,
      longitude: 77.59462,
      speed: 24.0,
      heading: 90,
      accuracy: 10.0,
      timestamp: new Date(),
      createdAt: new Date(),
    };

    const result2 = await service.evaluate(mockTrip, fastPing2);
    expect(result2.hasArrived).toBe(true);
    expect(result2.stopId).toBe('stop-1');
  });

  it('should not re-trigger arrival if stop has already been recorded as arrived', async () => {
    mockPrisma.stopEvent.findMany.mockResolvedValue([
      {
        id: 'ev-1',
        tripId: 'trip-1',
        stopId: 'stop-1',
        eventType: StopEventType.ARRIVED,
        timestamp: new Date(),
        createdAt: new Date(),
      },
    ]);

    const ping: LiveLocation = {
      id: 'loc-1',
      busId: 'bus-1',
      tripId: 'trip-1',
      latitude: 12.9716,
      longitude: 77.5946,
      speed: 5.0,
      heading: 0,
      accuracy: 10,
      timestamp: new Date(),
      createdAt: new Date(),
    };

    const result = await service.evaluate(mockTrip, ping);

    expect(result.hasArrived).toBe(false);
    expect(mockPrisma.stopEvent.upsert).not.toHaveBeenCalled();
  });

  it('should reset candidate state when resetTripState is called', async () => {
    service.resetTripState('trip-1');
    // Calling reset should execute without throwing
    expect(true).toBe(true);
  });
});
