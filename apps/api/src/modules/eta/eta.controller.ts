import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { EtaService } from './eta.service';
import { EtaStreamService } from './services/eta-stream.service';
import { QueryEtaDto } from './dto/query-eta.dto';
import { TripEtaResponseDto } from './dto/trip-eta-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('ETA & Arrival Prediction')
@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@ApiBearerAuth('bearer-jwt')
export class EtaController {
  constructor(
    private readonly etaService: EtaService,
    private readonly etaStreamService: EtaStreamService,
  ) {}

  @Get(':tripId/eta')
  @RateLimit({ limit: 30, ttlSeconds: 1 })
  @ApiOperation({
    summary: 'Get route-aware arrival prediction (ETA) for an active trip (Authenticated)',
    description:
      'Computes deterministic, route-progression-aware arrival times for all stops or a focused stop. ' +
      'Considers authoritative sequence order, real-time bus position, speed smoothing, and intervening stop dwell times.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deterministic arrival prediction returned successfully',
    type: TripEtaResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Trip not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Stop does not belong to the route or route has no stops',
  })
  async getTripEta(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Query() query: QueryEtaDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TripEtaResponseDto> {
    return this.etaService.getTripEta(tripId, query.stopId, user);
  }

  @Sse(':tripId/eta/stream')
  @ApiOperation({
    summary:
      'Server-Sent Events (SSE) real-time arrival prediction stream for an active trip (Authenticated)',
    description:
      'Subscribes to real-time arrival prediction updates emitted whenever fresh GPS telemetry ' +
      'significantly modifies remaining travel time (>= 1 min) or transitions to the next stop.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stream of trip_eta_updated events',
  })
  streamTripEta(@Param('tripId', ParseUUIDPipe) tripId: string): Observable<MessageEvent> {
    return this.etaStreamService.getTripEtaStream(tripId);
  }
}
