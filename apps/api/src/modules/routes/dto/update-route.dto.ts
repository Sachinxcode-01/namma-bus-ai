import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateRouteDto } from './create-route.dto';

export class UpdateRouteDto extends PartialType(CreateRouteDto) {
  @ApiPropertyOptional({ example: 'Campus to Majestic Express Updated' })
  name?: string;

  @ApiPropertyOptional({ example: 'R-101-NEW' })
  code?: string;

  @ApiPropertyOptional({ example: 'Updated route notes' })
  description?: string;

  @ApiPropertyOptional({ example: false })
  isActive?: boolean;
}
