/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { GlobalExceptionsFilter } from '../src/common/filters/global-exceptions.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';
import { UserRole } from '@prisma/client';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';

describe('Authentication & User Management (e2e)', () => {
  let app: INestApplication;
  let passwordHasher: PasswordHasherService;

  const usersDb: Record<string, any> = {};
  const refreshTokensDb: Record<string, any> = {};

  const mockPrismaService: any = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    isHealthy: jest.fn().mockResolvedValue(true),
    user: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.email) {
          const user = Object.values(usersDb).find((u: any) => u.email === where.email);
          return user || null;
        }
        if (where.id) {
          return usersDb[where.id] || null;
        }
        return null;
      }),
      findMany: jest.fn(async () => Object.values(usersDb)),
      count: jest.fn(async () => Object.keys(usersDb).length),
      create: jest.fn(async ({ data }) => {
        const id = 'user-uuid-' + Math.random().toString(36).substring(7);
        const newUser = {
          id,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date(),
          student: data.student
            ? {
                id: 'student-uuid-' + Math.random().toString(36).substring(7),
                userId: id,
                ...data.student.create,
              }
            : null,
          driver: data.driver
            ? {
                id: 'driver-uuid-' + Math.random().toString(36).substring(7),
                userId: id,
                ...data.driver.create,
              }
            : null,
        };
        usersDb[id] = newUser;
        return newUser;
      }),
      update: jest.fn(async ({ where, data }) => {
        if (usersDb[where.id]) {
          usersDb[where.id] = { ...usersDb[where.id], ...data };
          return usersDb[where.id];
        }
        return null;
      }),
    },
    refreshToken: {
      create: jest.fn(async ({ data }) => {
        const id = 'rt-' + Math.random().toString(36).substring(7);
        const record = {
          id,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          revokedAt: null,
          createdAt: new Date(),
        };
        refreshTokensDb[data.tokenHash] = record;
        return record;
      }),
      findUnique: jest.fn(async ({ where }) => {
        const token = refreshTokensDb[where.tokenHash];
        if (!token) return null;
        const user = usersDb[token.userId];
        return { ...token, user };
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        if (where.tokenHash && refreshTokensDb[where.tokenHash]) {
          refreshTokensDb[where.tokenHash].revokedAt = data.revokedAt;
        }
        if (where.userId) {
          for (const token of Object.values(refreshTokensDb)) {
            if (token.userId === where.userId) {
              token.revokedAt = data.revokedAt;
            }
          }
        }
        return { count: 1 };
      }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-id' }),
    },
    $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nammabus_test';
    process.env.JWT_ACCESS_SECRET = 'super-secret-key-at-least-16-characters-long';
    process.env.JWT_REFRESH_SECRET = 'super-refresh-key-at-least-16-characters-long';

    passwordHasher = new PasswordHasherService();

    // Pre-seed an admin user for RBAC tests
    const adminHash = await passwordHasher.hash('AdminPass123!');
    const adminId = '00000000-0000-4000-8000-000000000001';
    usersDb[adminId] = {
      id: adminId,
      email: 'admin@college.edu',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      student: null,
      driver: null,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'health/ready'],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionsFilter());
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  let studentAccessToken = '';
  let studentRefreshToken = '';
  let adminAccessToken = '';

  describe('Student Registration (POST /api/v1/auth/register/student)', () => {
    it('should register a new student and return token pair with user envelope', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/student')
        .send({
          email: 'rahul.student@college.edu',
          password: 'Password123!',
          name: 'Rahul Student',
          usn: '1MS21CS099',
          phone: '+919876543210',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toHaveProperty('email', 'rahul.student@college.edu');
      expect(response.body.data.user).toHaveProperty('role', UserRole.STUDENT);

      studentAccessToken = response.body.data.accessToken;
      studentRefreshToken = response.body.data.refreshToken;
    });

    it('should reject registration with invalid email format (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/student')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Rahul',
          usn: '1MS21CS099',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with password shorter than 8 characters (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/student')
        .send({
          email: 'shortpass@college.edu',
          password: 'short',
          name: 'Short',
          usn: '1MS21CS100',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject registration if email is duplicate (409 Conflict)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register/student')
        .send({
          email: 'rahul.student@college.edu',
          password: 'Password123!',
          name: 'Duplicate',
          usn: '1MS21CS101',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('User Login (POST /api/v1/auth/login)', () => {
    it('should successfully log in student with valid credentials', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'rahul.student@college.edu',
        password: 'Password123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user.role).toBe(UserRole.STUDENT);
    });

    it('should successfully log in admin user', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'admin@college.edu',
        password: 'AdminPass123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe(UserRole.ADMIN);
      adminAccessToken = response.body.data.accessToken;
    });

    it('should reject login with wrong password (401 Unauthorized)', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'rahul.student@college.edu',
        password: 'WrongPassword!',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject login for non-existent email (401 Unauthorized)', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'ghost@college.edu',
        password: 'AnyPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Token Refresh (POST /api/v1/auth/refresh)', () => {
    it('should rotate token and return new access + refresh token pair', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: studentRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      // Update student tokens
      studentAccessToken = response.body.data.accessToken;
      studentRefreshToken = response.body.data.refreshToken;
    });

    it('should reject expired or invalid refresh token (401)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'completely-invalid-refresh-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Protected Profile (GET /api/v1/auth/me)', () => {
    it('should return current user profile when valid Bearer token is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email', 'rahul.student@college.edu');
      expect(response.body.data).toHaveProperty('role', UserRole.STUDENT);
    });

    it('should reject unauthenticated request without token (401)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('RBAC Authorization (GET /api/v1/users)', () => {
    it('should forbid student role from accessing admin users endpoint (403)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow admin role to access admin users endpoint (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('total');
    });
  });

  describe('Logout (POST /api/v1/auth/logout)', () => {
    it('should revoke refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: studentRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Token Reuse Detection (POST /api/v1/auth/refresh)', () => {
    it('should detect reuse of already revoked refresh token and reject with 401', async () => {
      // studentRefreshToken was revoked in the logout test above
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: studentRefreshToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Password Change Flow (POST /api/v1/auth/change-password)', () => {
    it('should reject unauthenticated password change request (401)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword: 'Password123!',
          newPassword: 'BrandNewPass2026@',
        });

      expect(response.status).toBe(401);
    });

    it('should reject password change with incorrect current password (401)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          currentPassword: 'WrongCurrentPassword!',
          newPassword: 'BrandNewPass2026@',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Current password verification failed');
    });

    it('should reject password change when new password is identical to current (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'Password123!',
        });

      expect(response.status).toBe(400);
    });

    it('should successfully change password and invalidate active sessions', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'BrandNewPass2026@',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Password changed successfully');
    });
  });

  describe('Logout All Sessions (POST /api/v1/auth/logout-all)', () => {
    it('should revoke all active user sessions and refresh tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain(
        'All active sessions have been successfully revoked',
      );
    });
  });

  describe('Admin User Provisioning & IDOR Ownership', () => {
    it('should allow admin to provision a new driver user (POST /api/v1/users)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          email: 'driver.manjunath@college.edu',
          password: 'DriverPass2026!',
          role: UserRole.DRIVER,
          name: 'Manjunath Gowda',
          licenseNumber: 'KA-04-2018-9876543',
          phone: '+919876543222',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email', 'driver.manjunath@college.edu');
      expect(response.body.data).toHaveProperty('role', UserRole.DRIVER);
    });

    it('should forbid non-admin from creating users (POST /api/v1/users)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({
          email: 'rogue@college.edu',
          password: 'RoguePass2026!',
          role: UserRole.ADMIN,
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should prevent student from accessing another user profile (IDOR prevention)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/00000000-0000-4000-8000-000000000001')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});
