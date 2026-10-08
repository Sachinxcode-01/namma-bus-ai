import { Test, TestingModule } from '@nestjs/testing';
import { TripStatus } from '@prisma/client';
import { EtaService } from './eta.service';
import { EtaCalculatorService } from './services/eta-calculator.service';
import { RouteProgressService } from './services/route-progress.service';
import { EtaCacheService } from './services/eta-cache.service';
import { EtaStreamService } from './services/eta-stream.service';
import { TripsRepository, TripDetail } from '../trips/trips.repository';
import { LocationsRepository } from '../locations/locations.repository';
import { EtaStatus } from './domain/eta.types';
import { NotFoundException, ValidationException } from '../../common/errors/app.exception';

describe('EtaService', () => {
  let service: EtaService;
  let tripsRepository: jest.Mocked<TripsRepository>;
  let locationsRepository: jest.Mocked<LocationsRepository>;
  let etaStream: EtaStreamService;

  const mockTripDetail = {
    id: 'trip-uuid-1',
    busId: 'bus-uuid-1',
    driverId: 'driver-uuid-1',
    routeId: 'route-uuid-1',
    status: TripStatus.ACTIVE,
    scheduledStartTime: new Date(),
    actualStartTime: new Date(),
    actualEndTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    bus: { id: 'bus-uuid-1', busNumber: 'KA-26-B-1001' },
    route: {
      id: 'route-uuid-1',
      name: 'Hulkoti - Gadag Line',
      code: 'R-HG1',
      routeStops: [
        {
          id: 'rs-1',
          routeId: 'route-uuid-1',
          stopId: 'stop-1',
          sequenceOrder: 1,
          estimatedMinutesFromStart: 0,
          stop: {
            id: 'stop-1',
            name: 'Hulkoti Village',
            code: 'STP-HLK',
            latitude: 15.318,
            longitude: 75.512,
            geofenceRadiusMeters: 50.0,
          },
        },
        {
          id: 'rs-2',
          routeId: 'route-uuid-1',
          stopId: 'stop-2',
          sequenceOrder: 2,
          estimatedMinutesFromStart: 12,
          stop: {
            id: 'stop-2',
            name: 'Gadag Terminal',
            code: 'STP-GDT',
            latitude: 15.424,
            longitude: 75.62,
            geofenceRadiusMeters: 50.0,
          },
        },
      ],
    },
    stopEvents: [],
    lastKnownLocation: {
      id: 'loc-1',
      busId: 'bus-uuid-1',
      tripId: 'trip-uuid-1',
      latitude: 15.32,
      longitude: 75.515,
      speed: 30.0,
      heading: 50,
      accuracy: 10,
      timestamp: new Date(),
      createdAt: new Date(),
    },
  } as unknown as TripDetail;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtaService,
        EtaCalculatorService,
        RouteProgressService,
        EtaCacheService,
        EtaStreamService,
        {
          provide: TripsRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue(mockTripDetail),
          },
        },
        {
          provide: LocationsRepository,
          useValue: {
            findLatestByTripId: jest.fn().mockResolvedValue(mockTripDetail.lastKnownLocation),
          },
        },
      ],
    }).compile();

    service = module.get<EtaService>(EtaService);
    tripsRepository = module.get(TripsRepository);
    locationsRepository = module.get(LocationsRepository);
    etaStream = module.get(EtaStreamService);
  });

  it('should fallback to LocationsRepository if trip lastKnownLocation is null', async () => {
    tripsRepository.findById.mockResolvedValueOnce({
      ...mockTripDetail,
      lastKnownLocation: null,
    });

    const res = await service.getTripEta('trip-uuid-1');

    expect(locationsRepository.findLatestByTripId).toHaveBeenCalledWith('trip-uuid-1');
    expect(res.status).toBe(EtaStatus.AVAILABLE);
  });

  it('should return authoritative ETA for an active trip', async () => {
    const res = await service.getTripEta('trip-uuid-1');

    expect(tripsRepository.findById).toHaveBeenCalledWith('trip-uuid-1');
    expect(res.tripId).toBe('trip-uuid-1');
    expect(res.busId).toBe('bus-uuid-1');
    expect(res.status).toBe(EtaStatus.AVAILABLE);
    expect(res.stops.length).toBe(2);
    expect(res.nextStop?.stopId).toBe('stop-2');
  });

  it('should serve subsequent requests from fast in-memory cache without hitting DB', async () => {
    // First call
    await service.getTripEta('trip-uuid-1');
    expect(tripsRepository.findById).toHaveBeenCalledTimes(1);

    // Second call within TTL
    const cachedRes = await service.getTripEta('trip-uuid-1');
    expect(tripsRepository.findById).toHaveBeenCalledTimes(1);
    expect(cachedRes.tripId).toBe('trip-uuid-1');
  });

  it('should throw NotFoundException when trip does not exist', async () => {
    tripsRepository.findById.mockResolvedValueOnce(null);

    await expect(service.getTripEta('non-existent-trip')).rejects.toThrow(NotFoundException);
  });

  it('should return safe NO_ACTIVE_TRIP state when trip is COMPLETED', async () => {
    tripsRepository.findById.mockResolvedValueOnce({
      ...mockTripDetail,
      status: TripStatus.COMPLETED,
    });

    const res = await service.getTripEta('trip-uuid-1');

    expect(res.status).toBe(EtaStatus.NO_ACTIVE_TRIP);
    expect(res.etaMinutes).toBe(0);
    expect(res.stops.every((s) => s.status === 'PASSED')).toBe(true);
  });

  it('should return safe NO_ACTIVE_TRIP state when trip is SCHEDULED', async () => {
    tripsRepository.findById.mockResolvedValueOnce({
      ...mockTripDetail,
      status: TripStatus.SCHEDULED,
    });

    const res = await service.getTripEta('trip-uuid-1');

    expect(res.status).toBe(EtaStatus.NO_ACTIVE_TRIP);
    expect(res.etaMinutes).toBe(0);
  });

  it('should throw ValidationException if route has no configured stops', async () => {
    tripsRepository.findById.mockResolvedValueOnce({
      ...mockTripDetail,
      route: { ...mockTripDetail.route, routeStops: [] },
    });

    await expect(service.getTripEta('trip-uuid-1')).rejects.toThrow(ValidationException);
  });

  it('should broadcast ETA update when recalculateAndBroadcast is called', async () => {
    const emitSpy = jest.spyOn(etaStream, 'emitEtaUpdate');

    const result = await service.recalculateAndBroadcast('trip-uuid-1');

    expect(result).not.toBeNull();
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: 'trip-uuid-1',
        busId: 'bus-uuid-1',
        status: EtaStatus.AVAILABLE,
      }),
    );
  });
});
