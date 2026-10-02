/* eslint-disable @typescript-eslint/no-explicit-any */
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

describe('Transport Management (e2e)', () => {
  let app: INestApplication;
  let passwordHasher: PasswordHasherService;

  const usersDb: Record<string, any> = {};
  const busesDb: Record<string, any> = {};
  const stopsDb: Record<string, any> = {};
  const routesDb: Record<string, any> = {};
  const routeStopsDb: Record<string, any> = {};
  const driversDb: Record<string, any> = {};
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
      updateMany: jest.fn(async ({ where, data }) => {
        if (where.tokenHash && refreshTokensDb[where.tokenHash]) {
          refreshTokensDb[where.tokenHash].revokedAt = data.revokedAt;
        }
        return { count: 1 };
      }),
    },
    bus: {
      findMany: jest.fn(async () => Object.values(busesDb)),
      count: jest.fn(async () => Object.keys(busesDb).length),
      findUnique: jest.fn(async ({ where }) => {
        if (where.id) return busesDb[where.id] || null;
        if (where.busNumber)
          return Object.values(busesDb).find((b: any) => b.busNumber === where.busNumber) || null;
        if (where.registrationNumber)
          return (
            Object.values(busesDb).find(
              (b: any) => b.registrationNumber === where.registrationNumber,
            ) || null
          );
        return null;
      }),
      create: jest.fn(async ({ data }) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        busesDb[id] = record;
        return record;
      }),
      update: jest.fn(async ({ where, data }) => {
        if (busesDb[where.id]) {
          busesDb[where.id] = { ...busesDb[where.id], ...data };
          return busesDb[where.id];
        }
        return null;
      }),
      delete: jest.fn(async ({ where }) => {
        const deleted = busesDb[where.id];
        delete busesDb[where.id];
        return deleted;
      }),
    },
    stop: {
      findMany: jest.fn(async () => Object.values(stopsDb)),
      count: jest.fn(async () => Object.keys(stopsDb).length),
      findUnique: jest.fn(async ({ where }) => {
        if (where.id) {
          const s = stopsDb[where.id];
          if (!s) return null;
          const assigned = Object.values(routeStopsDb).filter((rs: any) => rs.stopId === s.id);
          return { ...s, routeStops: assigned };
        }
        if (where.code)
          return Object.values(stopsDb).find((s: any) => s.code === where.code) || null;
        return null;
      }),
      create: jest.fn(async ({ data }) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        stopsDb[id] = record;
        return record;
      }),
      update: jest.fn(async ({ where, data }) => {
        if (stopsDb[where.id]) {
          stopsDb[where.id] = { ...stopsDb[where.id], ...data };
          return stopsDb[where.id];
        }
        return null;
      }),
      delete: jest.fn(async ({ where }) => {
        const deleted = stopsDb[where.id];
        delete stopsDb[where.id];
        return deleted;
      }),
    },
    route: {
      findMany: jest.fn(async () => Object.values(routesDb)),
      count: jest.fn(async () => Object.keys(routesDb).length),
      findUnique: jest.fn(async ({ where }) => {
        if (where.id) {
          const r = routesDb[where.id];
          if (!r) return null;
          const assigned = Object.values(routeStopsDb)
            .filter((rs: any) => rs.routeId === r.id)
            .map((rs: any) => ({ ...rs, stop: stopsDb[rs.stopId] }))
            .sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder);
          return { ...r, routeStops: assigned };
        }
        if (where.code)
          return Object.values(routesDb).find((r: any) => r.code === where.code) || null;
        return null;
      }),
      create: jest.fn(async ({ data }) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        routesDb[id] = record;
        return record;
      }),
      update: jest.fn(async ({ where, data }) => {
        if (routesDb[where.id]) {
          routesDb[where.id] = { ...routesDb[where.id], ...data };
          return routesDb[where.id];
        }
        return null;
      }),
      delete: jest.fn(async ({ where }) => {
        const deleted = routesDb[where.id];
        delete routesDb[where.id];
        return deleted;
      }),
    },
    routeStop: {
      create: jest.fn(async ({ data }) => {
        const id = randomUUID();
        const record = { id, ...data, createdAt: new Date(), stop: stopsDb[data.stopId] };
        routeStopsDb[id] = record;
        return record;
      }),
      createMany: jest.fn(async ({ data }) => {
        data.forEach((item: any) => {
          const id = randomUUID();
          routeStopsDb[id] = { id, ...item, createdAt: new Date(), stop: stopsDb[item.stopId] };
        });
        return { count: data.length };
      }),
      delete: jest.fn(async ({ where }) => {
        const key = Object.keys(routeStopsDb).find(
          (k) =>
            routeStopsDb[k].routeId === where.routeId_stopId.routeId &&
            routeStopsDb[k].stopId === where.routeId_stopId.stopId,
        );
        if (key) delete routeStopsDb[key];
        return { count: 1 };
      }),
      deleteMany: jest.fn(async ({ where }) => {
        Object.keys(routeStopsDb).forEach((k) => {
          if (routeStopsDb[k].routeId === where.routeId) delete routeStopsDb[k];
        });
        return { count: 1 };
      }),
    },
    driver: {
      findMany: jest.fn(async () =>
        Object.values(driversDb).map((d: any) => ({ ...d, user: usersDb[d.userId] })),
      ),
      count: jest.fn(async () => Object.keys(driversDb).length),
      findUnique: jest.fn(async ({ where }) => {
        if (where.id) {
          const d = driversDb[where.id];
          return d ? { ...d, user: usersDb[d.userId] } : null;
        }
        if (where.licenseNumber) {
          return (
            Object.values(driversDb).find((d: any) => d.licenseNumber === where.licenseNumber) ||
            null
          );
        }
        return null;
      }),
      update: jest.fn(async ({ where, data }) => {
        if (driversDb[where.id]) {
          driversDb[where.id] = { ...driversDb[where.id], ...data };
          return { ...driversDb[where.id], user: usersDb[driversDb[where.id].userId] };
        }
        return null;
      }),
    },
    $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
  };

  let adminToken = '';
  let studentToken = '';

  const seededDriverId = randomUUID();
  const driverUserId = randomUUID();

  beforeAll(async () => {
    passwordHasher = new PasswordHasherService();

    // Seed Admin User
    const adminPassHash = await passwordHasher.hash('AdminPass123!');
    const adminUserId = randomUUID();
    usersDb[adminUserId] = {
      id: adminUserId,
      email: 'admin.transport@college.edu',
      passwordHash: adminPassHash,
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      student: null,
      driver: null,
    };

    // Seed Student User
    const studentPassHash = await passwordHasher.hash('StudentPass123!');
    const studentUserId = randomUUID();
    usersDb[studentUserId] = {
      id: studentUserId,
      email: 'student.transport@college.edu',
      passwordHash: studentPassHash,
      role: UserRole.STUDENT,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      student: { id: randomUUID(), usn: '1MS21CS001', name: 'Student One', phone: null },
      driver: null,
    };

    // Seed Driver
    driversDb[seededDriverId] = {
      id: seededDriverId,
      userId: driverUserId,
      licenseNumber: 'KA0420190012345',
      name: 'Manjunath G',
      phone: '+919845012345',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersDb[driverUserId] = {
      id: driverUserId,
      email: 'driver.manjunath@college.edu',
      passwordHash: 'hash',
      role: UserRole.DRIVER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      student: null,
      driver: driversDb[seededDriverId],
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

    // Login Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.transport@college.edu', password: 'AdminPass123!' });
    adminToken = adminLoginRes.body.data.accessToken;

    // Login Student
    const studentLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'student.transport@college.edu', password: 'StudentPass123!' });
    studentToken = studentLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  let createdBusId = '';
  let createdStop1Id = '';
  let createdStop2Id = '';
  let createdRouteId = '';

  describe('Buses Management (/api/v1/buses)', () => {
    it('should create a new bus as Admin (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/buses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          busNumber: 'BUS-101',
          registrationNumber: 'KA-04-AB-1234',
          capacity: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.busNumber).toBe('BUS-101');
      createdBusId = res.body.data.id;
    });

    it('should reject bus creation as Student (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/buses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          busNumber: 'BUS-102',
          registrationNumber: 'KA-04-AB-5678',
          capacity: 40,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject duplicate bus number (409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/buses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          busNumber: 'BUS-101',
          registrationNumber: 'KA-04-AB-9999',
          capacity: 45,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should list buses for authenticated users (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/buses')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should get bus details by ID (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/buses/${createdBusId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdBusId);
    });

    it('should update bus details as Admin (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/buses/${createdBusId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ capacity: 55 });

      expect(res.status).toBe(200);
      expect(res.body.data.capacity).toBe(55);
    });
  });

  describe('Stops Management (/api/v1/stops)', () => {
    it('should create valid geofenced stops (201)', async () => {
      const stop1 = await request(app.getHttpServer())
        .post('/api/v1/stops')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Majestic Bus Stand',
          code: 'STP-MAJ',
          latitude: 12.9778,
          longitude: 77.5727,
          geofenceRadiusMeters: 50.0,
        });

      expect(stop1.status).toBe(201);
      createdStop1Id = stop1.body.data.id;

      const stop2 = await request(app.getHttpServer())
        .post('/api/v1/stops')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Yeshwanthpur Junction',
          code: 'STP-YPR',
          latitude: 13.0238,
          longitude: 77.5503,
          geofenceRadiusMeters: 60.0,
        });

      expect(stop2.status).toBe(201);
      createdStop2Id = stop2.body.data.id;
    });

    it('should reject invalid coordinates outside [-90..90, -180..180] (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/stops')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Stop',
          code: 'STP-INV',
          latitude: 95.0,
          longitude: 77.5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should list stops (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stops')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Routes & Sequenced Stops (/api/v1/routes)', () => {
    it('should create a transit route (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Campus Route 1',
          code: 'R-101',
          description: 'Route servicing North Bangalore',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('R-101');
      createdRouteId = res.body.data.id;
    });

    it('should assign stops with sequence order to route (201)', async () => {
      const res1 = await request(app.getHttpServer())
        .post(`/api/v1/routes/${createdRouteId}/stops`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stopId: createdStop1Id,
          sequenceOrder: 1,
          estimatedMinutesFromStart: 0,
        });
      expect(res1.status).toBe(201);

      const res2 = await request(app.getHttpServer())
        .post(`/api/v1/routes/${createdRouteId}/stops`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stopId: createdStop2Id,
          sequenceOrder: 2,
          estimatedMinutesFromStart: 25,
        });
      expect(res2.status).toBe(201);
    });

    it('should reject assigning duplicate stop to the same route (409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/routes/${createdRouteId}/stops`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stopId: createdStop1Id,
          sequenceOrder: 3,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return sequenced route stops (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/routes/${createdRouteId}/stops`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].sequenceOrder).toBe(1);
      expect(res.body.data[1].sequenceOrder).toBe(2);
    });

    it('should reorder route stops transactionally (200)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/routes/${createdRouteId}/stops/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stops: [
            { stopId: createdStop2Id, sequenceOrder: 1, estimatedMinutesFromStart: 0 },
            { stopId: createdStop1Id, sequenceOrder: 2, estimatedMinutesFromStart: 25 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.routeStops[0].stopId).toBe(createdStop2Id);
      expect(res.body.data.routeStops[1].stopId).toBe(createdStop1Id);
    });
  });

  describe('Drivers Management (/api/v1/drivers)', () => {
    it('should list registered drivers (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/drivers')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should update driver details as Admin (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/drivers/${seededDriverId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Manjunath Gowda Senior' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Manjunath Gowda Senior');
    });
  });
});
