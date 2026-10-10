import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EtaConfidence, EtaStatus, TripEtaDomainResult } from '../../eta/domain/eta.types';
import { NOTIFICATION_CONFIG } from '../constants/notification.constants';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class EtaAlertEvaluatorService {
  private readonly logger = new Logger(EtaAlertEvaluatorService.name);
  private readonly thresholdMinutes: number;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService?: NotificationsService,
  ) {
    this.thresholdMinutes =
      this.configService.get<number>('notifications.etaAlertThresholdMinutes') ??
      NOTIFICATION_CONFIG.DEFAULT_ETA_ALERT_THRESHOLD_MINUTES;
  }

  /**
   * Evaluates a computed Trip ETA domain result and triggers arrival threshold alerts
   * when any forward upcoming stop crosses below the configured threshold (default ~10 mins).
   */
  async evaluate(etaResult: TripEtaDomainResult): Promise<void> {
    if (!this.notificationsService) {
      return;
    }

    // 1. Guard against inactive trips
    if (etaResult.status === EtaStatus.NO_ACTIVE_TRIP) {
      return;
    }

    // 2. Guard against stale or unavailable GPS: do not trigger alerts from unreliable location
    if (
      etaResult.status === EtaStatus.STALE ||
      etaResult.status === EtaStatus.GPS_UNAVAILABLE ||
      etaResult.status === EtaStatus.INSUFFICIENT_DATA
    ) {
      this.logger.debug(
        `Skipping ETA alert evaluation for trip ${etaResult.tripId}: ETA status is ${etaResult.status}.`,
      );
      return;
    }

    // 3. Low confidence GPS guard (telemetry older than 120s or wild accuracy)
    if (etaResult.confidence === EtaConfidence.LOW) {
      this.logger.debug(
        `Skipping ETA alert evaluation for trip ${etaResult.tripId}: ETA confidence is LOW.`,
      );
      return;
    }

    // 4. Evaluate each stop along the route
    for (const stop of etaResult.stops) {
      // Ignore stops that have already been passed or arrived
      if (stop.status === 'PASSED') {
        continue;
      }

      // Check if estimated travel time is within the alert threshold
      if (stop.estimatedMinutes <= this.thresholdMinutes) {
        this.logger.debug(
          `Stop '${stop.stopName}' on trip ${etaResult.tripId} reached ${stop.estimatedMinutes} min ETA (Threshold: ${this.thresholdMinutes} min). Evaluating student subscriptions.`,
        );

        await this.notificationsService
          .handleEtaThresholdAlert(
            etaResult.tripId,
            stop.stopId,
            stop.estimatedMinutes,
            etaResult.routeId,
            stop.stopName,
          )
          .catch((err) =>
            this.logger.error(
              `Error handling ETA alert for trip ${etaResult.tripId}, stop ${stop.stopId}: ${err?.message || err}`,
            ),
          );
      }
    }
  }

  getThresholdMinutes(): number {
    return this.thresholdMinutes;
  }
}
