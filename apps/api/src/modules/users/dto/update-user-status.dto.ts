import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ example: false, description: 'Active status of the user account' })
  @IsBoolean()
  isActive!: boolean;
}
