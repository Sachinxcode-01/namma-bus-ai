import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { TripsRepository, TripDetail, TripSummary } from './trips.repository';
import { BusesRepository, BusWithStatus } from '../buses/buses.repository';
import { DriversRepository, DriverWithDetails } from '../drivers/drivers.repository';
import { RoutesRepository } from '../routes/routes.repository';
import {
  Route,
  RouteStop,
  Stop,
  StopEvent,
  StopEventType,
  Trip,
  TripStatus,
  UserRole,
} from '@prisma/client';
import {
  AppException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ValidationException,
} from '../../common/errors/app.exception';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('TripsService', () => {
  let service: TripsService;
  let tripsRepo: jest.Mocked<TripsRepository>;
  let busesRepo: jest.Mocked<BusesRepository>;
  let driversRepo: jest.Mocked<DriversRepository>;
  let routesRepo: jest.Mocked<RoutesRepository>;

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

  const mockBus: BusWithStatus = {
    id: 'bus-id-1',
    busNumber: 'KA-01-F-1001',
    registrationNumber: 'KA01F1001',
    capacity: 40,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    activeTrip: null,
  };

  const mockDriver: DriverWithDetails = {
    id: 'driver-id-1',
    userId: 'driver-user-id',
    licenseNumber: 'KA0120200001234',
    name: 'Suresh Kumar',
    phone: '+919876543210',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'driver-user-id', email: 'driver@nammabus.internal', isActive: true },
    activeTrip: null,
  };

  const mockRoute: Route & {
    routeStops: (RouteStop & { stop: Stop })[];
  } = {
    id: 'route-id-1',
    name: 'Route 1 - Hebbal to Majestic',
    code: 'R-01',
    description: 'Direct route',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    routeStops: [
      {
        id: 'rs-1',
        routeId: 'route-id-1',
        stopId: 'stop-id-1',
        sequenceOrder: 1,
        estimatedMinutesFromStart: 0,
        createdAt: new Date(),
        stop: {
          id: 'stop-id-1',
          name: 'Hebbal',
          code: 'ST-001',
          latitude: 13.0358,
          longitude: 77.597,
          geofenceRadiusMeters: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        id: 'rs-2',
        routeId: 'route-id-1',
        stopId: 'stop-id-2',
        sequenceOrder: 2,
        estimatedMinutesFromStart: 25,
        createdAt: new Date(),
        stop: {
          id: 'stop-id-2',
          name: 'Majestic',
          code: 'ST-002',
          latitude: 12.9767,
          longitude: 77.5713,
          geofenceRadiusMeters: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
  };

  const mockTripDetail: TripDetail = {
    id: 'trip-id-1',
    busId: 'bus-id-1',
    driverId: 'driver-id-1',
    routeId: 'route-id-1',
    status: TripStatus.SCHEDULED,
    scheduledStartTime: new Date(),
    actualStartTime: null,
    actualEndTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    bus: mockBus,
    driver: mockDriver,
    route: mockRoute,
    stopEvents: [],
    lastKnownLocation: null,
  };

  const mockTripSummary: TripSummary = {
    id: 'trip-id-1',
    busId: 'bus-id-1',
    driverId: 'driver-id-1',
    routeId: 'route-id-1',
    status: TripStatus.SCHEDULED,
    scheduledStartTime: new Date(),
    actualStartTime: null,
    actualEndTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    bus: mockBus,
    driver: mockDriver,
    route: mockRoute,
    lastKnownLocation: null,
  };

  const mockActiveTrip: Trip = {
    id: 'active-trip-99',
    busId: 'bus-id-1',
    driverId: 'driver-id-1',
    routeId: 'route-id-1',
    status: TripStatus.ACTIVE,
    scheduledStartTime: new Date(),
    actualStartTime: new Date(),
    actualEndTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStopEvent: StopEvent = {
    id: 'event-1',
    tripId: 'trip-id-1',
    stopId: 'stop-id-1',
    eventType: StopEventType.ARRIVED,
    timestamp: new Date(),
    createdAt: new Date(),
  };

  const mockStopEventWithStop: StopEvent & { stop: Stop } = {
    ...mockStopEvent,
    stop: mockRoute.routeStops![0].stop,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        {
          provide: TripsRepository,
          useValue: {
            create: jest.fn(),
            findMany: jest.fn(),
            findById: jest.fn(),
            findActiveByBus: jest.fn(),
            findActiveByDriver: jest.fn(),
            update: jest.fn(),
            findStopEvent: jest.fn(),
            createStopEvent: jest.fn(),
            findTripStopsProgress: jest.fn(),
          },
        },
        {
          provide: BusesRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: DriversRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: RoutesRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    tripsRepo = module.get(TripsRepository);
    busesRepo = module.get(BusesRepository);
    driversRepo = module.get(DriversRepository);
    routesRepo = module.get(RoutesRepository);
  });

  describe('create', () => {
    it('should schedule a trip successfully when all constraints are valid', async () => {
      busesRepo.findById.mockResolvedValue(mockBus);
      driversRepo.findById.mockResolvedValue(mockDriver);
      routesRepo.findById.mockResolvedValue(mockRoute);
      tripsRepo.findActiveByBus.mockResolvedValue(null);
      tripsRepo.findActiveByDriver.mockResolvedValue(null);
      tripsRepo.create.mockResolvedValue(mockTripSummary);

      const result = await service.create({
        busId: 'bus-id-1',
        driverId: 'driver-id-1',
        routeId: 'route-id-1',
      });

      expect(result).toBeDefined();
      expect(tripsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          busId: 'bus-id-1',
          driverId: 'driver-id-1',
          routeId: 'route-id-1',
        }),
      );
    });

    it('should throw NotFoundException if bus does not exist', async () => {
      busesRepo.findById.mockResolvedValue(null);

      await expect(
        service.create({
          busId: 'non-existent-bus',
          driverId: 'driver-id-1',
          routeId: 'route-id-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ValidationException if bus is inactive', async () => {
      busesRepo.findById.mockResolvedValue({ ...mockBus, isActive: false });

      await expect(
        service.create({
          busId: 'bus-id-1',
          driverId: 'driver-id-1',
          routeId: 'route-id-1',
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw NotFoundException if driver does not exist', async () => {
      busesRepo.findById.mockResolvedValue(mockBus);
      driversRepo.findById.mockResolvedValue(null);

      await expect(
        service.create({
          busId: 'bus-id-1',
          driverId: 'non-existent-driver',
          routeId: 'route-id-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ValidationException if driver user account is inactive', async () => {
      busesRepo.findById.mockResolvedValue(mockBus);
      driversRepo.findById.mockResolvedValue({
        ...mockDriver,
        user: { ...mockDriver.user, isActive: false },
      });

      await expect(
        service.create({
          busId: 'bus-id-1',
          driverId: 'driver-id-1',
          routeId: 'route-id-1',
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw NotFoundException if route does not exist', async () => {
      busesRepo.findById.mockResolvedValue(mockBus);
      driversRepo.findById.mockResolvedValue(mockDriver);
      routesRepo.findById.mockResolvedValue(null);

      await expect(
        service.create({
          busId: 'bus-id-1',
          driverId: 'driver-id-1',
          routeId: 'non-existent-route',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ValidationException if route has no configured stops', async () => {
      busesRepo.findById.mockResolvedValue(mockBus);
      driversRepo.findById.mockResolvedValue(mockDriver);
      routesRepo.findById.mockResolvedValue({ ...mockRoute, routeStops: [] });

      await expect(
        service.create({
          busId: 'bus-id-1',
          driverId: 'driver-id-1',
          routeId: 'route-id-1',
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ConflictException if bus is already on an active trip', async () => {
      busesRepo.findById.mockResolvedValue(mockBus);
      driversRepo.findById.mockResolvedValue(mockDriver);
      routesRepo.findById.mockResolvedValue(mockRoute);
      tripsRepo.findActiveByBus.mockResolvedValue(mockActiveTrip);
      tripsRepo.findActiveByDriver.mockResolvedValue(null);

      await expect(
        service.create({
          busId: 'bus-id-1',
          driverId: 'driver-id-1',
          routeId: 'route-id-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if driver is already on an active trip', async () => {
      busesRepo.findById.mockResolvedValue(mockBus);
      driversRepo.findById.mockResolvedValue(mockDriver);
      routesRepo.findById.mockResolvedValue(mockRoute);
      tripsRepo.findActiveByBus.mockResolvedValue(null);
      tripsRepo.findActiveByDriver.mockResolvedValue(mockActiveTrip);

      await expect(
        service.create({
          busId: 'bus-id-1',
          driverId: 'driver-id-1',
          routeId: 'route-id-1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('startTrip', () => {
    it('should start a scheduled trip when invoked by assigned driver', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.SCHEDULED });
      tripsRepo.findActiveByBus.mockResolvedValue(null);
      tripsRepo.findActiveByDriver.mockResolvedValue(null);
      tripsRepo.update.mockResolvedValue({
        ...mockTripDetail,
        status: TripStatus.ACTIVE,
        actualStartTime: new Date(),
      });

      const result = await service.startTrip('trip-id-1', mockDriverUser);
      expect(result.status).toBe(TripStatus.ACTIVE);
      expect(tripsRepo.update).toHaveBeenCalledWith('trip-id-1', {
        status: TripStatus.ACTIVE,
        actualStartTime: expect.any(Date),
      });
    });

    it('should return existing trip idempotently if trip is already ACTIVE', async () => {
      const activeTrip = {
        ...mockTripDetail,
        status: TripStatus.ACTIVE,
        actualStartTime: new Date(),
      };
      tripsRepo.findById.mockResolvedValue(activeTrip);

      const result = await service.startTrip('trip-id-1', mockDriverUser);
      expect(result.status).toBe(TripStatus.ACTIVE);
      expect(tripsRepo.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if another driver attempts to start the trip', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.SCHEDULED });

      await expect(service.startTrip('trip-id-1', mockOtherDriverUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow admin to start the trip', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.SCHEDULED });
      tripsRepo.findActiveByBus.mockResolvedValue(null);
      tripsRepo.findActiveByDriver.mockResolvedValue(null);
      tripsRepo.update.mockResolvedValue({
        ...mockTripDetail,
        status: TripStatus.ACTIVE,
        actualStartTime: new Date(),
      });

      const result = await service.startTrip('trip-id-1', mockAdminUser);
      expect(result.status).toBe(TripStatus.ACTIVE);
    });

    it('should throw AppException on invalid state transition (e.g. COMPLETED)', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.COMPLETED });

      await expect(service.startTrip('trip-id-1', mockAdminUser)).rejects.toThrow(AppException);
    });
  });

  describe('endTrip', () => {
    it('should complete an active trip', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.ACTIVE });
      tripsRepo.update.mockResolvedValue({
        ...mockTripDetail,
        status: TripStatus.COMPLETED,
        actualEndTime: new Date(),
      });

      const result = await service.endTrip('trip-id-1', mockDriverUser);
      expect(result.status).toBe(TripStatus.COMPLETED);
      expect(tripsRepo.update).toHaveBeenCalledWith('trip-id-1', {
        status: TripStatus.COMPLETED,
        actualEndTime: expect.any(Date),
      });
    });

    it('should return existing trip idempotently if already COMPLETED', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.COMPLETED });

      const result = await service.endTrip('trip-id-1', mockDriverUser);
      expect(result.status).toBe(TripStatus.COMPLETED);
      expect(tripsRepo.update).not.toHaveBeenCalled();
    });

    it('should throw AppException if trying to end a SCHEDULED trip', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.SCHEDULED });

      await expect(service.endTrip('trip-id-1', mockDriverUser)).rejects.toThrow(AppException);
    });
  });

  describe('cancelTrip', () => {
    it('should cancel a scheduled trip', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.SCHEDULED });
      tripsRepo.update.mockResolvedValue({ ...mockTripDetail, status: TripStatus.CANCELLED });

      const result = await service.cancelTrip('trip-id-1', mockAdminUser);
      expect(result.status).toBe(TripStatus.CANCELLED);
    });

    it('should return existing trip idempotently if already CANCELLED', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.CANCELLED });

      const result = await service.cancelTrip('trip-id-1', mockAdminUser);
      expect(result.status).toBe(TripStatus.CANCELLED);
      expect(tripsRepo.update).not.toHaveBeenCalled();
    });

    it('should throw AppException if trying to cancel a COMPLETED trip', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.COMPLETED });

      await expect(service.cancelTrip('trip-id-1', mockAdminUser)).rejects.toThrow(AppException);
    });
  });

  describe('recordStopEvent', () => {
    it('should record an ARRIVED event for an active trip stop', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.ACTIVE });
      tripsRepo.findStopEvent.mockResolvedValue(null);
      tripsRepo.createStopEvent.mockResolvedValue(mockStopEventWithStop);

      const result = await service.recordStopEvent(
        'trip-id-1',
        'stop-id-1',
        { eventType: StopEventType.ARRIVED },
        mockDriverUser,
      );

      expect(result.eventType).toBe(StopEventType.ARRIVED);
      expect(tripsRepo.createStopEvent).toHaveBeenCalledWith(
        'trip-id-1',
        'stop-id-1',
        StopEventType.ARRIVED,
        expect.any(Date),
      );
    });

    it('should return existing stop event idempotently if already recorded', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.ACTIVE });
      tripsRepo.findStopEvent.mockResolvedValue(mockStopEvent);

      const result = await service.recordStopEvent(
        'trip-id-1',
        'stop-id-1',
        { eventType: StopEventType.ARRIVED },
        mockDriverUser,
      );

      expect(result.id).toBe('event-1');
      expect(tripsRepo.createStopEvent).not.toHaveBeenCalled();
    });

    it('should throw AppException if trip is not ACTIVE', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.SCHEDULED });

      await expect(
        service.recordStopEvent(
          'trip-id-1',
          'stop-id-1',
          { eventType: StopEventType.ARRIVED },
          mockDriverUser,
        ),
      ).rejects.toThrow(AppException);
    });

    it('should throw ValidationException if stop is not part of the route', async () => {
      tripsRepo.findById.mockResolvedValue({ ...mockTripDetail, status: TripStatus.ACTIVE });

      await expect(
        service.recordStopEvent(
          'trip-id-1',
          'unknown-stop-id',
          { eventType: StopEventType.ARRIVED },
          mockDriverUser,
        ),
      ).rejects.toThrow(ValidationException);
    });
  });
});
