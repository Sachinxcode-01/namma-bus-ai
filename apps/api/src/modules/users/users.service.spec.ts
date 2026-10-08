import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { UsersRepository, UserDetails } from './users.repository';
import { AuthRepository } from '../auth/auth.repository';
import { PasswordHasherService } from '../auth/services/password-hasher.service';
import { AuditLogService } from '../auth/services/audit-log.service';
import {
  NotFoundException,
  ConflictException,
  ValidationException,
} from '../../common/errors/app.exception';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;
  let authRepo: jest.Mocked<AuthRepository>;
  let hasher: jest.Mocked<PasswordHasherService>;
  let auditLog: jest.Mocked<AuditLogService>;

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
      findByEmail: jest.fn(),
      createUser: jest.fn(),
      updateStatus: jest.fn(),
    };

    const mockAuthRepo = {
      revokeAllUserRefreshTokens: jest.fn().mockResolvedValue(undefined),
    };

    const mockHasher = {
      hash: jest.fn().mockResolvedValue('scrypt$hashed_pwd'),
      compare: jest.fn(),
    };

    const mockAudit = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepo },
        { provide: AuthRepository, useValue: mockAuthRepo },
        { provide: PasswordHasherService, useValue: mockHasher },
        { provide: AuditLogService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(UsersRepository);
    authRepo = module.get(AuthRepository);
    hasher = module.get(PasswordHasherService);
    auditLog = module.get(AuditLogService);
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

  describe('createUser', () => {
    it('should create an admin user successfully', async () => {
      repo.findByEmail.mockResolvedValueOnce(null);
      const createdAdmin: UserDetails = {
        ...mockUserDetails,
        role: UserRole.ADMIN,
        student: null,
      };
      repo.createUser.mockResolvedValueOnce(createdAdmin);

      const result = await service.createUser({
        email: 'newadmin@college.edu',
        password: 'AdminPassword123!',
        role: UserRole.ADMIN,
        name: 'Admin User',
      });

      expect(result.role).toBe(UserRole.ADMIN);
      expect(hasher.hash).toHaveBeenCalledWith('AdminPassword123!');
      expect(auditLog.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_ADMIN_CREATE_USER' }),
      );
    });

    it('should reject creation if email already exists', async () => {
      repo.findByEmail.mockResolvedValueOnce(mockUserDetails);

      await expect(
        service.createUser({
          email: mockUserDetails.email,
          password: 'Password123!',
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should require USN when creating a student', async () => {
      repo.findByEmail.mockResolvedValueOnce(null);

      await expect(
        service.createUser({
          email: 'student@college.edu',
          password: 'Password123!',
          role: UserRole.STUDENT,
          name: 'Student Name',
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('should require licenseNumber when creating a driver', async () => {
      repo.findByEmail.mockResolvedValueOnce(null);

      await expect(
        service.createUser({
          email: 'driver@college.edu',
          password: 'Password123!',
          role: UserRole.DRIVER,
          name: 'Driver Name',
        }),
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('updateStatus', () => {
    it('should update active status and revoke tokens on deactivation', async () => {
      repo.findById.mockResolvedValueOnce(mockUserDetails);
      repo.updateStatus.mockResolvedValueOnce({
        ...mockUserDetails,
        isActive: false,
      });

      const result = await service.updateStatus(mockUserDetails.id, { isActive: false });
      expect(result.isActive).toBe(false);
      expect(repo.updateStatus).toHaveBeenCalledWith(mockUserDetails.id, false);
      expect(authRepo.revokeAllUserRefreshTokens).toHaveBeenCalledWith(mockUserDetails.id);
      expect(auditLog.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_USER_STATUS_CHANGE' }),
      );
    });
  });
});
