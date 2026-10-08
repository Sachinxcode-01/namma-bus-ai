import { LiveTrackingService } from './live-tracking.service';
import { GpsValidatorService } from './gps-validator.service';
import { LocationsRepository } from '../locations.repository';
import { TripsRepository, TripDetail } from '../../trips/trips.repository';
import { TripStatus } from '@prisma/client';
import { BusOperationalStatus } from '../constants/gps.constants';
import { NotFoundException } from '../../../common/errors/app.exception';

describe('LiveTrackingService', () => {
  let service: LiveTrackingService;
  let locationsRepo: jest.Mocked<LocationsRepository>;
  let tripsRepo: jest.Mocked<TripsRepository>;
  let validator: GpsValidatorService;

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

  const mockLocation = {
    id: 'loc-1',
    busId: 'bus-id-1',
    tripId: 'trip-id-1',
    latitude: 12.9716,
    longitude: 77.5946,
    speed: 35.0,
    heading: 90.0,
    accuracy: 8.0,
    timestamp: new Date(),
    createdAt: new Date(),
  };

  beforeEach(() => {
    locationsRepo = {
      findLatestByTripId: jest.fn(),
      findLatestByBusId: jest.fn(),
    } as unknown as jest.Mocked<LocationsRepository>;

    tripsRepo = {
      findById: jest.fn(),
      findActiveByBus: jest.fn(),
    } as unknown as jest.Mocked<TripsRepository>;

    validator = new GpsValidatorService();

    service = new LiveTrackingService(locationsRepo, tripsRepo, validator);
  });

  describe('deriveBusLiveStatus', () => {
    it('should return COMPLETED when trip status is COMPLETED', () => {
      expect(service.deriveBusLiveStatus(TripStatus.COMPLETED, new Date())).toBe(
        BusOperationalStatus.COMPLETED,
      );
    });

    it('should return CANCELLED when trip status is CANCELLED', () => {
      expect(service.deriveBusLiveStatus(TripStatus.CANCELLED, new Date())).toBe(
        BusOperationalStatus.CANCELLED,
      );
    });

    it('should return TRIP_NOT_STARTED when trip status is SCHEDULED', () => {
      expect(service.deriveBusLiveStatus(TripStatus.SCHEDULED, null)).toBe(
        BusOperationalStatus.TRIP_NOT_STARTED,
      );
    });

    it('should return OFFLINE if active trip has no recorded locations', () => {
      expect(service.deriveBusLiveStatus(TripStatus.ACTIVE, null)).toBe(
        BusOperationalStatus.OFFLINE,
      );
    });

    it('should return LIVE if active trip had a location within 45s', () => {
      const now = Date.now();
      const recent = new Date(now - 15_000);
      expect(service.deriveBusLiveStatus(TripStatus.ACTIVE, recent, now)).toBe(
        BusOperationalStatus.LIVE,
      );
    });

    it('should return STALE if active trip location is between 45s and 180s old', () => {
      const now = Date.now();
      const stale = new Date(now - 60_000); // 60s
      expect(service.deriveBusLiveStatus(TripStatus.ACTIVE, stale, now)).toBe(
        BusOperationalStatus.STALE,
      );
    });

    it('should return OFFLINE if active trip location is older than 180s (3 minutes)', () => {
      const now = Date.now();
      const offline = new Date(now - 200_000); // 200s
      expect(service.deriveBusLiveStatus(TripStatus.ACTIVE, offline, now)).toBe(
        BusOperationalStatus.OFFLINE,
      );
    });
  });

  describe('getLiveTripState', () => {
    it('should return authoritative live state for active trip with location', async () => {
      tripsRepo.findById.mockResolvedValue(mockTrip);
      locationsRepo.findLatestByTripId.mockResolvedValue(mockLocation);

      const state = await service.getLiveTripState('trip-id-1');

      expect(state).toBeDefined();
      expect(state.tripId).toBe('trip-id-1');
      expect(state.busNumber).toBe('KA-01-F-1001');
      expect(state.routeCode).toBe('R-01');
      expect(state.driverName).toBe('Suresh Kumar');
      expect(state.status).toBe(BusOperationalStatus.LIVE);
      expect(state.isStale).toBe(false);
      expect(state.isMoving).toBe(true);
    });

    it('should throw NotFoundException if trip is not found', async () => {
      tripsRepo.findById.mockResolvedValue(null);
      await expect(service.getLiveTripState('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLiveBusState', () => {
    it('should resolve through active trip if bus is currently on an active trip', async () => {
      tripsRepo.findActiveByBus.mockResolvedValue(mockTrip);
      tripsRepo.findById.mockResolvedValue(mockTrip);
      locationsRepo.findLatestByTripId.mockResolvedValue(mockLocation);

      const state = await service.getLiveBusState('bus-id-1');

      expect(state).toBeDefined();
      expect(state.status).toBe(BusOperationalStatus.LIVE);
      expect(tripsRepo.findActiveByBus).toHaveBeenCalledWith('bus-id-1');
    });

    it('should return OFFLINE with stationary location if bus is not currently active', async () => {
      tripsRepo.findActiveByBus.mockResolvedValue(null);
      locationsRepo.findLatestByBusId.mockResolvedValue(mockLocation);

      const state = await service.getLiveBusState('bus-id-1');

      expect(state).toBeDefined();
      expect(state.status).toBe(BusOperationalStatus.OFFLINE);
      expect(state.isStale).toBe(true);
      expect(state.isMoving).toBe(false);
    });
  });
});
