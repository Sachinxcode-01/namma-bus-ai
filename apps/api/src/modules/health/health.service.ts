import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HealthCheckResponseDto, ReadinessCheckResponseDto } from './dto/health-response.dto';
import { AppException } from '../../common/errors/app.exception';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getLiveness(): HealthCheckResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    };
  }

  async getReadiness(): Promise<ReadinessCheckResponseDto> {
    const isDbHealthy = await this.prisma.isHealthy();

    const result: ReadinessCheckResponseDto = {
      status: isDbHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: isDbHealthy ? 'up' : 'down',
        },
      },
    };

    if (!isDbHealthy) {
      throw new AppException(
        'SERVICE_UNAVAILABLE',
        'Database connection is down or degraded.',
        HttpStatus.SERVICE_UNAVAILABLE,
        result.checks,
      );
    }

    return result;
  }
}
