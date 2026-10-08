import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LiveLocation, UserRole } from '@prisma/client';
import { Observable } from 'rxjs';
import { LocationsService } from './locations.service';
import { LocationStreamService } from './location-stream.service';
import { IngestLocationDto } from './dto/ingest-location.dto';
import { BatchIngestLocationDto } from './dto/batch-ingest-location.dto';
import { QueryLocationHistoryDto } from './dto/query-location-history.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { BatchIngestResult, LiveBusState } from './domain/gps-telemetry.types';
import { GpsMetricsSnapshot } from './services/gps-metrics.service';

@ApiTags('Locations & GPS Telemetry')
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@ApiBearerAuth('bearer-jwt')
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly streamService: LocationStreamService,
  ) {}

  @Post()
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @RateLimit({ limit: 20, ttlSeconds: 1 })
  @ApiOperation({
    summary: 'Ingest high-frequency GPS telemetry ping (Driver or Admin)',
    description:
      'Authoritative GPS ingestion endpoint. Validates coordinates, freshness, speed plausibility, teleportation jumps, active trip status, and driver assignment.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'GPS location validated, persisted, and distributed to active real-time subscribers',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Validation error (out-of-bounds coordinates, clock skew, teleportation jump, or inactive trip)',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Driver is not authorized to ingest GPS for this trip',
  })
  async ingest(
    @Body() dto: IngestLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LiveLocation> {
    return this.locationsService.ingest(dto, user);
  }

  @Post('ingest')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @RateLimit({ limit: 20, ttlSeconds: 1 })
  @ApiOperation({
    summary: 'Ingest high-frequency GPS telemetry ping (Alias)',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'GPS location accepted' })
  async ingestAlias(
    @Body() dto: IngestLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LiveLocation> {
    return this.locationsService.ingest(dto, user);
  }

  @Post('batch')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Batch ingest buffered GPS telemetry pings collected during offline mobile periods',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Batch processed; valid historical breadcrumbs persisted chronologically',
  })
  async ingestBatch(
    @Body() dto: BatchIngestLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BatchIngestResult> {
    return this.locationsService.ingestBatch(dto, user);
  }

  @Get('trips/:tripId/live')
  @ApiOperation({
    summary: 'Fetch authoritative live operational status & state for a trip (Authenticated)',
    description:
      'Returns authoritative live state (LIVE, STALE, OFFLINE), latest coordinates, speed, heading, signal quality, and telemetry age in seconds.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Live bus operational state returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Trip not found' })
  async getLiveTripState(@Param('tripId', ParseUUIDPipe) tripId: string): Promise<LiveBusState> {
    return this.locationsService.getLiveStateByTripId(tripId);
  }

  @Get('buses/:busId/live')
  @ApiOperation({
    summary: 'Fetch authoritative live operational state for a bus vehicle (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Live bus operational state returned' })
  async getLiveBusState(@Param('busId', ParseUUIDPipe) busId: string): Promise<LiveBusState> {
    return this.locationsService.getLiveStateByBusId(busId);
  }

  @Get('trips/:tripId/latest')
  @ApiOperation({
    summary: 'Fetch the most recent raw live location record for a trip (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Latest location record returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Trip or live location not found' })
  async getLatestByTripId(@Param('tripId', ParseUUIDPipe) tripId: string): Promise<LiveLocation> {
    return this.locationsService.getLatestByTripId(tripId);
  }

  @Get('buses/:busId/latest')
  @ApiOperation({
    summary: 'Fetch the most recent raw live location record for a bus (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Latest location record returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bus location not found' })
  async getLatestByBusId(@Param('busId', ParseUUIDPipe) busId: string): Promise<LiveLocation> {
    return this.locationsService.getLatestByBusId(busId);
  }

  @Get('trips/:tripId/history')
  @ApiOperation({
    summary: 'Fetch historical GPS breadcrumbs for a trip with pagination (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Historical breadcrumb list returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Trip not found' })
  async getHistoryByTripId(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Query() query: QueryLocationHistoryDto,
  ): Promise<LiveLocation[]> {
    return this.locationsService.getHistoryByTripId(tripId, query);
  }

  @Get('health')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Retrieve GPS telemetry health metrics and operational counters (Admin only)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Metrics snapshot returned' })
  getTelemetryMetrics(): GpsMetricsSnapshot {
    return this.locationsService.getMetrics();
  }

  @Sse('trips/:tripId/stream')
  @ApiOperation({
    summary: 'Server-Sent Events (SSE) live location stream for an active trip (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Continuous stream of GPS events' })
  streamTripLocation(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Observable<MessageEvent> {
    return this.streamService.getTripStream(tripId, null, user);
  }

  @Sse('buses/:busId/stream')
  @ApiOperation({
    summary: 'Server-Sent Events (SSE) live location stream for a bus vehicle (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Continuous stream of GPS events' })
  streamBusLocation(
    @Param('busId', ParseUUIDPipe) busId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Observable<MessageEvent> {
    return this.streamService.getBusStream(busId, null, user);
  }

  @Sse('routes/:routeCode/stream')
  @ApiOperation({
    summary: 'Server-Sent Events (SSE) live location stream for a route (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Continuous stream of GPS events for route' })
  streamRouteLocation(
    @Param('routeCode') routeCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Observable<MessageEvent> {
    return this.streamService.getRouteStream(routeCode, user);
  }

  @Sse('fleet/stream')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Server-Sent Events (SSE) live location stream for entire fleet (Admin only)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Continuous stream of all fleet GPS events' })
  streamFleetLocation(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.streamService.getFleetStream(user);
  }
}
