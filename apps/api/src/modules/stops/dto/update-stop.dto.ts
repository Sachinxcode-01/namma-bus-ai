import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateStopDto } from './create-stop.dto';

export class UpdateStopDto extends PartialType(CreateStopDto) {
  @ApiPropertyOptional({ example: 'Majestic Central Bus Station' })
  name?: string;

  @ApiPropertyOptional({ example: 'STP-MAJ-NEW' })
  code?: string;

  @ApiPropertyOptional({ example: 12.978 })
  latitude?: number;

  @ApiPropertyOptional({ example: 77.573 })
  longitude?: number;

  @ApiPropertyOptional({ example: 60.0 })
  geofenceRadiusMeters?: number;
}
