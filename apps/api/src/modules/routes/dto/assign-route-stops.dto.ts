import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class RouteStopInputDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID of the existing stop',
  })
  @IsUUID('4')
  stopId!: string;

  @ApiProperty({ example: 1, description: '1-based sequential stop order along route direction' })
  @IsInt()
  @Min(1)
  sequenceOrder!: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Estimated standard travel minutes from the trip origin stop',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutesFromStart?: number;
}

export class AssignRouteStopsDto {
  @ApiProperty({
    type: [RouteStopInputDto],
    description: 'Ordered sequence of stops defining the bus route trajectory',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RouteStopInputDto)
  stops!: RouteStopInputDto[];
}
