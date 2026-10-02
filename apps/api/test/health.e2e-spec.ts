import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { GlobalExceptionsFilter } from '../src/common/filters/global-exceptions.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';

describe('Health & Observability (e2e)', () => {
  let app: INestApplication;
  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    isHealthy: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nammabus_test';
    process.env.JWT_ACCESS_SECRET = 'test-secret-at-least-16-characters-long';
    process.env.JWT_REFRESH_SECRET = 'test-secret-at-least-16-characters-long';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionsFilter());
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 OK and liveness status', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'ok');
      expect(response.body.data).toHaveProperty('version', '1.0.0');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 OK and readiness status with database check', async () => {
      mockPrismaService.isHealthy.mockResolvedValueOnce(true);

      const response = await request(app.getHttpServer()).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'ok');
      expect(response.body.data.checks.database.status).toBe('up');
    });

    it('should return 503 SERVICE_UNAVAILABLE when database is down', async () => {
      mockPrismaService.isHealthy.mockResolvedValueOnce(false);

      const response = await request(app.getHttpServer()).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'SERVICE_UNAVAILABLE');
      expect(response.body.error).toHaveProperty('requestId');
    });
  });
});
