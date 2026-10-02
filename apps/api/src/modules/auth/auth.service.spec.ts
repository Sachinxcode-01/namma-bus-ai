import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { AuthRepository, UserWithProfile } from './auth.repository';
import { PasswordHasherService } from './services/password-hasher.service';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '../../common/errors/app.exception';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let passwordHasher: jest.Mocked<PasswordHasherService>;

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
      revokeRefreshToken: jest.fn(),
      revokeAllUserRefreshTokens: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockRepo },
        { provide: PasswordHasherService, useValue: mockHasher },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authRepository = module.get(AuthRepository);
    passwordHasher = module.get(PasswordHasherService);
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
      expect(result.user.email).toBe('test.student@college.edu');
      expect(result.user.role).toBe(UserRole.STUDENT);
      expect(authRepository.createStudentUser).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already taken', async () => {
      authRepository.findUserByEmail.mockResolvedValueOnce(mockUser);

      await expect(
        service.registerStudent({
          email: 'test.student@college.edu',
          password: 'Password123!',
          name: 'Another Student',
          usn: '1MS21CS002',
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

      expect(result).toHaveProperty('accessToken', 'mock.jwt.token');
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should reject non-existent user with UnauthorizedException', async () => {
      authRepository.findUserByEmail.mockResolvedValueOnce(null);

      await expect(
        service.login({
          email: 'nonexistent@college.edu',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid password with UnauthorizedException', async () => {
      authRepository.findUserByEmail.mockResolvedValueOnce(mockUser);
      passwordHasher.compare.mockResolvedValueOnce(false);

      await expect(
        service.login({
          email: 'test.student@college.edu',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject deactivated user with UnauthorizedException', async () => {
      authRepository.findUserByEmail.mockResolvedValueOnce({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.login({
          email: 'test.student@college.edu',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should rotate refresh token and issue new token pair', async () => {
      const mockRefreshTokenRecord = {
        id: 'token-uuid-1',
        userId: mockUser.id,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: null,
        createdAt: new Date(),
        user: mockUser,
      };

      authRepository.findValidRefreshToken.mockResolvedValueOnce(mockRefreshTokenRecord);
      authRepository.revokeRefreshToken.mockResolvedValueOnce(undefined);
      authRepository.createRefreshToken.mockResolvedValueOnce({
        id: 'token-uuid-2',
        userId: mockUser.id,
        tokenHash: 'new-hash',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      });

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toHaveProperty('accessToken', 'mock.jwt.token');
      expect(authRepository.revokeRefreshToken).toHaveBeenCalled();
    });

    it('should reject invalid or expired refresh token', async () => {
      authRepository.findValidRefreshToken.mockResolvedValueOnce(null);

      await expect(service.refreshTokens('invalid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return profile for existing user', async () => {
      authRepository.findUserById.mockResolvedValueOnce(mockUser);

      const profile = await service.getProfile(mockUser.id);
      expect(profile.id).toBe(mockUser.id);
      expect(profile.name).toBe('Test Student');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      authRepository.findUserById.mockResolvedValueOnce(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
