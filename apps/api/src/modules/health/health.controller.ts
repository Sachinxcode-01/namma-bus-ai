import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthCheckResponseDto, ReadinessCheckResponseDto } from './dto/health-response.dto';
import { ApiErrorResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Health & Observability')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe to verify the application process is running' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application is alive and responding',
    type: HealthCheckResponseDto,
  })
  getLiveness(): HealthCheckResponseDto {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness probe to verify database and external dependency health' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All system dependencies are healthy',
    type: ReadinessCheckResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'One or more system dependencies are degraded or down',
    type: ApiErrorResponseDto,
  })
  async getReadiness(): Promise<ReadinessCheckResponseDto> {
    return this.healthService.getReadiness();
  }
}
