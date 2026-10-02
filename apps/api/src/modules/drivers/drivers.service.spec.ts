import { Test, TestingModule } from '@nestjs/testing';
import { DriversService } from './drivers.service';
import { DriversRepository, DriverWithUser } from './drivers.repository';
import { ConflictException, NotFoundException } from '../../common/errors/app.exception';

describe('DriversService', () => {
  let service: DriversService;
  let repo: jest.Mocked<DriversRepository>;

  const mockDriver: DriverWithUser = {
    id: 'driver-uuid-1',
    userId: 'user-uuid-1',
    name: 'Manjunath',
    licenseNumber: 'KA0420190012345',
    phone: '+919845012345',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-uuid-1',
      email: 'driver@college.edu',
      isActive: true,
    },
  };

  beforeEach(async () => {
    const mockRepo = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByLicenseNumber: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DriversService, { provide: DriversRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<DriversService>(DriversService);
    repo = module.get(DriversRepository);
  });

  describe('findOne', () => {
    it('should return driver if found', async () => {
      repo.findById.mockResolvedValueOnce(mockDriver);

      const result = await service.findOne(mockDriver.id);
      expect(result).toEqual(mockDriver);
    });

    it('should throw NotFoundException if driver not found', async () => {
      repo.findById.mockResolvedValueOnce(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update driver details', async () => {
      repo.findById.mockResolvedValueOnce(mockDriver);
      repo.update.mockResolvedValueOnce({
        ...mockDriver,
        name: 'Manjunath G',
      });

      const result = await service.update(mockDriver.id, { name: 'Manjunath G' });
      expect(result.name).toBe('Manjunath G');
    });

    it('should throw ConflictException if new license number is already in use', async () => {
      repo.findById.mockResolvedValueOnce(mockDriver);
      repo.findByLicenseNumber.mockResolvedValueOnce({
        id: 'other-driver',
        userId: 'other-user',
        licenseNumber: 'KA0420190099999',
        name: 'Other',
        phone: '+919999999999',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.update(mockDriver.id, { licenseNumber: 'KA0420190099999' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
