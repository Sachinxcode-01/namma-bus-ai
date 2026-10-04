import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateTripDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Unique UUID of the fleet bus assigned to this trip',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'busId must be a valid UUID' })
  busId!: string;

  @ApiProperty({
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    description: 'Unique UUID of the driver assigned to operate this trip',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'driverId must be a valid UUID' })
  driverId!: string;

  @ApiProperty({
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    description: 'Unique UUID of the route this trip traverses',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'routeId must be a valid UUID' })
  routeId!: string;

  @ApiPropertyOptional({
    example: '2026-10-04T08:00:00.000Z',
    description: 'Optional scheduled start time in ISO 8601 format',
  })
  @IsOptional()
  @IsDateString({}, { message: 'scheduledStartTime must be a valid ISO 8601 date string' })
  scheduledStartTime?: string;
}
