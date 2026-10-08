import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class QueryEtaDto {
  @ApiPropertyOptional({
    description:
      'Optional Stop ID to focus arrival prediction for a specific stop along the route.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID('4', { message: 'stopId must be a valid UUIDv4 identifier.' })
  stopId?: string;
}
