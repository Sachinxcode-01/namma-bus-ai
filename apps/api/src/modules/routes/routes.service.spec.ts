import { Test, TestingModule } from '@nestjs/testing';
import { RoutesService } from './routes.service';
import { RoutesRepository, RouteWithStops } from './routes.repository';
import { StopsRepository } from '../stops/stops.repository';
import {
  ConflictException,
  NotFoundException,
  ValidationException,
} from '../../common/errors/app.exception';

describe('RoutesService', () => {
  let service: RoutesService;
  let routesRepo: jest.Mocked<RoutesRepository>;
  let stopsRepo: jest.Mocked<StopsRepository>;

  const mockRoute: RouteWithStops = {
    id: 'route-uuid-1',
    name: 'Campus Express',
    code: 'R-101',
    description: 'Main express route',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    routeStops: [],
  };

  const mockStop = {
    id: 'stop-uuid-1',
    name: 'Main Gate',
    code: 'STP-MG',
    latitude: 12.9,
    longitude: 77.5,
    geofenceRadiusMeters: 50.0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRoutesRepo = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addStop: jest.fn(),
      removeStop: jest.fn(),
      reorderStops: jest.fn(),
    };

    const mockStopsRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: RoutesRepository, useValue: mockRoutesRepo },
        { provide: StopsRepository, useValue: mockStopsRepo },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
    routesRepo = module.get(RoutesRepository);
    stopsRepo = module.get(StopsRepository);
  });

  describe('create', () => {
    it('should create route when code is unique', async () => {
      routesRepo.findByCode.mockResolvedValueOnce(null);
      routesRepo.create.mockResolvedValueOnce(mockRoute);

      const result = await service.create({
        name: 'Campus Express',
        code: 'R-101',
      });

      expect(result).toEqual(mockRoute);
    });

    it('should throw ConflictException if route code exists', async () => {
      routesRepo.findByCode.mockResolvedValueOnce(mockRoute);

      await expect(
        service.create({
          name: 'Campus Express',
          code: 'R-101',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('addStop', () => {
    it('should add stop to route successfully', async () => {
      routesRepo.findById.mockResolvedValueOnce({
        ...mockRoute,
        routeStops: [],
      });
      stopsRepo.findById.mockResolvedValueOnce(mockStop);
      routesRepo.addStop.mockResolvedValueOnce({
        id: 'rs-uuid-1',
        routeId: mockRoute.id,
        stopId: mockStop.id,
        sequenceOrder: 1,
        estimatedMinutesFromStart: 10,
        createdAt: new Date(),
      });

      const result = await service.addStop(mockRoute.id, {
        stopId: mockStop.id,
        sequenceOrder: 1,
        estimatedMinutesFromStart: 10,
      });

      expect(result.sequenceOrder).toBe(1);
      expect(routesRepo.addStop).toHaveBeenCalled();
    });

    it('should reject if stop does not exist', async () => {
      routesRepo.findById.mockResolvedValueOnce(mockRoute);
      stopsRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.addStop(mockRoute.id, {
          stopId: 'missing-stop',
          sequenceOrder: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if sequenceOrder is already occupied', async () => {
      routesRepo.findById.mockResolvedValueOnce({
        ...mockRoute,
        routeStops: [
          {
            id: 'rs-1',
            routeId: mockRoute.id,
            stopId: 'other-stop',
            sequenceOrder: 1,
            estimatedMinutesFromStart: 5,
            createdAt: new Date(),
            stop: {
              id: 'other-stop',
              name: 'Other',
              code: 'STP-OTH',
              latitude: 12.0,
              longitude: 77.0,
              geofenceRadiusMeters: 50.0,
            },
          },
        ],
      });
      stopsRepo.findById.mockResolvedValueOnce(mockStop);

      await expect(
        service.addStop(mockRoute.id, {
          stopId: mockStop.id,
          sequenceOrder: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('reorderStops', () => {
    it('should reject reorder payload with duplicate sequence orders', async () => {
      routesRepo.findById.mockResolvedValueOnce(mockRoute);

      await expect(
        service.reorderStops(mockRoute.id, {
          stops: [
            { stopId: 'stop-1', sequenceOrder: 1 },
            { stopId: 'stop-2', sequenceOrder: 1 },
          ],
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('should reject reorder payload with duplicate stop IDs', async () => {
      routesRepo.findById.mockResolvedValueOnce(mockRoute);

      await expect(
        service.reorderStops(mockRoute.id, {
          stops: [
            { stopId: 'stop-1', sequenceOrder: 1 },
            { stopId: 'stop-1', sequenceOrder: 2 },
          ],
        }),
      ).rejects.toThrow(ValidationException);
    });
  });
});
