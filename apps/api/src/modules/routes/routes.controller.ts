import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
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
import { UserRole, Route, RouteStop } from '@prisma/client';
import { RoutesService } from './routes.service';
import { RouteWithStops } from './routes.repository';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { QueryRoutesDto } from './dto/query-routes.dto';
import { AddRouteStopDto } from './dto/add-route-stop.dto';
import { ReorderRouteStopsDto } from './dto/reorder-route-stops.dto';
import { PaginatedResult } from '../users/users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Routes')
@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @ApiOperation({ summary: 'List all routes with pagination and search' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of routes returned' })
  async findAll(@Query() query: QueryRoutesDto): Promise<PaginatedResult<Route>> {
    return this.routesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route details with all associated stops in sequence order' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route details with stops returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Route not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RouteWithStops> {
    return this.routesService.findOne(id);
  }

  @Get(':id/stops')
  @ApiOperation({ summary: 'Get sequenced list of stops for a specific route' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sequenced list of route stops returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Route not found' })
  async getStops(@Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.getStops(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new transit route (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Route created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Route code already exists' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async create(@Body() dto: CreateRouteDto): Promise<Route> {
    return this.routesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update route details (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Route not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRouteDto,
  ): Promise<Route> {
    return this.routesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a route (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Route not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<Route> {
    return this.routesService.remove(id);
  }

  @Post(':id/stops')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a stop to a route with sequence order (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Stop assigned to route' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Stop already in route or sequence occupied',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async addStop(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddRouteStopDto,
  ): Promise<RouteStop> {
    return this.routesService.addStop(id, dto);
  }

  @Delete(':id/stops/:stopId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove a stop assignment from a route (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stop assignment removed' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Route or stop assignment not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async removeStop(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
  ): Promise<{ message: string }> {
    await this.routesService.removeStop(id, stopId);
    return { message: 'Stop removed from route successfully.' };
  }

  @Put(':id/stops/reorder')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reorder route stops transactionally (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route stops reordered successfully' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Duplicate stops or sequence numbers',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async reorderStops(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderRouteStopsDto,
  ): Promise<RouteWithStops> {
    return this.routesService.reorderStops(id, dto);
  }
}
