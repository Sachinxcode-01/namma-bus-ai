import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class BroadcastNotificationDto {
  @ApiProperty({
    description: 'Title of the broadcast notification',
    example: 'Campus Bus Advisory: Heavy Rain Delay',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({
    description: 'Message body of the broadcast notification',
    example: 'Due to severe waterlogging near Gadag Road, trips may face 15-20 min delays.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body: string;

  @ApiPropertyOptional({
    description: 'Notification category type',
    enum: NotificationType,
    default: NotificationType.BROADCAST,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType = NotificationType.BROADCAST;

  @ApiPropertyOptional({
    description: 'Optional route ID to target students subscribed to a specific route',
    example: 'route-uuid-1',
  })
  @IsOptional()
  @IsString()
  routeId?: string;

  @ApiPropertyOptional({
    description: 'Optional structured metadata for custom client handling',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
