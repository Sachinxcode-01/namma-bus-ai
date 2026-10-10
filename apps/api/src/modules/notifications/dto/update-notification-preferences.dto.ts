import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Whether to receive ~10 minute arrival threshold alerts',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  etaAlertsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to receive bus arrival alerts at subscribed stops',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  arrivalAlertsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to receive trip started and trip completed alerts',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  tripLifecycleAlertsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to receive breakdown, delay, and incident alerts',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  incidentAlertsEnabled?: boolean;
}
