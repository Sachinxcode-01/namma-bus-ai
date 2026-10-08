import { Test, TestingModule } from '@nestjs/testing';
import { LocationsService } from './locations.service';
import { LocationsRepository } from './locations.repository';
import { TripsRepository, TripDetail } from '../trips/trips.repository';
import { LocationStreamService } from './location-stream.service';
import { GpsValidatorService } from './services/gps-validator.service';
import { GpsDeduplicationService } from './services/gps-deduplication.service';
import { LiveTrackingService } from './services/live-tracking.service';
import { GpsMetricsService } from './services/gps-metrics.service';
import { LiveLocation, TripStatus, UserRole } from '@prisma/client';
import {
  AppException,
  ForbiddenException,
  NotFoundException,
  ValidationException,
} from '../../common/errors/app.exception';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { BusLiveStatus } from './domain/gps-telemetry.types';

describe('LocationsService', () => {
  let service: LocationsService;
  let locationsRepo: jest.Mocked<LocationsRepository>;
  let tripsRepo: jest.Mocked<TripsRepository>;
  let streamService: jest.Mocked<LocationStreamService>;
  let metricsService!: GpsMetricsService;

  const mockAdminUser: AuthenticatedUser = {
    id: 'admin-user-id',
    email: 'admin@nammabus.internal',
    role: UserRole.ADMIN,
    isActive: true,
  };

  const mockDriverUser: AuthenticatedUser = {
    id: 'driver-user-id',
    email: 'driver@nammabus.internal',
    role: UserRole.DRIVER,
    isActive: true,
    driverId: 'driver-id-1',
  };

  const mockOtherDriverUser: AuthenticatedUser = {
    id: 'other-driver-user-id',
    email: 'otherdriver@nammabus.internal',
    role: UserRole.DRIVER,
    isActive: true,
    driverId: 'driver-id-2',
  };

  const mockTrip: TripDetail = {
    id: 'trip-id-1',
    busId: 'bus-id-1',
    driverId: 'driver-id-1',
    routeId: 'route-id-1',
    status: TripStatus.ACTIVE,
    scheduledStartTime: new Date(),
    actualStartTime: new Date(),
    actualEndTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    bus: {
      id: 'bus-id-1',
      busNumber: 'KA-01-F-1001',
      registrationNumber: 'KA01F1001',
      capacity: 40,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    driver: {
      id: 'driver-id-1',
      userId: 'driver-user-id',
      licenseNumber: 'KA0120200001234',
      name: 'Suresh Kumar',
      phone: '+919876543210',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'driver-user-id', email: 'driver@nammabus.internal', isActive: true },
    },
    route: {
      id: 'route-id-1',
      name: 'Hebbal to Majestic',
      code: 'R-01',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      routeStops: [],
    },
    stopEvents: [],
    lastKnownLocation: null,
  };

  const mockLocation: LiveLocation = {
    id: 'loc-1',
    busId: 'bus-id-1',
    tripId: 'trip-id-1',
    latitude: 12.9716,
    longitude: 77.5946,
    speed: 30,
    heading: 90,
    accuracy: 5,
    timestamp: new Date(),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockLocationsRepo = {
      create: jest.fn(),
      createMany: jest.fn(),
      findLatestByTripId: jest.fn(),
      findLatestByBusId: jest.fn(),
      findHistoryByTripId: jest.fn(),
    };

    const mockTripsRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findActiveByBus: jest.fn(),
    };

    const mockStreamService = {
      emitLocation: jest.fn(),
      getTripStream: jest.fn(),
      getBusStream: jest.fn(),
      getRouteStream: jest.fn(),
      getFleetStream: jest.fn(),
      getActiveConnectionsCount: jest.fn().mockReturnValue(2),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: LocationsRepository,
          useValue: mockLocationsRepo,
        },
        {
          provide: TripsRepository,
          useValue: mockTripsRepo,
        },
        {
          provide: LocationStreamService,
          useValue: mockStreamService,
        },
        GpsValidatorService,
        GpsDeduplicationService,
        LiveTrackingService,
        GpsMetricsService,
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    locationsRepo = module.get(LocationsRepository);
    tripsRepo = module.get(TripsRepository);
    streamService = module.get(LocationStreamService);
    metricsService = module.get(GpsMetricsService);
  });

  describe('ingest', () => {
    it('should ingest and broadcast location successfully for active trip by assigned driver', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);
      locationsRepo.findLatestByTripId.mockResolvedValue(null);
      locationsRepo.create.mockResolvedValue(mockLocation);

      const result = await service.ingest(
        {
          tripId: 'trip-id-1',
          latitude: 12.9716,
          longitude: 77.5946,
          speed: 30,
          heading: 90,
          accuracy: 5,
          timestamp: new Date().toISOString(),
        },
        mockDriverUser,
      );

      expect(result).toEqual(mockLocation);
      expect(locationsRepo.create).toHaveBeenCalled();
      expect(streamService.emitLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: 'trip-id-1',
          busId: 'bus-id-1',
          busNumber: 'KA-01-F-1001',
          routeCode: 'R-01',
          status: BusLiveStatus.LIVE,
        }),
      );
    });

    it('should throw ValidationException if latitude is out of bounds', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);

      await expect(
        service.ingest(
          {
            tripId: 'trip-id-1',
            latitude: 95.0,
            longitude: 77.5946,
            timestamp: new Date().toISOString(),
          },
          mockDriverUser,
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException if accuracy is negative', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);

      await expect(
        service.ingest(
          {
            tripId: 'trip-id-1',
            latitude: 12.9716,
            longitude: 77.5946,
            accuracy: -5,
            timestamp: new Date().toISOString(),
          },
          mockDriverUser,
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException if accuracy exceeds 200m rejection threshold', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);

      await expect(
        service.ingest(
          {
            tripId: 'trip-id-1',
            latitude: 12.9716,
            longitude: 77.5946,
            accuracy: 250,
            timestamp: new Date().toISOString(),
          },
          mockDriverUser,
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException if speed exceeds 120 km/h', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);

      await expect(
        service.ingest(
          {
            tripId: 'trip-id-1',
            latitude: 12.9716,
            longitude: 77.5946,
            speed: 135,
            timestamp: new Date().toISOString(),
          },
          mockDriverUser,
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException if timestamp is in the future (> 60s)', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);
      const futureTime = new Date(Date.now() + 120_000).toISOString();

      await expect(
        service.ingest(
          {
            tripId: 'trip-id-1',
            latitude: 12.9716,
            longitude: 77.5946,
            timestamp: futureTime,
          },
          mockDriverUser,
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException if timestamp is too stale (> 10m)', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);
      const staleTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      await expect(
        service.ingest(
          {
            tripId: 'trip-id-1',
            latitude: 12.9716,
            longitude: 77.5946,
            timestamp: staleTime,
          },
          mockDriverUser,
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw NotFoundException if trip is not found', async () => {
      tripsRepo.findById.mockResolvedValue(null);

      await expect(
        service.ingest(
          {
            tripId: 'non-existent-trip',
            latitude: 12.9716,
            longitude: 77.5946,
            timestamp: new Date().toISOString(),
          },
          mockDriverUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw AppException if trip is not ACTIVE (e.g. SCHEDULED)', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTrip, status: TripStatus.SCHEDULED });

      await expect(
        service.ingest(
          {
            tripId: 'trip-id-1',
            latitude: 12.9716,
            longitude: 77.5946,
            timestamp: new Date().toISOString(),
          },
          mockDriverUser,
        ),
      ).rejects.toThrow(AppException);
    });

    it('should throw ForbiddenException if another driver attempts to ingest GPS', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);

      await expect(
        service.ingest(
          {
            tripId: 'trip-id-1',
            latitude: 12.9716,
            longitude: 77.5946,
            timestamp: new Date().toISOString(),
          },
          mockOtherDriverUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Admin to ingest GPS', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);
      locationsRepo.findLatestByTripId.mockResolvedValue(null);
      locationsRepo.create.mockResolvedValue(mockLocation);

      const result = await service.ingest(
        {
          tripId: 'trip-id-1',
          latitude: 12.9716,
          longitude: 77.5946,
          timestamp: new Date().toISOString(),
        },
        mockAdminUser,
      );

      expect(result).toBeDefined();
    });

    it('should detect and reject teleportation jump (> 160 km/h within 120s)', async () => {
      const prevTime = new Date(Date.now() - 10_000); // 10 seconds ago
      const prevLoc: LiveLocation = {
        ...mockLocation,
        latitude: 12.9716,
        longitude: 77.5946,
        timestamp: prevTime,
      };

      tripsRepo.findById.mockResolvedValue(mockTrip);
      locationsRepo.findLatestByTripId.mockResolvedValue(prevLoc);

      // Point ~5 km away in 10 seconds = ~1800 km/h (impossible jump)
      await expect(
        service.ingest(
          {
            tripId: 'trip-id-1',
            latitude: 13.015,
            longitude: 77.625,
            timestamp: new Date().toISOString(),
          },
          mockDriverUser,
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should reject ping if timestamp is equal to or older than latest location', async () => {
      const recordedTime = new Date();
      const prevLoc: LiveLocation = {
        ...mockLocation,
        timestamp: recordedTime,
      };

      tripsRepo.findById.mockResolvedValue(mockTrip);
      locationsRepo.findLatestByTripId.mockResolvedValue(prevLoc);

      // Same timestamp
      await expect(
        service.ingest(
          {
            tripId: 'trip-id-1',
            latitude: 12.9716,
            longitude: 77.5946,
            timestamp: recordedTime.toISOString(),
          },
          mockDriverUser,
        ),
      ).rejects.toThrow(ValidationException);

      // Older timestamp (5 seconds before latest)
      const olderTime = new Date(recordedTime.getTime() - 5000).toISOString();
      await expect(
        service.ingest(
          {
            tripId: 'trip-id-1',
            latitude: 12.9716,
            longitude: 77.5946,
            timestamp: olderTime,
          },
          mockDriverUser,
        ),
      ).rejects.toThrow(ValidationException);
    });

    it('should resolve active trip automatically when driver sends ping without tripId', async () => {
      tripsRepo.findAll.mockResolvedValue({
        items: [mockTrip],
        trips: [mockTrip],
        total: 1,
      });
      tripsRepo.findById.mockResolvedValue(mockTrip);
      locationsRepo.findLatestByTripId.mockResolvedValue(null);
      locationsRepo.create.mockResolvedValue(mockLocation);

      const result = await service.ingest(
        {
          latitude: 12.9716,
          longitude: 77.5946,
          timestamp: new Date().toISOString(),
        },
        mockDriverUser,
      );

      expect(result).toBeDefined();
      expect(tripsRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ driverId: 'driver-id-1', status: TripStatus.ACTIVE }),
      );
    });
  });

  describe('ingestBatch', () => {
    it('should ingest a batch of buffered offline GPS pings and update current live state', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);
      locationsRepo.findLatestByTripId.mockResolvedValue(null);
      locationsRepo.create.mockImplementation((data) =>
        Promise.resolve({
          ...mockLocation,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
        }),
      );

      const t1 = new Date(Date.now() - 30_000).toISOString();
      const t2 = new Date(Date.now() - 10_000).toISOString();

      const batchDto = {
        locations: [
          {
            tripId: 'trip-id-1',
            latitude: 12.9716,
            longitude: 77.5946,
            timestamp: t1,
          },
          {
            tripId: 'trip-id-1',
            latitude: 12.972,
            longitude: 77.5948,
            timestamp: t2,
          },
        ],
      };

      const result = await service.ingestBatch(batchDto, mockDriverUser);
      expect(result.acceptedCount).toBe(2);
      expect(result.latestLocation).toBeDefined();
    });
  });

  describe('live operational status queries', () => {
    it('should calculate live operational status correctly', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);
      tripsRepo.findActiveByBus.mockResolvedValue(mockTrip);
      locationsRepo.findLatestByTripId.mockResolvedValue(mockLocation);
      locationsRepo.create.mockResolvedValue(mockLocation);

      // Ingest live location
      await service.ingest(
        {
          tripId: 'trip-id-1',
          latitude: 12.9716,
          longitude: 77.5946,
          timestamp: new Date().toISOString(),
        },
        mockDriverUser,
      );

      const liveBus = await service.getLiveBusState('bus-id-1');
      expect(liveBus).toBeDefined();
      expect(liveBus.busId).toBe('bus-id-1');
      expect(liveBus.status).toBe(BusLiveStatus.LIVE);
      expect(liveBus.isStale).toBe(false);
    });

    it('should return TRIP_NOT_STARTED if no live or historical location exists for bus', async () => {
      tripsRepo.findActiveByBus.mockResolvedValue(null);
      locationsRepo.findLatestByBusId.mockResolvedValue(null);

      const liveBus = await service.getLiveBusState('unknown-bus');
      expect(liveBus.status).toBe(BusLiveStatus.TRIP_NOT_STARTED);
      expect(liveBus.isStale).toBe(true);
    });
  });

  describe('getLatestByTripId and getLatestByBusId', () => {
    it('should return latest location when trip exists', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);
      locationsRepo.findLatestByTripId.mockResolvedValue(mockLocation);

      const result = await service.getLatestByTripId('trip-id-1');
      expect(result).toEqual(mockLocation);
    });

    it('should throw NotFoundException when no location found', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);
      locationsRepo.findLatestByTripId.mockResolvedValue(null);

      await expect(service.getLatestByTripId('trip-id-1')).rejects.toThrow(NotFoundException);
    });

    it('should return latest location for bus', async () => {
      locationsRepo.findLatestByBusId.mockResolvedValue(mockLocation);

      const result = await service.getLatestByBusId('bus-id-1');
      expect(result).toEqual(mockLocation);
    });
  });

  describe('getHistoryByTripId', () => {
    it('should return history array', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);
      locationsRepo.findHistoryByTripId.mockResolvedValue([mockLocation]);

      const result = await service.getHistoryByTripId('trip-id-1', { limit: 50 });
      expect(result).toHaveLength(1);
    });
  });

  describe('getMetrics', () => {
    it('should return health and connection metrics snapshot', () => {
      metricsService.recordReceived();
      metricsService.recordAccepted();
      const metrics = service.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalReceived).toBeGreaterThanOrEqual(1);
      expect(metrics.acceptedCount).toBeGreaterThanOrEqual(1);
    });
  });
});
