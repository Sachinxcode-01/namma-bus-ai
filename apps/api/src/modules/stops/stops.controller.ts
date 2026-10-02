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
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, Stop } from '@prisma/client';
import { StopsService } from './stops.service';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { QueryStopsDto } from './dto/query-stops.dto';
import { PaginatedResult } from '../users/users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Stops')
@Controller('stops')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class StopsController {
  constructor(private readonly stopsService: StopsService) {}

  @Get()
  @ApiOperation({ summary: 'List all bus stops with pagination and search' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of stops returned' })
  async findAll(@Query() query: QueryStopsDto): Promise<PaginatedResult<Stop>> {
    return this.stopsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stop details including routes that visit this stop' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stop details returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Stop not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Stop> {
    return this.stopsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new geofenced bus stop (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Stop created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Stop code already exists' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async create(@Body() dto: CreateStopDto): Promise<Stop> {
    return this.stopsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update stop name, coordinates, or geofence radius (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stop updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Stop not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStopDto): Promise<Stop> {
    return this.stopsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a bus stop (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stop deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Stop not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<Stop> {
    return this.stopsService.remove(id);
  }
}
