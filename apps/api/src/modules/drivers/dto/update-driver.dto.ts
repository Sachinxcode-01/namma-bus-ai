import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateDriverDto {
  @ApiPropertyOptional({ example: 'Manjunath Gowda' })
  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters.' })
  name?: string;

  @ApiPropertyOptional({ example: 'KA0420190099999' })
  @IsOptional()
  @IsString()
  @Length(5, 50, { message: 'License number must be between 5 and 50 characters.' })
  licenseNumber?: string;

  @ApiPropertyOptional({ example: '+919845012999' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Phone number must be a valid international or E.164 phone format.',
  })
  phone?: string;
}
