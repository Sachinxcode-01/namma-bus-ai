import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStopDto {
  @ApiProperty({
    example: 'Hebbal Flyover Stop',
    description: 'Designated name of the student bus stop',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'STP-HEB-01', description: 'Unique human-readable stop code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 13.0358, description: 'Latitude coordinate in decimal degrees' })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 77.597, description: 'Longitude coordinate in decimal degrees' })
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({
    example: 50.0,
    default: 50.0,
    description: 'Geofence arrival detection radius in meters (10m - 1000m)',
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  geofenceRadiusMeters?: number = 50.0;
}
