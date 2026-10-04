import { ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryTripsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: TripStatus,
    description: 'Filter trips by operational status (SCHEDULED, ACTIVE, COMPLETED, CANCELLED)',
  })
  @IsOptional()
  @IsEnum(TripStatus, { message: 'status must be a valid TripStatus value' })
  status?: TripStatus;

  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Filter trips by assigned bus UUID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'busId must be a valid UUID' })
  busId?: string;

  @ApiPropertyOptional({
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    description: 'Filter trips by assigned driver UUID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'driverId must be a valid UUID' })
  driverId?: string;

  @ApiPropertyOptional({
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    description: 'Filter trips by route UUID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'routeId must be a valid UUID' })
  routeId?: string;

  @ApiPropertyOptional({
    example: '2026-10-04',
    description: 'Filter trips scheduled or created on a specific calendar date (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;
}
