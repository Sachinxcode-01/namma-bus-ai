import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { GlobalExceptionsFilter } from '../src/common/filters/global-exceptions.filter';
import { API_PREFIX } from '../src/common/constants';

describe('Error Handling & Standard Contract (e2e)', () => {
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
    app.setGlobalPrefix(API_PREFIX, {
      exclude: [
        { path: 'health', method: RequestMethod.GET },
        { path: 'health/ready', method: RequestMethod.GET },
      ],
    });
    app.useGlobalFilters(new GlobalExceptionsFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return standard error response for 404 Not Found route', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/non-existent-resource');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          requestId: expect.any(String),
        }),
      }),
    );
  });
});
