import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DriversService } from './drivers.service';
import { DriverWithUser } from './drivers.repository';
import { QueryDriversDto } from './dto/query-drivers.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { PaginatedResult } from '../users/users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Drivers')
@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @ApiOperation({ summary: 'List drivers with pagination and search' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of drivers returned' })
  async findAll(@Query() query: QueryDriversDto): Promise<PaginatedResult<DriverWithUser>> {
    return this.driversService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get driver profile by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver profile returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Driver not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DriverWithUser> {
    return this.driversService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update driver contact or license information (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Driver not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverDto,
  ): Promise<DriverWithUser> {
    return this.driversService.update(id, dto);
  }
}
