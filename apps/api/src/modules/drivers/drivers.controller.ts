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
import { DriverWithDetails } from './drivers.repository';
import { QueryDriversDto } from './dto/query-drivers.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ForbiddenException } from '../../common/errors/app.exception';
import { PaginatedResult } from '../users/users.service';

@ApiTags('Drivers')
@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List drivers with pagination, search, and active trip status (Admin only)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of drivers returned' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async findAll(@Query() query: QueryDriversDto): Promise<PaginatedResult<DriverWithDetails>> {
    return this.driversService.findAll(query);
  }

  @Get('me')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Get current authenticated driver profile (Driver only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver profile returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Driver profile not linked' })
  async getMyProfile(@CurrentUser() currentUser: AuthenticatedUser): Promise<DriverWithDetails> {
    return this.driversService.findByUserId(currentUser.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get driver details by ID (Admin or the Driver themself)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver details returned' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view other drivers',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Driver not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<DriverWithDetails> {
    const driver = await this.driversService.findOne(id);
    if (currentUser.role !== UserRole.ADMIN && driver.userId !== currentUser.id) {
      throw new ForbiddenException('You are not authorized to view another driver profile.');
    }
    return driver;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update driver profile (Admin or the Driver themself)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver profile updated' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'License number already in use' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Unauthorized update attempt' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Driver not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<DriverWithDetails> {
    return this.driversService.update(id, dto, currentUser);
  }
}
