import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateStopDto {
  @ApiPropertyOptional({
    example: 'Hebbal Central Stop',
    description: 'Designated name of the student bus stop',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'STP-HEB-01', description: 'Unique human-readable stop code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: 13.0358, description: 'Latitude coordinate in decimal degrees' })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 77.597, description: 'Longitude coordinate in decimal degrees' })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({
    example: 60.0,
    description: 'Geofence arrival detection radius in meters (10m - 1000m)',
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  geofenceRadiusMeters?: number;
}
