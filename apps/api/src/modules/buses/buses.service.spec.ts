import { Test, TestingModule } from '@nestjs/testing';
import { BusesService } from './buses.service';
import { BusesRepository } from './buses.repository';
import { ConflictException, NotFoundException } from '../../common/errors/app.exception';

describe('BusesService', () => {
  let service: BusesService;
  let repository: jest.Mocked<BusesRepository>;

  const mockBus = {
    id: 'bus-123',
    busNumber: 'BUS-01',
    registrationNumber: 'KA-01-EA-1234',
    capacity: 45,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    activeTrip: null,
  };

  beforeEach(async () => {
    const mockRepo = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByBusNumber: jest.fn(),
      findByRegistrationNumber: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      countTrips: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusesService,
        {
          provide: BusesRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<BusesService>(BusesService);
    repository = module.get(BusesRepository);
  });

  describe('create', () => {
    it('should successfully create a new bus', async () => {
      repository.findByBusNumber.mockResolvedValue(null);
      repository.findByRegistrationNumber.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockBus);

      const result = await service.create({
        busNumber: 'BUS-01',
        registrationNumber: 'KA-01-EA-1234',
        capacity: 45,
      });

      expect(result).toEqual(mockBus);
      expect(repository.create).toHaveBeenCalledWith({
        busNumber: 'BUS-01',
        registrationNumber: 'KA-01-EA-1234',
        capacity: 45,
      });
    });

    it('should throw ConflictException if busNumber already exists', async () => {
      repository.findByBusNumber.mockResolvedValue(mockBus);
      repository.findByRegistrationNumber.mockResolvedValue(null);

      await expect(
        service.create({
          busNumber: 'BUS-01',
          registrationNumber: 'KA-02-EA-9999',
          capacity: 45,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if registrationNumber already exists', async () => {
      repository.findByBusNumber.mockResolvedValue(null);
      repository.findByRegistrationNumber.mockResolvedValue(mockBus);

      await expect(
        service.create({
          busNumber: 'BUS-02',
          registrationNumber: 'KA-01-EA-1234',
          capacity: 45,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of buses', async () => {
      repository.findMany.mockResolvedValue({
        buses: [mockBus],
        total: 1,
      });

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return bus if found', async () => {
      repository.findById.mockResolvedValue(mockBus);

      const result = await service.findOne('bus-123');
      expect(result).toEqual(mockBus);
    });

    it('should throw NotFoundException if bus does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update bus details successfully', async () => {
      repository.findById.mockResolvedValue(mockBus);
      repository.findByBusNumber.mockResolvedValue(null);
      repository.update.mockResolvedValue({ ...mockBus, capacity: 50 });

      const result = await service.update('bus-123', { capacity: 50 });
      expect(result.capacity).toBe(50);
    });

    it('should throw ConflictException if updated busNumber conflicts with another bus', async () => {
      repository.findById.mockResolvedValue(mockBus);
      repository.findByBusNumber.mockResolvedValue({
        ...mockBus,
        id: 'different-bus-id',
        busNumber: 'BUS-02',
      });

      await expect(service.update('bus-123', { busNumber: 'BUS-02' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete bus if no associated trips exist', async () => {
      repository.findById.mockResolvedValue(mockBus);
      repository.countTrips.mockResolvedValue(0);
      repository.delete.mockResolvedValue(mockBus);

      const result = await service.remove('bus-123');
      expect(result).toEqual({ deleted: true, id: 'bus-123' });
    });

    it('should throw ConflictException if bus has associated trips', async () => {
      repository.findById.mockResolvedValue(mockBus);
      repository.countTrips.mockResolvedValue(5);

      await expect(service.remove('bus-123')).rejects.toThrow(ConflictException);
    });
  });
});
