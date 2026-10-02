import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterStudentDto {
  @ApiProperty({
    example: 'rahul.sharma@college.edu',
    description: 'Student institutional or personal email address',
  })
  @IsEmail({}, { message: 'A valid email address is required.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;

  @ApiProperty({
    example: 'StudentPass123!',
    description: 'Password (minimum 8 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;

  @ApiProperty({
    example: 'Rahul Sharma',
    description: 'Full name of the student',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required.' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters.' })
  name!: string;

  @ApiProperty({
    example: '1MS21CS001',
    description: 'University Seat Number (USN) or student identification code',
  })
  @IsString()
  @IsNotEmpty({ message: 'USN is required.' })
  @Length(3, 30, { message: 'USN must be between 3 and 30 characters.' })
  usn!: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description: 'Contact phone number',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Phone number must be a valid international or E.164 phone format.',
  })
  phone?: string;
}
