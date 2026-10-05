import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class IngestLocationDto {
  @ApiProperty({
    example: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    description: 'Unique UUID of the active trip',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'tripId must be a valid UUID' })
  tripId!: string;

  @ApiProperty({
    example: 12.9716,
    description: 'Current latitude in decimal degrees (-90 to 90)',
  })
  @Type(() => Number)
  @IsLatitude({ message: 'latitude must be a valid coordinate between -90 and 90' })
  latitude!: number;

  @ApiProperty({
    example: 77.5946,
    description: 'Current longitude in decimal degrees (-180 to 180)',
  })
  @Type(() => Number)
  @IsLongitude({ message: 'longitude must be a valid coordinate between -180 and 180' })
  longitude!: number;

  @ApiPropertyOptional({
    example: 35.5,
    description: 'Vehicle instantaneous speed in km/h (optional, must be >= 0)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'speed must be greater than or equal to 0' })
  @Max(150, { message: 'speed cannot exceed 150 km/h' })
  speed?: number;

  @ApiPropertyOptional({
    example: 85.0,
    description: 'Compass heading/bearing in degrees (0 to 360)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'heading must be greater than or equal to 0' })
  @Max(360, { message: 'heading cannot exceed 360 degrees' })
  heading?: number;

  @ApiPropertyOptional({
    example: 8.5,
    description: 'GPS horizontal accuracy in meters (optional, >= 0)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'accuracy must be non-negative' })
  accuracy?: number;

  @ApiProperty({
    example: '2026-10-04T08:30:15.000Z',
    description: 'Device capture timestamp in ISO 8601 format',
  })
  @IsNotEmpty()
  @IsDateString({}, { message: 'timestamp must be a valid ISO 8601 date string' })
  timestamp!: string;
}
