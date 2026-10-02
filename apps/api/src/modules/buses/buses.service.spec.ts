import { Test, TestingModule } from '@nestjs/testing';
import { BusesService } from './buses.service';
import { BusesRepository } from './buses.repository';
import { ConflictException, NotFoundException } from '../../common/errors/app.exception';

describe('BusesService', () => {
  let service: BusesService;
  let repo: jest.Mocked<BusesRepository>;

  const mockBus = {
    id: 'bus-uuid-1',
    busNumber: 'BUS-101',
    registrationNumber: 'KA-04-AB-1234',
    capacity: 45,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepo = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByBusNumber: jest.fn(),
      findByRegistrationNumber: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BusesService, { provide: BusesRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<BusesService>(BusesService);
    repo = module.get(BusesRepository);
  });

  describe('create', () => {
    it('should create a bus when busNumber and registrationNumber are unique', async () => {
      repo.findByBusNumber.mockResolvedValueOnce(null);
      repo.findByRegistrationNumber.mockResolvedValueOnce(null);
      repo.create.mockResolvedValueOnce(mockBus);

      const result = await service.create({
        busNumber: 'BUS-101',
        registrationNumber: 'KA-04-AB-1234',
        capacity: 45,
      });

      expect(result).toEqual(mockBus);
      expect(repo.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if busNumber already exists', async () => {
      repo.findByBusNumber.mockResolvedValueOnce(mockBus);

      await expect(
        service.create({
          busNumber: 'BUS-101',
          registrationNumber: 'KA-04-AB-5678',
          capacity: 50,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if registrationNumber already exists', async () => {
      repo.findByBusNumber.mockResolvedValueOnce(null);
      repo.findByRegistrationNumber.mockResolvedValueOnce(mockBus);

      await expect(
        service.create({
          busNumber: 'BUS-102',
          registrationNumber: 'KA-04-AB-1234',
          capacity: 50,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return bus if found', async () => {
      repo.findById.mockResolvedValueOnce(mockBus);

      const result = await service.findOne(mockBus.id);
      expect(result).toEqual(mockBus);
    });

    it('should throw NotFoundException if bus not found', async () => {
      repo.findById.mockResolvedValueOnce(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update bus details successfully', async () => {
      repo.findById.mockResolvedValueOnce(mockBus);
      repo.update.mockResolvedValueOnce({ ...mockBus, capacity: 50 });

      const result = await service.update(mockBus.id, { capacity: 50 });
      expect(result.capacity).toBe(50);
    });
  });
});
