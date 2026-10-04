import { Test, TestingModule } from '@nestjs/testing';
import { RoutesService } from './routes.service';
import { RoutesRepository } from './routes.repository';
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

  const mockRoute = {
    id: 'route-123',
    name: 'Hebbal to Campus',
    code: 'R-12',
    description: 'Express morning route',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    routeStops: [],
  };

  const mockStop = {
    id: 'stop-1',
    name: 'Hebbal Stop',
    code: 'STP-1',
    latitude: 13.0,
    longitude: 77.0,
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
      countTrips: jest.fn(),
      delete: jest.fn(),
      assignStops: jest.fn(),
      findRouteStops: jest.fn(),
    };

    const mockStopsRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        {
          provide: RoutesRepository,
          useValue: mockRoutesRepo,
        },
        {
          provide: StopsRepository,
          useValue: mockStopsRepo,
        },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
    routesRepo = module.get(RoutesRepository);
    stopsRepo = module.get(StopsRepository);
  });

  describe('create', () => {
    it('should create route successfully', async () => {
      routesRepo.findByCode.mockResolvedValue(null);
      routesRepo.create.mockResolvedValue(mockRoute);

      const result = await service.create({
        name: 'Hebbal to Campus',
        code: 'R-12',
      });

      expect(result).toEqual(mockRoute);
    });

    it('should throw ConflictException if route code exists', async () => {
      routesRepo.findByCode.mockResolvedValue(mockRoute);

      await expect(
        service.create({
          name: 'Another Route',
          code: 'R-12',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated routes', async () => {
      routesRepo.findMany.mockResolvedValue({
        routes: [mockRoute],
        total: 1,
      });

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return route when found', async () => {
      routesRepo.findById.mockResolvedValue(mockRoute);

      const result = await service.findOne('route-123');
      expect(result).toEqual(mockRoute);
    });

    it('should throw NotFoundException when route does not exist', async () => {
      routesRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('invalid-route')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignStops', () => {
    it('should assign stops in sequence successfully', async () => {
      routesRepo.findById.mockResolvedValue(mockRoute);
      stopsRepo.findById.mockResolvedValue(mockStop);
      routesRepo.assignStops.mockResolvedValue([
        {
          id: 'rs-1',
          routeId: 'route-123',
          stopId: 'stop-1',
          sequenceOrder: 1,
          estimatedMinutesFromStart: 0,
          createdAt: new Date(),
          stop: mockStop,
        },
      ]);

      const result = await service.assignStops('route-123', {
        stops: [
          {
            stopId: 'stop-1',
            sequenceOrder: 1,
            estimatedMinutesFromStart: 0,
          },
        ],
      });

      expect(result).toHaveLength(1);
      expect(routesRepo.assignStops).toHaveBeenCalled();
    });

    it('should reject duplicate stopIds on the same route', async () => {
      routesRepo.findById.mockResolvedValue(mockRoute);

      await expect(
        service.assignStops('route-123', {
          stops: [
            { stopId: 'stop-1', sequenceOrder: 1 },
            { stopId: 'stop-1', sequenceOrder: 2 },
          ],
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('should reject duplicate sequenceOrders on the same route', async () => {
      routesRepo.findById.mockResolvedValue(mockRoute);

      await expect(
        service.assignStops('route-123', {
          stops: [
            { stopId: 'stop-1', sequenceOrder: 1 },
            { stopId: 'stop-2', sequenceOrder: 1 },
          ],
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw NotFoundException if any referenced stopId does not exist', async () => {
      routesRepo.findById.mockResolvedValue(mockRoute);
      stopsRepo.findById.mockResolvedValue(null);

      await expect(
        service.assignStops('route-123', {
          stops: [{ stopId: 'non-existent-stop', sequenceOrder: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
