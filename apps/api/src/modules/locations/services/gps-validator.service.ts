import { Injectable, Logger } from '@nestjs/common';
import { IngestLocationDto } from '../dto/ingest-location.dto';
import { GPS_CONFIG } from '../constants/gps.constants';
import {
  GpsMovementClassification,
  GpsSignalQuality,
  GpsValidationResult,
} from '../domain/gps-telemetry.types';
import { ValidationException } from '../../../common/errors/app.exception';
import { haversineDistance } from '../../../common/utils/geo.util';

@Injectable()
export class GpsValidatorService {
  private readonly logger = new Logger(GpsValidatorService.name);

  /**
   * Validates geographic coordinates to ensure they are finite numbers within Earth bounds.
   */
  validateCoordinates(latitude: number, longitude: number): void {
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      throw new ValidationException('Latitude and longitude must be valid finite numbers.');
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new ValidationException(
        'Coordinates outside valid geographic limits [-90..90, -180..180].',
      );
    }
  }

  /**
   * Validates horizontal accuracy metric and calculates signal quality.
   */
  evaluateAccuracy(accuracy?: number | null): GpsSignalQuality {
    if (accuracy === undefined || accuracy === null) {
      return GpsSignalQuality.UNKNOWN;
    }

    if (
      typeof accuracy !== 'number' ||
      !Number.isFinite(accuracy) ||
      Number.isNaN(accuracy) ||
      accuracy < 0
    ) {
      throw new ValidationException('Accuracy metric cannot be negative or invalid number.');
    }

    if (accuracy > GPS_CONFIG.MAX_ACCURACY_REJECTION_METERS) {
      throw new ValidationException(
        `GPS horizontal accuracy (${accuracy}m) exceeds maximum allowable threshold (${GPS_CONFIG.MAX_ACCURACY_REJECTION_METERS}m). Reading is too inaccurate for operational tracking.`,
      );
    }

    if (accuracy <= GPS_CONFIG.ACCURACY_EXCELLENT_METERS) {
      return GpsSignalQuality.EXCELLENT;
    }
    if (accuracy <= GPS_CONFIG.ACCURACY_ACCEPTABLE_METERS) {
      return GpsSignalQuality.ACCEPTABLE;
    }
    return GpsSignalQuality.POOR;
  }

  /**
   * Validates reported instantaneous vehicle speed.
   */
  validateSpeed(speed?: number | null): void {
    if (speed === undefined || speed === null) {
      return;
    }

    if (typeof speed !== 'number' || !Number.isFinite(speed) || Number.isNaN(speed) || speed < 0) {
      throw new ValidationException('Speed metric cannot be negative or non-numeric.');
    }

    if (speed > GPS_CONFIG.MAX_PLAUSIBLE_SPEED_KMH) {
      throw new ValidationException(
        `Reported speed (${speed} km/h) exceeds maximum plausible threshold (${GPS_CONFIG.MAX_PLAUSIBLE_SPEED_KMH} km/h).`,
      );
    }
  }

  /**
   * Validates vehicle compass heading / bearing (0 to 360 degrees).
   */
  validateHeading(heading?: number | null): void {
    if (heading === undefined || heading === null) {
      return;
    }

    if (
      typeof heading !== 'number' ||
      !Number.isFinite(heading) ||
      Number.isNaN(heading) ||
      heading < 0 ||
      heading > 360
    ) {
      throw new ValidationException(
        'Heading metric must be a valid compass bearing between 0 and 360 degrees.',
      );
    }
  }

  /**
   * Verifies timestamp freshness and detects forward clock skew or extreme age.
   */
  validateTimestampFreshness(deviceTime: Date, nowMs: number = Date.now()): void {
    const timeMs = deviceTime.getTime();
    if (Number.isNaN(timeMs)) {
      throw new ValidationException('Invalid timestamp format.');
    }

    const futureDiffMs = timeMs - nowMs;
    if (futureDiffMs > GPS_CONFIG.MAX_FUTURE_SKEW_MS) {
      throw new ValidationException(
        `GPS ping timestamp is in the future (> ${GPS_CONFIG.MAX_FUTURE_SKEW_MS / 1000} seconds clock skew).`,
      );
    }

    const ageMs = nowMs - timeMs;
    if (ageMs > GPS_CONFIG.MAX_STALE_AGE_MS) {
      throw new ValidationException(
        `GPS ping timestamp is too stale (> ${GPS_CONFIG.MAX_STALE_AGE_MS / 60000} minutes old).`,
      );
    }
  }

  /**
   * Evaluates vehicle movement relative to the most recent accepted location.
   */
  evaluateMovement(
    newPing: { latitude: number; longitude: number; timestamp: Date; accuracy?: number | null },
    previousLocation?: { latitude: number; longitude: number; timestamp: Date } | null,
  ): GpsValidationResult {
    const signalQuality = this.evaluateAccuracy(newPing.accuracy);

    if (!previousLocation) {
      return {
        isValid: true,
        classification: GpsMovementClassification.VALID,
        signalQuality,
        isStaleOrHistorical: false,
        isDuplicate: false,
      };
    }

    const elapsedSeconds =
      (newPing.timestamp.getTime() - previousLocation.timestamp.getTime()) / 1000;

    // Time inversion or identical timestamp check
    if (elapsedSeconds <= 0) {
      throw new ValidationException(
        'GPS ping timestamp must be newer than the latest recorded location for this trip.',
      );
    }

    const distanceMeters = haversineDistance(
      previousLocation.latitude,
      previousLocation.longitude,
      newPing.latitude,
      newPing.longitude,
    );

    // Micro-movement / stationary jitter check
    if (distanceMeters < GPS_CONFIG.MIN_DISTANCE_DELTA_METERS && elapsedSeconds < 2) {
      return {
        isValid: true,
        classification: GpsMovementClassification.VALID,
        signalQuality,
        displacementMeters: distanceMeters,
        elapsedSeconds,
        calculatedSpeedKmh: 0,
        isStaleOrHistorical: false,
        isDuplicate: true,
      };
    }

    // Teleportation / jump anomaly detection
    if (elapsedSeconds <= GPS_CONFIG.MAX_TELEPORT_EVAL_WINDOW_SECONDS) {
      const calculatedSpeedKmh = (distanceMeters / elapsedSeconds) * 3.6;

      if (calculatedSpeedKmh > GPS_CONFIG.MAX_TELEPORT_SPEED_KMH) {
        this.logger.warn(
          `Teleportation anomaly detected: calculated velocity ${calculatedSpeedKmh.toFixed(
            1,
          )} km/h over ${distanceMeters.toFixed(1)}m in ${elapsedSeconds.toFixed(1)}s`,
        );
        throw new ValidationException(
          `Implausible geographic jump detected (teleportation anomaly: calculated speed ${calculatedSpeedKmh.toFixed(
            1,
          )} km/h exceeds ${GPS_CONFIG.MAX_TELEPORT_SPEED_KMH} km/h threshold).`,
        );
      }

      if (calculatedSpeedKmh > GPS_CONFIG.SUSPICIOUS_SPEED_KMH) {
        this.logger.warn(
          `Suspicious rapid movement: ${calculatedSpeedKmh.toFixed(1)} km/h over ${distanceMeters.toFixed(
            1,
          )}m in ${elapsedSeconds.toFixed(1)}s`,
        );
        return {
          isValid: true,
          classification: GpsMovementClassification.SUSPICIOUS,
          signalQuality,
          displacementMeters: distanceMeters,
          elapsedSeconds,
          calculatedSpeedKmh,
          isStaleOrHistorical: false,
          isDuplicate: false,
          reason: `High velocity detected (${calculatedSpeedKmh.toFixed(1)} km/h)`,
        };
      }

      return {
        isValid: true,
        classification: GpsMovementClassification.VALID,
        signalQuality,
        displacementMeters: distanceMeters,
        elapsedSeconds,
        calculatedSpeedKmh,
        isStaleOrHistorical: false,
        isDuplicate: false,
      };
    }

    return {
      isValid: true,
      classification: GpsMovementClassification.VALID,
      signalQuality,
      displacementMeters: distanceMeters,
      elapsedSeconds,
      isStaleOrHistorical: false,
      isDuplicate: false,
    };
  }

  /**
   * Complete validation pipeline executing all checks in order.
   */
  validatePayload(
    dto: IngestLocationDto,
    previousLocation?: { latitude: number; longitude: number; timestamp: Date } | null,
  ): GpsValidationResult {
    this.validateCoordinates(dto.latitude, dto.longitude);
    this.evaluateAccuracy(dto.accuracy);
    this.validateSpeed(dto.speed);
    this.validateHeading(dto.heading);

    const pingTime = new Date(dto.timestamp);
    this.validateTimestampFreshness(pingTime);

    return this.evaluateMovement(
      {
        latitude: dto.latitude,
        longitude: dto.longitude,
        timestamp: pingTime,
        accuracy: dto.accuracy,
      },
      previousLocation,
    );
  }
}
