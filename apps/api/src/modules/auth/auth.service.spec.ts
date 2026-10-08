import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { AuthRepository, UserWithProfile } from './auth.repository';
import { PasswordHasherService } from './services/password-hasher.service';
import { AuditLogService } from './services/audit-log.service';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ValidationException,
} from '../../common/errors/app.exception';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let passwordHasher: jest.Mocked<PasswordHasherService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockUser: UserWithProfile = {
    id: 'user-uuid-1',
    email: 'test.student@college.edu',
    passwordHash: 'scrypt$salt$hash',
    role: UserRole.STUDENT,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    student: {
      id: 'student-uuid-1',
      userId: 'user-uuid-1',
      usn: '1MS21CS001',
      name: 'Test Student',
      phone: '+919876543210',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    driver: null,
  };

  beforeEach(async () => {
    const mockRepo = {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      createStudentUser: jest.fn(),
      createDriverUser: jest.fn(),
      createRefreshToken: jest.fn(),
      findValidRefreshToken: jest.fn(),
      findRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeAllUserRefreshTokens: jest.fn(),
      updateUserPassword: jest.fn(),
    };

    const mockHasher = {
      hash: jest.fn().mockResolvedValue('hashed_password'),
      compare: jest.fn(),
    };

    const mockJwt = {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
    };

    const mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'auth.jwtAccessSecret') return 'test-secret-at-least-16-chars';
        if (key === 'auth.jwtAccessExpiresIn') return '15m';
        return undefined;
      }),
    };

    const mockAuditLog = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockRepo },
        { provide: PasswordHasherService, useValue: mockHasher },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authRepository = module.get(AuthRepository);
    passwordHasher = module.get(PasswordHasherService);
    auditLogService = module.get(AuditLogService);
  });

  describe('registerStudent', () => {
    it('should register a new student and return auth tokens', async () => {
      authRepository.findUserByEmail.mockResolvedValueOnce(null);
      authRepository.createStudentUser.mockResolvedValueOnce(mockUser);
      authRepository.createRefreshToken.mockResolvedValueOnce({
        id: 'token-uuid-1',
        userId: mockUser.id,
        tokenHash: 'hash',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      });

      const result = await service.registerStudent({
        email: 'test.student@college.edu',
        password: 'Password123!',
        name: 'Test Student',
        usn: '1MS21CS001',
      });

      expect(result).toHaveProperty('accessToken', 'mock.jwt.token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('email', 'test.student@college.edu');
      expect(auditLogService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_REGISTER_STUDENT' }),
      );
    });

    it('should throw ConflictException if email is already taken', async () => {
      authRepository.findUserByEmail.mockResolvedValueOnce(mockUser);

      await expect(
        service.registerStudent({
          email: 'test.student@college.edu',
          password: 'Password123!',
          name: 'Test Student',
          usn: '1MS21CS001',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      authRepository.findUserByEmail.mockResolvedValueOnce(mockUser);
      passwordHasher.compare.mockResolvedValueOnce(true);
      authRepository.createRefreshToken.mockResolvedValueOnce({
        id: 'token-uuid-1',
        userId: mockUser.id,
        tokenHash: 'hash',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      });

      const result = await service.login({
        email: 'test.student@college.edu',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe('test.student@college.edu');
      expect(auditLogService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_LOGIN_SUCCESS' }),
      );
    });

    it('should reject non-existent user with UnauthorizedException', async () => {
      authRepository.findUserByEmail.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'unknown@college.edu', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(auditLogService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_LOGIN_FAILED' }),
      );
    });

    it('should reject invalid password with UnauthorizedException', async () => {
      authRepository.findUserByEmail.mockResolvedValueOnce(mockUser);
      passwordHasher.compare.mockResolvedValueOnce(false);

      await expect(
        service.login({ email: 'test.student@college.edu', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject deactivated user with UnauthorizedException', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      authRepository.findUserByEmail.mockResolvedValueOnce(inactiveUser);

      await expect(
        service.login({ email: 'test.student@college.edu', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should rotate refresh token and issue new token pair', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      authRepository.findRefreshToken.mockResolvedValueOnce({
        id: 'token-uuid-1',
        userId: mockUser.id,
        tokenHash: 'hash',
        expiresAt: futureDate,
        revokedAt: null,
        createdAt: new Date(),
        user: mockUser,
      });

      authRepository.createRefreshToken.mockResolvedValueOnce({
        id: 'token-uuid-2',
        userId: mockUser.id,
        tokenHash: 'hash-2',
        expiresAt: futureDate,
        revokedAt: null,
        createdAt: new Date(),
      });

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(authRepository.revokeRefreshToken).toHaveBeenCalled();
      expect(auditLogService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_TOKEN_ROTATED' }),
      );
    });

    it('should detect token reuse on revoked token and revoke entire token family', async () => {
      authRepository.findRefreshToken.mockResolvedValueOnce({
        id: 'compromised-token-id',
        userId: mockUser.id,
        tokenHash: 'compromised-hash',
        expiresAt: new Date(Date.now() + 10000),
        revokedAt: new Date(Date.now() - 5000), // ALREADY REVOKED!
        createdAt: new Date(),
        user: mockUser,
      });

      await expect(service.refreshTokens('already-revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify that all refresh tokens for this user were revoked for breach mitigation
      expect(authRepository.revokeAllUserRefreshTokens).toHaveBeenCalledWith(mockUser.id);
      expect(auditLogService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_TOKEN_REUSE_DETECTED' }),
      );
    });

    it('should reject invalid or expired refresh token', async () => {
      authRepository.findRefreshToken.mockResolvedValueOnce(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password, revoke all refresh tokens, and log audit event', async () => {
      authRepository.findUserById.mockResolvedValueOnce(mockUser);
      passwordHasher.compare.mockResolvedValueOnce(true);
      passwordHasher.hash.mockResolvedValueOnce('new_scrypt_hash');
      authRepository.updateUserPassword.mockResolvedValueOnce({
        ...mockUser,
        passwordHash: 'new_scrypt_hash',
      });

      const result = await service.changePassword(mockUser.id, {
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewSecurePass2026@',
      });

      expect(result.message).toContain('Password changed successfully');
      expect(authRepository.updateUserPassword).toHaveBeenCalledWith(
        mockUser.id,
        'new_scrypt_hash',
      );
      expect(authRepository.revokeAllUserRefreshTokens).toHaveBeenCalledWith(mockUser.id);
      expect(auditLogService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_PASSWORD_CHANGE_SUCCESS' }),
      );
    });

    it('should reject password change when current password is wrong', async () => {
      authRepository.findUserById.mockResolvedValueOnce(mockUser);
      passwordHasher.compare.mockResolvedValueOnce(false);

      await expect(
        service.changePassword(mockUser.id, {
          currentPassword: 'WrongCurrentPass!',
          newPassword: 'NewSecurePass2026@',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject password change when new password is same as current', async () => {
      authRepository.findUserById.mockResolvedValueOnce(mockUser);
      passwordHasher.compare.mockResolvedValueOnce(true);

      await expect(
        service.changePassword(mockUser.id, {
          currentPassword: 'SamePassword123!',
          newPassword: 'SamePassword123!',
        }),
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('logoutAll', () => {
    it('should revoke all user refresh tokens and log audit event', async () => {
      await service.logoutAll(mockUser.id);

      expect(authRepository.revokeAllUserRefreshTokens).toHaveBeenCalledWith(mockUser.id);
      expect(auditLogService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_LOGOUT_ALL' }),
      );
    });
  });

  describe('getProfile', () => {
    it('should return profile for existing user', async () => {
      authRepository.findUserById.mockResolvedValueOnce(mockUser);

      const profile = await service.getProfile(mockUser.id);

      expect(profile.id).toBe(mockUser.id);
      expect(profile.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      authRepository.findUserById.mockResolvedValueOnce(null);

      await expect(service.getProfile('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
