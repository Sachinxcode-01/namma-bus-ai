import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { NOTIFICATION_CONFIG } from '../constants/notification.constants';

export class RegisterDeviceTokenDto {
  @ApiProperty({
    description: 'FCM device registration token',
    example: 'f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(NOTIFICATION_CONFIG.MAX_DEVICE_TOKEN_LENGTH)
  token: string;

  @ApiPropertyOptional({
    description: 'Client device platform',
    enum: ['android', 'ios', 'web'],
    example: 'android',
  })
  @IsOptional()
  @IsString()
  @IsIn(['android', 'ios', 'web'])
  platform?: string;

  @ApiPropertyOptional({
    description: 'Client device hardware model or browser name',
    example: 'Samsung Galaxy A52 / Chrome 124',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceModel?: string;
}
