import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusOperationalStatus, GpsAccuracyQuality } from '../constants/gps.constants';

export class LiveBusStateDto {
  @ApiProperty({ example: 'bus-uuid-1', description: 'Bus UUID' })
  busId!: string;

  @ApiPropertyOptional({ example: 'KA-01-F-1001', description: 'Fleet bus vehicle number' })
  busNumber?: string;

  @ApiPropertyOptional({ example: 'trip-uuid-1', description: 'Active trip UUID' })
  tripId?: string;

  @ApiPropertyOptional({ example: 'route-uuid-1', description: 'Assigned route UUID' })
  routeId?: string;

  @ApiPropertyOptional({ example: 'R-01', description: 'Route display code' })
  routeCode?: string;

  @ApiPropertyOptional({ example: 'Hebbal to Majestic', description: 'Route display name' })
  routeName?: string;

  @ApiPropertyOptional({ example: 'driver-uuid-1', description: 'Driver profile UUID' })
  driverId?: string;

  @ApiPropertyOptional({ example: 'Suresh Kumar', description: 'Driver full name' })
  driverName?: string;

  @ApiProperty({
    enum: BusOperationalStatus,
    example: BusOperationalStatus.LIVE,
    description: 'Current authoritative operational status',
  })
  status!: BusOperationalStatus;

  @ApiProperty({
    example: false,
    description: 'True if last location update exceeds staleness threshold',
  })
  isStale!: boolean;

  @ApiPropertyOptional({ example: 12.9716, description: 'Current latitude (-90 to 90)' })
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946, description: 'Current longitude (-180 to 180)' })
  longitude?: number;

  @ApiPropertyOptional({ example: 34.5, description: 'Speed in km/h' })
  speed?: number | null;

  @ApiPropertyOptional({ example: 85.0, description: 'Compass heading in degrees' })
  heading?: number | null;

  @ApiPropertyOptional({ example: 5.2, description: 'GPS horizontal accuracy radius in meters' })
  accuracy?: number | null;

  @ApiProperty({
    enum: GpsAccuracyQuality,
    example: GpsAccuracyQuality.EXCELLENT,
    description: 'GPS telemetry quality category',
  })
  accuracyQuality!: GpsAccuracyQuality;

  @ApiPropertyOptional({
    example: '2026-10-08T13:30:15.000Z',
    description: 'Device timestamp when GPS reading was captured',
  })
  recordedAt?: string;

  @ApiPropertyOptional({
    example: '2026-10-08T13:30:16.120Z',
    description: 'Server timestamp when location was received and accepted',
  })
  receivedAt?: string;

  @ApiPropertyOptional({ example: 4, description: 'Age of last accepted reading in seconds' })
  ageSeconds?: number;
}
