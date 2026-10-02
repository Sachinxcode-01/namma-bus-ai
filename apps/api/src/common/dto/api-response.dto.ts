import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({ example: 'NOT_FOUND', description: 'Machine-readable error code' })
  code!: string;

  @ApiProperty({ example: 'Resource was not found.', description: 'Human-readable error message' })
  message!: string;

  @ApiProperty({
    example: 'req_8f142c13d9a7413689fa2d89e2ba6438',
    description: 'Correlation Request ID',
  })
  requestId?: string;

  @ApiProperty({ required: false, description: 'Optional error details or validation violations' })
  details?: unknown;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ type: ApiErrorDto })
  error!: ApiErrorDto;
}
