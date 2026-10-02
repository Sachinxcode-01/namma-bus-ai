import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { UsersRepository, UserDetails } from './users.repository';
import { NotFoundException } from '../../common/errors/app.exception';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;

  const mockUserDetails: UserDetails = {
    id: 'user-uuid-1',
    email: 'user@college.edu',
    passwordHash: 'hash',
    role: UserRole.STUDENT,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    student: {
      id: 'student-1',
      usn: '1MS21CS001',
      name: 'Rahul',
      phone: null,
    },
    driver: null,
  };

  beforeEach(async () => {
    const mockRepo = {
      findMany: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(UsersRepository);
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      repo.findMany.mockResolvedValueOnce({
        users: [mockUserDetails],
        total: 1,
      });

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return user details when found', async () => {
      repo.findById.mockResolvedValueOnce(mockUserDetails);

      const result = await service.findOne(mockUserDetails.id);
      expect(result.id).toBe(mockUserDetails.id);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      repo.findById.mockResolvedValueOnce(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update active status', async () => {
      repo.findById.mockResolvedValueOnce(mockUserDetails);
      repo.updateStatus.mockResolvedValueOnce({
        ...mockUserDetails,
        isActive: false,
      });

      const result = await service.updateStatus(mockUserDetails.id, { isActive: false });
      expect(result.isActive).toBe(false);
      expect(repo.updateStatus).toHaveBeenCalledWith(mockUserDetails.id, false);
    });
  });
});
