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
import { Route, UserRole } from '@prisma/client';
import { RoutesService } from './routes.service';
import { RouteWithDetails, OrderedRouteStop } from './routes.repository';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { QueryRoutesDto } from './dto/query-routes.dto';
import { AssignRouteStopsDto } from './dto/assign-route-stops.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../users/users.service';

@ApiTags('Routes')
@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new bus route (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Route successfully created' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Route code conflict' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async create(@Body() dto: CreateRouteDto): Promise<Route> {
    return this.routesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List routes with pagination, stops count and search (Authenticated)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of routes returned' })
  async findAll(@Query() query: QueryRoutesDto): Promise<PaginatedResult<RouteWithDetails>> {
    return this.routesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route details with ordered sequence of stops (Authenticated)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route details with stops returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Route not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RouteWithDetails> {
    return this.routesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update route details or status (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route successfully updated' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Unique code conflict' })
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
  @ApiOperation({ summary: 'Delete a bus route (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route deleted' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Cannot delete route with trips' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Route not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ deleted: boolean; id: string }> {
    return this.routesService.remove(id);
  }

  @Post(':id/stops')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign and order sequential stops for a route (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stops successfully sequenced on route' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or duplicate sequence order',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Route or Stop not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async assignStops(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRouteStopsDto,
  ): Promise<OrderedRouteStop[]> {
    return this.routesService.assignStops(id, dto);
  }

  @Get(':id/stops')
  @ApiOperation({ summary: 'Get ordered stops for a route (Authenticated)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ordered list of stops returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Route not found' })
  async getStops(@Param('id', ParseUUIDPipe) id: string): Promise<OrderedRouteStop[]> {
    return this.routesService.getStops(id);
  }
}
