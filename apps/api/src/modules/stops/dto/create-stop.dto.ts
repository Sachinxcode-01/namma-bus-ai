import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateStopDto {
  @ApiProperty({
    example: 'Majestic Bus Stand',
    description: 'Designated name of the bus boarding/alighting stop',
  })
  @IsString()
  @IsNotEmpty({ message: 'Stop name is required.' })
  @Length(2, 100, { message: 'Stop name must be between 2 and 100 characters.' })
  name!: string;

  @ApiProperty({
    example: 'STP-MAJ',
    description: 'Unique operational identifier code for the stop',
  })
  @IsString()
  @IsNotEmpty({ message: 'Stop code is required.' })
  @Length(2, 30, { message: 'Stop code must be between 2 and 30 characters.' })
  code!: string;

  @ApiProperty({
    example: 12.9778,
    description: 'Geographic latitude coordinate (-90 to 90)',
  })
  @IsLatitude({ message: 'Latitude must be a valid coordinate between -90 and 90.' })
  latitude!: number;

  @ApiProperty({
    example: 77.5727,
    description: 'Geographic longitude coordinate (-180 to 180)',
  })
  @IsLongitude({ message: 'Longitude must be a valid coordinate between -180 and 180.' })
  longitude!: number;

  @ApiPropertyOptional({
    example: 50.0,
    description: 'Geofence radius in meters around the stop coordinates (10m - 500m)',
    default: 50.0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Geofence radius must be a number.' })
  @Min(10, { message: 'Geofence radius must be at least 10 meters.' })
  @Max(500, { message: 'Geofence radius cannot exceed 500 meters.' })
  geofenceRadiusMeters?: number;
}
