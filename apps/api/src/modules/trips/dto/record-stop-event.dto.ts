import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StopEventType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class RecordStopEventDto {
  @ApiProperty({
    enum: StopEventType,
    example: StopEventType.ARRIVED,
    description: 'Type of event at the stop (ARRIVED or DEPARTED)',
  })
  @IsNotEmpty()
  @IsEnum(StopEventType, { message: 'eventType must be either ARRIVED or DEPARTED' })
  eventType!: StopEventType;

  @ApiPropertyOptional({
    example: '2026-10-04T08:15:30.000Z',
    description: 'Timestamp when event occurred (defaults to current time if omitted)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'timestamp must be a valid ISO 8601 date string' })
  timestamp?: string;
}
