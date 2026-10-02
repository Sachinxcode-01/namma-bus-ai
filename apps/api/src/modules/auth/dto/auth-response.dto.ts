import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserProfileDto {
  @ApiProperty({ example: 'b819fbf0-0220-410a-8bf7-df43cebf83a9' })
  id!: string;

  @ApiProperty({ example: 'student@college.edu' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.STUDENT })
  role!: UserRole;

  @ApiPropertyOptional({ example: 'd05e2197-0f81-42ec-a05e-cebe40a2bb19' })
  studentId?: string;

  @ApiPropertyOptional({ example: '9a9cb84f-eef4-4775-8167-27eaeb0d5e16' })
  driverId?: string;

  @ApiPropertyOptional({ example: 'Rahul Sharma' })
  name?: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-10-02T15:30:00.000Z' })
  createdAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Signed short-lived JWT Bearer token',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'd8c47b54a8b79e19d7d24268e31a196e...',
    description: 'Rotatable refresh token string',
  })
  refreshToken!: string;

  @ApiProperty({
    example: 900,
    description: 'Access token time-to-live in seconds',
  })
  expiresIn!: number;

  @ApiProperty({
    example: 'Bearer',
    description: 'Authorization header scheme',
  })
  tokenType!: string;

  @ApiProperty({ type: UserProfileDto })
  user!: UserProfileDto;
}
