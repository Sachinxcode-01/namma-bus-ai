import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { IngestLocationDto } from './ingest-location.dto';

export class BatchIngestLocationDto {
  @ApiProperty({
    type: [IngestLocationDto],
    description:
      'Array of buffered GPS telemetry pings collected during offline mobile periods (max 100 pings)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Batch must contain at least 1 location ping' })
  @ArrayMaxSize(100, { message: 'Batch cannot contain more than 100 location pings at once' })
  @ValidateNested({ each: true })
  @Type(() => IngestLocationDto)
  locations!: IngestLocationDto[];
}
