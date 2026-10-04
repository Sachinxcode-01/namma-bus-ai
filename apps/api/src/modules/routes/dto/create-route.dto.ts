import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({
    example: 'Hebbal to College Campus',
    description: 'Designated display name for the transport route',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'R-12', description: 'Unique operational route code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({
    example: 'Morning and evening commuter route connecting North Bangalore to campus',
    description: 'Detailed description of the route alignment',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether the route is actively serviced',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
