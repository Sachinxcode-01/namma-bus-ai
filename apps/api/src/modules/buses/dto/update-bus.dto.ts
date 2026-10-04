import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateBusDto {
  @ApiPropertyOptional({ example: 'BUS-01-EXP', description: 'Internal fleet bus identifier' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  busNumber?: string;

  @ApiPropertyOptional({
    example: 'KA-01-EA-1234',
    description: 'Official vehicle registration / license plate number',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 50, description: 'Seating capacity of the bus' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(150)
  capacity?: number;

  @ApiPropertyOptional({ example: false, description: 'Whether the bus is active in service' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
