import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/errors/app.exception';

describe('HealthService', () => {
  let service: HealthService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      isHealthy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prismaService = module.get(PrismaService);
  });

  describe('getLiveness', () => {
    it('should return status ok and system metrics', () => {
      const result = service.getLiveness();

      expect(result.status).toBe('ok');
      expect(result.version).toBe('1.0.0');
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('getReadiness', () => {
    it('should return ok when database is healthy', async () => {
      prismaService.isHealthy.mockResolvedValue(true);

      const result = await service.getReadiness();

      expect(result.status).toBe('ok');
      expect(result.checks.database.status).toBe('up');
    });

    it('should throw AppException with SERVICE_UNAVAILABLE when database is down', async () => {
      prismaService.isHealthy.mockResolvedValue(false);

      await expect(service.getReadiness()).rejects.toThrow(AppException);
    });
  });
});
