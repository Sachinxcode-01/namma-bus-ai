import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 'Rahul Sharma', description: 'Student full name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Student contact telephone' })
  @IsOptional()
  @IsString()
  phone?: string;
}
