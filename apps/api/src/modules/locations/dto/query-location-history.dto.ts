import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryLocationHistoryDto {
  @ApiPropertyOptional({
    example: 100,
    default: 100,
    description: 'Maximum number of location records to return (max 1000)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @ApiPropertyOptional({
    example: '2026-10-04T08:00:00.000Z',
    description: 'Fetch locations recorded after this ISO 8601 timestamp',
  })
  @IsOptional()
  @IsDateString({}, { message: 'since must be a valid ISO 8601 date string' })
  since?: string;
}
