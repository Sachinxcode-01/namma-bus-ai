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
import { UserRole, Bus } from '@prisma/client';
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { QueryBusesDto } from './dto/query-buses.dto';
import { PaginatedResult } from '../users/users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Buses')
@Controller('buses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Get()
  @ApiOperation({ summary: 'List all buses with pagination, search, and active filtering' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of buses returned' })
  async findAll(@Query() query: QueryBusesDto): Promise<PaginatedResult<Bus>> {
    return this.busesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bus details by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bus details returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bus not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Bus> {
    return this.busesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new college bus (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Bus created successfully' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Bus or registration number already exists',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async create(@Body() dto: CreateBusDto): Promise<Bus> {
    return this.busesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update bus details (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bus updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bus not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBusDto): Promise<Bus> {
    return this.busesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete or deactivate bus (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bus deleted or deactivated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bus not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<Bus> {
    return this.busesService.remove(id);
  }
}
