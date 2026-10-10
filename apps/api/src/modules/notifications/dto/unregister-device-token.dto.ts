import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NOTIFICATION_CONFIG } from '../constants/notification.constants';

export class UnregisterDeviceTokenDto {
  @ApiProperty({
    description: 'FCM device registration token to deactivate or remove',
    example: 'f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(NOTIFICATION_CONFIG.MAX_DEVICE_TOKEN_LENGTH)
  token: string;
}
