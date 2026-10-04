import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBusDto {
  @ApiProperty({ example: 'BUS-01', description: 'Internal fleet bus identifier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  busNumber!: string;

  @ApiProperty({
    example: 'KA-01-EA-1234',
    description: 'Official vehicle registration / license plate number',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  registrationNumber!: string;

  @ApiProperty({ example: 45, description: 'Seating capacity of the bus' })
  @IsInt()
  @Min(1)
  @Max(150)
  capacity!: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether the bus is active in service',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
