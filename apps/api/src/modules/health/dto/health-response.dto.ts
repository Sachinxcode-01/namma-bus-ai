import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  status!: string;

  @ApiProperty({ example: '2026-10-02T13:50:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: 42.5, description: 'Uptime in seconds' })
  uptime!: number;

  @ApiProperty({ example: '1.0.0' })
  version!: string;
}

export class ReadinessCheckResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'error'] })
  status!: string;

  @ApiProperty({ example: '2026-10-02T13:50:00.000Z' })
  timestamp!: string;

  @ApiProperty({
    example: {
      database: { status: 'up' },
    },
  })
  checks!: {
    database: { status: 'up' | 'down' };
  };
}
