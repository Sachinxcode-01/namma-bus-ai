import { Test, TestingModule } from '@nestjs/testing';
import { StopsService } from './stops.service';
import { StopsRepository } from './stops.repository';
import { ConflictException, NotFoundException } from '../../common/errors/app.exception';

describe('StopsService', () => {
  let service: StopsService;
  let repo: jest.Mocked<StopsRepository>;

  const mockStop = {
    id: 'stop-uuid-1',
    name: 'Majestic Bus Stand',
    code: 'STP-MAJ',
    latitude: 12.9778,
    longitude: 77.5727,
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
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StopsService, { provide: StopsRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<StopsService>(StopsService);
    repo = module.get(StopsRepository);
  });

  describe('create', () => {
    it('should create a stop with unique code', async () => {
      repo.findByCode.mockResolvedValueOnce(null);
      repo.create.mockResolvedValueOnce(mockStop);

      const result = await service.create({
        name: 'Majestic Bus Stand',
        code: 'STP-MAJ',
        latitude: 12.9778,
        longitude: 77.5727,
      });

      expect(result).toEqual(mockStop);
      expect(repo.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if code already exists', async () => {
      repo.findByCode.mockResolvedValueOnce(mockStop);

      await expect(
        service.create({
          name: 'Majestic Bus Stand',
          code: 'STP-MAJ',
          latitude: 12.9778,
          longitude: 77.5727,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return stop when found', async () => {
      repo.findById.mockResolvedValueOnce(mockStop);

      const result = await service.findOne(mockStop.id);
      expect(result).toEqual(mockStop);
    });

    it('should throw NotFoundException if stop does not exist', async () => {
      repo.findById.mockResolvedValueOnce(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
