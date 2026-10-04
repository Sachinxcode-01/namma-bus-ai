import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDriverDto {
  @ApiPropertyOptional({ example: 'Suresh Kumar', description: 'Driver full name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'KA-01-2020-0012345',
    description: 'Commercial driving license number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  licenseNumber?: string;
}
