import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateBusDto } from './create-bus.dto';

export class UpdateBusDto extends PartialType(CreateBusDto) {
  @ApiPropertyOptional({ example: 'BUS-102' })
  busNumber?: string;

  @ApiPropertyOptional({ example: 'KA-04-AB-5678' })
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 50 })
  capacity?: number;

  @ApiPropertyOptional({ example: false })
  isActive?: boolean;
}
