import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EtaConfidence,
  EtaStatus,
  NextStopSummary,
  StopEtaDto,
  TripEtaResponse,
} from '@nammabus/shared-types';

export class NextStopInfoDto implements NextStopSummary {
  @ApiProperty({ description: 'Next stop ID' })
  stopId!: string;

  @ApiProperty({ description: 'Next stop name' })
  stopName!: string;

  @ApiProperty({ description: 'Next stop code' })
  stopCode!: string;

  @ApiProperty({ description: 'Sequence order along route' })
  sequenceOrder!: number;
}

export class StopEtaResponseDto implements StopEtaDto {
  @ApiProperty({ description: 'Stop unique identifier' })
  stopId!: string;

  @ApiProperty({ description: 'Stop display name' })
  stopName!: string;

  @ApiProperty({ description: 'Stop code' })
  stopCode!: string;

  @ApiProperty({ description: 'Sequence order of the stop on this route' })
  sequenceOrder!: number;

  @ApiProperty({ description: 'Latitude coordinate' })
  latitude!: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  longitude!: number;

  @ApiProperty({ description: 'Estimated minutes to reach this stop from current bus position' })
  estimatedMinutes!: number;

  @ApiProperty({ description: 'Predicted ISO-8601 arrival timestamp' })
  estimatedArrivalTime!: string;

  @ApiProperty({ description: 'Road/route distance remaining in meters' })
  distanceRemainingMeters!: number;

  @ApiProperty({
    description: 'Current stop progression state',
    enum: ['PASSED', 'APPROACHING', 'NEXT', 'UPCOMING'],
  })
  status!: 'PASSED' | 'APPROACHING' | 'NEXT' | 'UPCOMING';
}

export class TripEtaResponseDto implements TripEtaResponse {
  @ApiProperty({ description: 'Active Trip ID' })
  tripId!: string;

  @ApiProperty({ description: 'Assigned Bus ID' })
  busId!: string;

  @ApiProperty({ description: 'Assigned Route ID' })
  routeId!: string;

  @ApiProperty({ description: 'Timestamp of latest location used for calculation' })
  lastUpdated!: string;

  @ApiProperty({ description: 'Estimated delay in minutes relative to schedule' })
  currentDelayMinutes!: number;

  @ApiProperty({ type: [StopEtaResponseDto], description: 'Per-stop arrival predictions' })
  stops!: StopEtaResponseDto[];

  @ApiPropertyOptional({ description: 'Focused stop ID if requested' })
  stopId?: string;

  @ApiPropertyOptional({ description: 'Estimated minutes for focused stop or immediate next stop' })
  etaMinutes?: number;

  @ApiPropertyOptional({
    description: 'Estimated arrival time ISO for focused stop or immediate next stop',
  })
  estimatedArrivalTime?: string;

  @ApiPropertyOptional({ description: 'Remaining distance along route to focused stop in meters' })
  distanceRemainingMeters?: number;

  @ApiPropertyOptional({ type: NextStopInfoDto, description: 'Immediate next stop details' })
  nextStop?: NextStopInfoDto | null;

  @ApiPropertyOptional({ enum: EtaStatus, description: 'Authoritative prediction status' })
  status?: EtaStatus;

  @ApiPropertyOptional({ enum: EtaConfidence, description: 'Prediction confidence tier' })
  confidence?: EtaConfidence;

  @ApiPropertyOptional({ description: 'Timestamp when this calculation was executed' })
  calculatedAt?: string;
}
