import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { AddRouteStopDto } from './add-route-stop.dto';

export class ReorderRouteStopsDto {
  @ApiProperty({
    type: [AddRouteStopDto],
    description: 'Ordered array of route stop assignments with updated sequence orders',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one stop assignment must be provided.' })
  @ValidateNested({ each: true })
  @Type(() => AddRouteStopDto)
  stops!: AddRouteStopDto[];
}
