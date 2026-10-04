import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRouteDto {
  @ApiPropertyOptional({
    example: 'Hebbal to College Campus Express',
    description: 'Designated display name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'R-12-EXP', description: 'Unique operational route code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({
    example: 'Updated stops and timing schedule',
    description: 'Route description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: false, description: 'Whether the route is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
