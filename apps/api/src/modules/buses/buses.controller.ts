import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Bus, UserRole } from '@prisma/client';
import { BusesService } from './buses.service';
import { BusWithStatus } from './buses.repository';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { QueryBusesDto } from './dto/query-buses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../users/users.service';
import { LocationsService } from '../locations/locations.service';
import { LiveBusStateDto } from '../locations/dto/live-bus-state.dto';

@ApiTags('Buses')
@Controller('buses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class BusesController {
  constructor(
    private readonly busesService: BusesService,
    private readonly locationsService: LocationsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new fleet bus (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Bus successfully created' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Bus number or registration number conflict',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async create(@Body() dto: CreateBusDto): Promise<Bus> {
    return this.busesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List fleet buses with pagination and optional search (Authenticated)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of buses returned' })
  async findAll(@Query() query: QueryBusesDto): Promise<PaginatedResult<BusWithStatus>> {
    return this.busesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bus details and active trip status by ID (Authenticated)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bus details returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bus not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BusWithStatus> {
    return this.busesService.findOne(id);
  }

  @Get(':id/live')
  @ApiOperation({
    summary: 'Get live operational tracking state for a bus vehicle (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Authoritative live bus state returned' })
  async getLiveState(@Param('id', ParseUUIDPipe) id: string): Promise<LiveBusStateDto> {
    return this.locationsService.getLiveBusState(id);
  }

  @Get(':id/live-location')
  @ApiOperation({ summary: 'Get live location state for a bus vehicle (mobile apps alias)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Authoritative live bus state returned' })
  async getLiveLocation(@Param('id', ParseUUIDPipe) id: string): Promise<LiveBusStateDto> {
    return this.locationsService.getLiveBusState(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update bus details or active status (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bus successfully updated' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Unique constraint conflict' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bus not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBusDto): Promise<Bus> {
    return this.busesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a bus from the fleet (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bus deleted' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Cannot delete bus with trip history' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bus not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ deleted: boolean; id: string }> {
    return this.busesService.remove(id);
  }
}
