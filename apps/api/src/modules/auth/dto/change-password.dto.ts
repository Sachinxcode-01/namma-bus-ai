import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'CurrentStrongPass123!',
    description: 'Current active account password',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Current password must be at least 8 characters long.' })
  currentPassword: string;

  @ApiProperty({
    example: 'NewSecurePass2026@',
    description:
      'New password (min 8 chars, including uppercase, lowercase, digit, and special symbol)',
    minLength: 8,
    maxLength: 64,
  })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  @MaxLength(64, { message: 'New password cannot exceed 64 characters.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/, {
    message:
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&_-#).',
  })
  newPassword: string;
}
