import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'student@college.edu',
    description: 'Registered user email address',
  })
  @IsEmail({}, { message: 'A valid email address is required.' })
  @IsNotEmpty({ message: 'Email must not be empty.' })
  email!: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User plaintext password (minimum 8 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password must not be empty.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;
}
