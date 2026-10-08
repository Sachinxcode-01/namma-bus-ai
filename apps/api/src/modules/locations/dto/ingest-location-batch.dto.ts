import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { IngestLocationDto } from './ingest-location.dto';

export class IngestLocationBatchDto {
  @ApiProperty({
    type: [IngestLocationDto],
    description: 'Array of buffered offline GPS telemetry readings to ingest (1 to 200 readings)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Batch must contain at least 1 location reading' })
  @ArrayMaxSize(200, { message: 'Batch cannot exceed 200 location readings per request' })
  @ValidateNested({ each: true })
  @Type(() => IngestLocationDto)
  locations!: IngestLocationDto[];
}
