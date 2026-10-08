import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LiveLocation, StopEvent, UserRole } from '@prisma/client';
import { TripsService } from './trips.service';
import { TripDetail, TripStopProgress, TripSummary } from './trips.repository';
import { CreateTripDto } from './dto/create-trip.dto';
import { QueryTripsDto } from './dto/query-trips.dto';
import { RecordStopEventDto } from './dto/record-stop-event.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PaginatedResult } from '../users/users.service';
import { LocationsService } from '../locations/locations.service';
import { IngestLocationDto } from '../locations/dto/ingest-location.dto';
import { LiveBusStateDto } from '../locations/dto/live-bus-state.dto';

@ApiTags('Trips')
@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly locationsService: LocationsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Schedule a new bus trip (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Trip scheduled successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Bus or driver already on active trip' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error (inactive bus/driver/route)',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async create(@Body() dto: CreateTripDto): Promise<TripSummary> {
    return this.tripsService.create(dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'List all currently active bus trips (Authenticated)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of active trips returned' })
  async findActiveTrips(): Promise<TripSummary[]> {
    return this.tripsService.findActiveTrips();
  }

  @Get()
  @ApiOperation({ summary: 'List bus trips with pagination and filtering (Authenticated)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of trips returned' })
  async findAll(@Query() query: QueryTripsDto): Promise<PaginatedResult<TripSummary>> {
    return this.tripsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get detailed trip info by ID including route stops and events (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trip details returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Trip not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TripDetail> {
    return this.tripsService.findOne(id);
  }

  @Get(':id/location')
  @ApiOperation({
    summary: 'Get authoritative live operational tracking state for a trip (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Live trip state returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Trip not found' })
  async getLiveTripLocation(@Param('id', ParseUUIDPipe) id: string): Promise<LiveBusStateDto> {
    return this.locationsService.getLiveTripState(id);
  }

  @Post(':id/locations')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ingest a GPS location ping for a trip (Driver or Admin)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'GPS location accepted' })
  async ingestLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IngestLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LiveLocation> {
    dto.tripId = id;
    return this.locationsService.ingest(dto, user);
  }

  @Patch(':id/start')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Start a scheduled trip (Assigned Driver or Admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trip started successfully or already active (idempotent)',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid state transition' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Bus or driver already on another active trip',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not assigned to this trip' })
  async startTrip(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TripDetail> {
    return this.tripsService.startTrip(id, user);
  }

  @Patch(':id/end')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'End an active trip (Assigned Driver or Admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trip ended successfully or already completed (idempotent)',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid state transition' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not assigned to this trip' })
  async endTrip(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TripDetail> {
    return this.tripsService.endTrip(id, user);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a trip (Assigned Driver or Admin)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trip cancelled successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot cancel completed trip' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async cancelTrip(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TripDetail> {
    return this.tripsService.cancelTrip(id, user);
  }

  @Get(':id/stops')
  @ApiOperation({
    summary: 'Get stops progress for a trip with arrival and departure events (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trip stops progress returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Trip not found' })
  async getTripStopsProgress(@Param('id', ParseUUIDPipe) id: string): Promise<TripStopProgress[]> {
    return this.tripsService.getTripStopsProgress(id);
  }

  @Post(':id/stops/:stopId/events')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Record a stop arrival or departure event (Assigned Driver or Admin)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Stop event recorded (or existing event returned idempotently)',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Trip not active or stop not on route',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not assigned to this trip' })
  async recordStopEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
    @Body() dto: RecordStopEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StopEvent> {
    return this.tripsService.recordStopEvent(id, stopId, dto, user);
  }
}
