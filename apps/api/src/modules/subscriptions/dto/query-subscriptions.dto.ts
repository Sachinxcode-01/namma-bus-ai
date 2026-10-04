import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QuerySubscriptionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by route UUID' })
  @IsOptional()
  @IsUUID('4')
  routeId?: string;

  @ApiPropertyOptional({ description: 'Filter by stop UUID' })
  @IsOptional()
  @IsUUID('4')
  stopId?: string;

  @ApiPropertyOptional({ description: 'Filter by student UUID (Admin only)' })
  @IsOptional()
  @IsUUID('4')
  studentId?: string;
}
