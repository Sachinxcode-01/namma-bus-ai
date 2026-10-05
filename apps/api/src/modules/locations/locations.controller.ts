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
import { QueryLocationHistoryDto } from './dto/query-location-history.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Locations')
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly streamService: LocationStreamService,
  ) {}

  @Post('ingest')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Ingest a high-frequency GPS ping from vehicle hardware/mobile (Driver or Admin)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'GPS location successfully ingested and broadcasted',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error (coordinates, clock skew, jump anomaly)',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Driver not assigned to this trip' })
  async ingest(
    @Body() dto: IngestLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LiveLocation> {
    return this.locationsService.ingest(dto, user);
  }

  @Get('trips/:tripId/latest')
  @ApiOperation({ summary: 'Fetch the most recent live location for a trip (Authenticated)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Latest location returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Trip or live location not found' })
  async getLatestByTripId(@Param('tripId', ParseUUIDPipe) tripId: string): Promise<LiveLocation> {
    return this.locationsService.getLatestByTripId(tripId);
  }

  @Get('buses/:busId/latest')
  @ApiOperation({
    summary: 'Fetch the most recent live location for a bus vehicle (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Latest location returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Bus location not found' })
  async getLatestByBusId(@Param('busId', ParseUUIDPipe) busId: string): Promise<LiveLocation> {
    return this.locationsService.getLatestByBusId(busId);
  }

  @Get('trips/:tripId/history')
  @ApiOperation({ summary: 'Fetch historical GPS breadcrumbs for a trip (Authenticated)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Historical breadcrumb list returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Trip not found' })
  async getHistoryByTripId(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Query() query: QueryLocationHistoryDto,
  ): Promise<LiveLocation[]> {
    return this.locationsService.getHistoryByTripId(tripId, query);
  }

  @Sse('trips/:tripId/stream')
  @ApiOperation({
    summary: 'Server-Sent Events (SSE) live location stream for a trip (Authenticated)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Continuous stream of GPS events' })
  streamTripLocation(@Param('tripId', ParseUUIDPipe) tripId: string): Observable<MessageEvent> {
    return this.streamService.getTripStream(tripId);
  }
}
