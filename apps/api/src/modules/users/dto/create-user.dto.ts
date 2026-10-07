import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'staff.admin@college.edu', description: 'User login email' })
  @IsEmail({}, { message: 'A valid email address is required.' })
  email: string;

  @ApiProperty({
    example: 'StaffSecure2026!',
    description: 'Initial account password (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.ADMIN,
    description: 'System role assigned to user',
  })
  @IsEnum(UserRole, { message: 'Role must be STUDENT, DRIVER, or ADMIN.' })
  role: UserRole;

  @ApiPropertyOptional({ example: 'Prof. Ramesh Rao', description: 'Full user name' })
  @IsString()
  @IsNotEmpty({ message: 'Name cannot be empty when provided.' })
  @ValidateIf((o) => o.role === UserRole.STUDENT || o.role === UserRole.DRIVER)
  name?: string;

  @ApiPropertyOptional({
    example: '1MS21CS099',
    description: 'Student USN (required if role is STUDENT)',
  })
  @IsString()
  @ValidateIf((o) => o.role === UserRole.STUDENT)
  usn?: string;

  @ApiPropertyOptional({
    example: 'KA-01-2015-1234567',
    description: 'Driver license number (required if role is DRIVER)',
  })
  @IsString()
  @ValidateIf((o) => o.role === UserRole.DRIVER)
  licenseNumber?: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;
}
