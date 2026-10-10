import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class BroadcastIncidentDto {
  @ApiProperty({ description: 'Headline title of the incident / alert' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed explanation of the incident' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Category of incident',
    example: 'DELAY',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Severity level (LOW, MEDIUM, HIGH, CRITICAL)',
    example: 'HIGH',
  })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ description: 'Target specific route (optional)' })
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiPropertyOptional({ description: 'Target specific trip (optional)' })
  @IsOptional()
  @IsUUID()
  tripId?: string;
}
