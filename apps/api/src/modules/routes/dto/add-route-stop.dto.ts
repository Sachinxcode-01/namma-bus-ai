import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class AddRouteStopDto {
  @ApiProperty({
    example: 'd8c47b54-a8b7-9e19-d7d2-4268e31a196e',
    description: 'UUID of the existing stop to assign to this route',
  })
  @IsUUID('all', { message: 'stopId must be a valid UUID.' })
  @IsNotEmpty({ message: 'stopId is required.' })
  stopId!: string;

  @ApiProperty({
    example: 1,
    description: 'Ascending sequence order of the stop along the route (1-based index)',
  })
  @IsInt({ message: 'sequenceOrder must be an integer.' })
  @Min(1, { message: 'sequenceOrder must be at least 1.' })
  sequenceOrder!: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Estimated transit time in minutes from the trip starting point to this stop',
  })
  @IsOptional()
  @IsInt({ message: 'estimatedMinutesFromStart must be an integer.' })
  @Min(0, { message: 'estimatedMinutesFromStart cannot be negative.' })
  estimatedMinutesFromStart?: number;
}
