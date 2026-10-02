import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateBusDto {
  @ApiProperty({
    example: 'BUS-101',
    description: 'Internal college bus identification number or identifier',
  })
  @IsString()
  @IsNotEmpty({ message: 'Bus number is required.' })
  @Length(2, 30, { message: 'Bus number must be between 2 and 30 characters.' })
  busNumber!: string;

  @ApiProperty({
    example: 'KA-04-AB-1234',
    description: 'Government motor vehicle registration number',
  })
  @IsString()
  @IsNotEmpty({ message: 'Registration number is required.' })
  @Length(4, 30, { message: 'Registration number must be between 4 and 30 characters.' })
  registrationNumber!: string;

  @ApiProperty({
    example: 45,
    description: 'Passenger seating capacity of the bus',
  })
  @IsInt({ message: 'Capacity must be an integer.' })
  @Min(5, { message: 'Capacity must be at least 5.' })
  @Max(120, { message: 'Capacity cannot exceed 120.' })
  capacity!: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Operational active status of the bus',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
