import { Test, TestingModule } from '@nestjs/testing';
import { StopsService } from './stops.service';
import { StopsRepository } from './stops.repository';
import { ConflictException, NotFoundException } from '../../common/errors/app.exception';

describe('StopsService', () => {
  let service: StopsService;
  let repository: jest.Mocked<StopsRepository>;

  const mockStop = {
    id: 'stop-123',
    name: 'Hebbal Flyover',
    code: 'STP-HEB-01',
    latitude: 13.0358,
    longitude: 77.597,
    geofenceRadiusMeters: 50.0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepo = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      countRouteStops: jest.fn(),
      countSubscriptions: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StopsService,
        {
          provide: StopsRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<StopsService>(StopsService);
    repository = module.get(StopsRepository);
  });

  describe('create', () => {
    it('should create a stop successfully', async () => {
      repository.findByCode.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockStop);

      const result = await service.create({
        name: 'Hebbal Flyover',
        code: 'STP-HEB-01',
        latitude: 13.0358,
        longitude: 77.597,
      });

      expect(result).toEqual(mockStop);
      expect(repository.create).toHaveBeenCalledWith({
        name: 'Hebbal Flyover',
        code: 'STP-HEB-01',
        latitude: 13.0358,
        longitude: 77.597,
      });
    });

    it('should throw ConflictException if code already exists', async () => {
      repository.findByCode.mockResolvedValue(mockStop);

      await expect(
        service.create({
          name: 'Another Stop',
          code: 'STP-HEB-01',
          latitude: 13.0,
          longitude: 77.0,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated stops', async () => {
      repository.findMany.mockResolvedValue({
        stops: [mockStop],
        total: 1,
      });

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return stop when found', async () => {
      repository.findById.mockResolvedValue(mockStop);

      const result = await service.findOne('stop-123');
      expect(result).toEqual(mockStop);
    });

    it('should throw NotFoundException when stop does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update stop details successfully', async () => {
      repository.findById.mockResolvedValue(mockStop);
      repository.findByCode.mockResolvedValue(null);
      repository.update.mockResolvedValue({ ...mockStop, name: 'Hebbal Central' });

      const result = await service.update('stop-123', { name: 'Hebbal Central' });
      expect(result.name).toBe('Hebbal Central');
    });

    it('should throw ConflictException if new code conflicts with another stop', async () => {
      repository.findById.mockResolvedValue(mockStop);
      repository.findByCode.mockResolvedValue({
        ...mockStop,
        id: 'diff-id',
        code: 'STP-DIFF',
      });

      await expect(service.update('stop-123', { code: 'STP-DIFF' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should remove stop when not used by routes or subscriptions', async () => {
      repository.findById.mockResolvedValue(mockStop);
      repository.countRouteStops.mockResolvedValue(0);
      repository.countSubscriptions.mockResolvedValue(0);
      repository.delete.mockResolvedValue(mockStop);

      const result = await service.remove('stop-123');
      expect(result).toEqual({ deleted: true, id: 'stop-123' });
    });

    it('should throw ConflictException when stop is part of a route', async () => {
      repository.findById.mockResolvedValue(mockStop);
      repository.countRouteStops.mockResolvedValue(2);
      repository.countSubscriptions.mockResolvedValue(0);

      await expect(service.remove('stop-123')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when stop has student subscriptions', async () => {
      repository.findById.mockResolvedValue(mockStop);
      repository.countRouteStops.mockResolvedValue(0);
      repository.countSubscriptions.mockResolvedValue(3);

      await expect(service.remove('stop-123')).rejects.toThrow(ConflictException);
    });
  });
});
