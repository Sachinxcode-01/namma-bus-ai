import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'a4b8c9d0e1f2...',
    description: 'Cryptographically secure refresh token string',
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token must not be empty.' })
  refreshToken!: string;
}
