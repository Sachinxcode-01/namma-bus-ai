import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { DriversService } from './drivers.service';
import { DriversRepository } from './drivers.repository';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../common/errors/app.exception';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('DriversService', () => {
  let service: DriversService;
  let repository: jest.Mocked<DriversRepository>;

  const mockDriver = {
    id: 'driver-123',
    userId: 'user-driver-1',
    licenseNumber: 'KA-01-2020-0012345',
    name: 'Suresh Kumar',
    phone: '+919876543210',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'user-driver-1', email: 'driver@college.edu', isActive: true },
    activeTrip: null,
  };

  const adminUser: AuthenticatedUser = {
    id: 'admin-user-1',
    email: 'admin@college.edu',
    role: UserRole.ADMIN,
    isActive: true,
  };

  const driverUser: AuthenticatedUser = {
    id: 'user-driver-1',
    email: 'driver@college.edu',
    role: UserRole.DRIVER,
    isActive: true,
    driverId: 'driver-123',
  };

  const otherDriverUser: AuthenticatedUser = {
    id: 'user-driver-2',
    email: 'other@college.edu',
    role: UserRole.DRIVER,
    isActive: true,
    driverId: 'driver-999',
  };

  beforeEach(async () => {
    const mockRepo = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByLicenseNumber: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        {
          provide: DriversRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<DriversService>(DriversService);
    repository = module.get(DriversRepository);
  });

  describe('findAll', () => {
    it('should return paginated drivers', async () => {
      repository.findMany.mockResolvedValue({
        drivers: [mockDriver],
        total: 1,
      });

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return driver when found', async () => {
      repository.findById.mockResolvedValue(mockDriver);

      const result = await service.findOne('driver-123');
      expect(result).toEqual(mockDriver);
    });

    it('should throw NotFoundException when driver does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should allow driver to update their own contact details', async () => {
      repository.findById.mockResolvedValue(mockDriver);
      repository.update.mockResolvedValue({ ...mockDriver, phone: '+919999999999' });

      const result = await service.update('driver-123', { phone: '+919999999999' }, driverUser);
      expect(result.phone).toBe('+919999999999');
    });

    it('should forbid a driver from updating another driver profile', async () => {
      repository.findById.mockResolvedValue(mockDriver);

      await expect(
        service.update('driver-123', { name: 'Hacked Name' }, otherDriverUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid a driver from modifying their commercial license number', async () => {
      repository.findById.mockResolvedValue(mockDriver);

      await expect(
        service.update('driver-123', { licenseNumber: 'NEW-LICENSE' }, driverUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to modify license number and check for duplicates', async () => {
      repository.findById.mockResolvedValue(mockDriver);
      repository.findByLicenseNumber.mockResolvedValue({
        ...mockDriver,
        id: 'other-driver',
        licenseNumber: 'KA-02-2022-9999999',
      });

      await expect(
        service.update('driver-123', { licenseNumber: 'KA-02-2022-9999999' }, adminUser),
      ).rejects.toThrow(ConflictException);
    });
  });
});
