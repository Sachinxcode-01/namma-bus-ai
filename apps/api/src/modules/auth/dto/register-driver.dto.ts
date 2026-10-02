import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterDriverDto {
  @ApiProperty({
    example: 'driver.manjunath@college.edu',
    description: 'Driver email address',
  })
  @IsEmail({}, { message: 'A valid email address is required.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;

  @ApiProperty({
    example: 'DriverPass123!',
    description: 'Password (minimum 8 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;

  @ApiProperty({
    example: 'Manjunath Gowda',
    description: 'Full name of the driver',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required.' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters.' })
  name!: string;

  @ApiProperty({
    example: 'KA0420190012345',
    description: 'Commercial driving license number',
  })
  @IsString()
  @IsNotEmpty({ message: 'License number is required.' })
  @Length(5, 50, { message: 'License number must be between 5 and 50 characters.' })
  licenseNumber!: string;

  @ApiProperty({
    example: '+919845012345',
    description: 'Active mobile phone number for communication',
  })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required.' })
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Phone number must be a valid international or E.164 phone format.',
  })
  phone!: string;
}
