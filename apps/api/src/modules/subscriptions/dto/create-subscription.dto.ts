import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID of the route the student is subscribing to',
  })
  @IsUUID('4')
  routeId!: string;

  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-fa2345678901',
    description: 'UUID of the student boarding/alighting stop on the route',
  })
  @IsUUID('4')
  stopId!: string;

  @ApiPropertyOptional({
    example: 'c3d4e5f6-a7b8-9012-cdef-ab3456789012',
    description: 'UUID of student (Admin only override; students default to their own profile)',
  })
  @IsOptional()
  @IsUUID('4')
  studentId?: string;
}
