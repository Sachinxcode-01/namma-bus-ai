import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { GlobalExceptionsFilter } from '../src/common/filters/global-exceptions.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response-transform.interceptor';
import { REQUEST_ID_HEADER } from '../src/common/constants';

describe('Request ID & Correlation (e2e)', () => {
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
    app.useGlobalFilters(new GlobalExceptionsFilter());
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should auto-generate X-Request-ID header when not provided by client', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers[REQUEST_ID_HEADER]).toBeDefined();
    expect(response.headers[REQUEST_ID_HEADER].startsWith('req_')).toBe(true);
  });

  it('should propagate client-provided X-Request-ID header', async () => {
    const customRequestId = 'test-client-correlation-id-999';

    const response = await request(app.getHttpServer())
      .get('/health')
      .set(REQUEST_ID_HEADER, customRequestId);

    expect(response.status).toBe(200);
    expect(response.headers[REQUEST_ID_HEADER]).toBe(customRequestId);
  });
});
