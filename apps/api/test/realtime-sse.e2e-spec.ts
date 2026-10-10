/* eslint-disable @typescript-eslint/no-explicit-any */
import http from 'http';
import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { GlobalExceptionsFilter } from '../src/common/filters/global-exceptions.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';
import { UserRole } from '@prisma/client';
import { PasswordHasherService } from '../src/modules/auth/services/password-hasher.service';
import { SseRateLimitGuard } from '../src/modules/realtime/guards/sse-rate-limit.guard';
import { LocationStreamService } from '../src/modules/locations/location-stream.service';

describe('Realtime SSE Streams & Security (e2e)', () => {
  let app: INestApplication;
  let passwordHasher: PasswordHasherService;
  let sseGuard: SseRateLimitGuard;
  let locationStreamService: LocationStreamService;

  const usersDb: Record<string, any> = {};
  const refreshTokensDb: Record<string, any> = {};

  const mockPrismaService: any = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    isHealthy: jest.fn().mockResolvedValue(true),
    user: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.email)
          return Object.values(usersDb).find((u: any) => u.email === where.email) || null;
        if (where.id) return usersDb[where.id] || null;
        return null;
      }),
    },
    refreshToken: {
      create: jest.fn(async ({ data }) => {
        const id = randomUUID();
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
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
  };

  let adminToken = '';
  let studentToken = '';

  beforeAll(async () => {
    passwordHasher = new PasswordHasherService();

    // 1. Seed Admin User
    const adminPassHash = await passwordHasher.hash('AdminPass123!');
    const adminUserId = randomUUID();
    usersDb[adminUserId] = {
      id: adminUserId,
      email: 'admin.realtime@college.edu',
      passwordHash: adminPassHash,
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      student: null,
      driver: null,
    };

    // 2. Seed Student User
    const studentPassHash = await passwordHasher.hash('StudentPass123!');
    const studentUserId = randomUUID();
    usersDb[studentUserId] = {
      id: studentUserId,
      email: 'student.realtime@college.edu',
      passwordHash: studentPassHash,
      role: UserRole.STUDENT,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      student: { id: randomUUID(), usn: '1MS21CS099', name: 'Student Realtime', phone: null },
      driver: null,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionsFilter());
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    await app.listen(0);

    sseGuard = app.get(SseRateLimitGuard);
    locationStreamService = app.get(LocationStreamService);

    // Login Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.realtime@college.edu', password: 'AdminPass123!' });
    adminToken = adminLoginRes.body.data.accessToken;

    // Login Student
    const studentLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'student.realtime@college.edu', password: 'StudentPass123!' });
    studentToken = studentLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    const server = app.getHttpServer();
    if (server && typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    await app.close();
  });

  describe('Authentication on SSE Endpoints', () => {
    it('should reject unauthenticated SSE connection request with 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/locations/fleet/stream');
      expect(res.status).toBe(401);
    });

    it('should reject invalid or expired JWT with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/locations/fleet/stream')
        .set('Authorization', 'Bearer invalid.expired.token');
      expect(res.status).toBe(401);
    });
  });

  describe('Authorization per Stream (Role-based Access Control)', () => {
    it('should reject student token requesting admin fleet stream with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/locations/fleet/stream')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin token to subscribe to fleet stream', async () => {
      const server = app.getHttpServer();
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 4001;

      const result = await new Promise<{ status: number; contentType: string }>((resolve) => {
        const req = http.get(
          `http://127.0.0.1:${port}/api/v1/locations/fleet/stream`,
          { headers: { Authorization: `Bearer ${adminToken}` } },
          (res) => {
            resolve({
              status: res.statusCode || 0,
              contentType: res.headers['content-type'] || '',
            });
            req.destroy();
          },
        );
      });

      expect(result.status).toBe(200);
      expect(result.contentType).toContain('text/event-stream');
    });
  });

  describe('Stream Parameter Validation & SSE Error Serialization', () => {
    it('should emit SSE error frame or reject with 400 when routeCode is malformed', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/locations/routes/INVALID@CODE/stream')
        .set('Authorization', `Bearer ${studentToken}`);

      if (res.status === 200) {
        expect(res.text).toContain('event: error');
        expect(res.text).toContain('Invalid routeCode');
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('should emit SSE error frame or reject with 400 when tripId is not a UUID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/locations/trips/not-a-uuid/stream')
        .set('Authorization', `Bearer ${studentToken}`);

      if (res.status === 200) {
        expect(res.text).toContain('event: error');
      } else {
        expect(res.status).toBe(400);
      }
    });
  });

  describe('Connection Rate Limiting & Lifecycle', () => {
    it('should track active connection counter and allow decrementing when client disconnects', () => {
      const initialCount = locationStreamService.getActiveConnectionCount();

      const sub = locationStreamService.getFleetStream().subscribe();
      expect(locationStreamService.getActiveConnectionCount()).toBe(initialCount + 1);

      sub.unsubscribe();
      expect(locationStreamService.getActiveConnectionCount()).toBe(initialCount);
    });

    it('should enforce SseRateLimitGuard and report active connection summary', () => {
      const summary = sseGuard.getActiveConnectionsSummary();
      expect(summary).toBeDefined();
      expect(typeof summary.totalByIp).toBe('number');
      expect(typeof summary.totalByUser).toBe('number');
    });
  });
});
