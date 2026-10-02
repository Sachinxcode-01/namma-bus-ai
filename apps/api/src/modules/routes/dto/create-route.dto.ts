import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({
    example: 'Campus to Majestic Express',
    description: 'Designated name or title of the bus route',
  })
  @IsString()
  @IsNotEmpty({ message: 'Route name is required.' })
  @Length(3, 100, { message: 'Route name must be between 3 and 100 characters.' })
  name!: string;

  @ApiProperty({
    example: 'R-101',
    description: 'Unique operational identifier code for the route',
  })
  @IsString()
  @IsNotEmpty({ message: 'Route code is required.' })
  @Length(2, 30, { message: 'Route code must be between 2 and 30 characters.' })
  code!: string;

  @ApiPropertyOptional({
    example: 'Morning transit route servicing students between Majestic and Campus',
    description: 'Detailed description of route path and timings',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Active status of the route',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
