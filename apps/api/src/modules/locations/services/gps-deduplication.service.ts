import { Injectable, Logger } from '@nestjs/common';
import { GPS_CONFIG } from '../constants/gps.constants';
import { haversineDistance } from '../../../common/utils/geo.util';

export interface DeduplicationCheckResult {
  isDuplicate: boolean;
  isJitterSuppressed: boolean;
}

@Injectable()
export class GpsDeduplicationService {
  private readonly logger = new Logger(GpsDeduplicationService.name);

  // In-memory LRU-like cache of recent ping signatures: tripId -> signature string
  private readonly recentPings = new Map<
    string,
    { signature: string; latitude: number; longitude: number; timestamp: number }
  >();

  /**
   * Evaluates if a ping is an exact duplicate (e.g. mobile network retry)
   * or stationary micro-jitter under threshold.
   */
  check(
    tripId: string,
    latitude: number,
    longitude: number,
    timestamp: Date,
  ): DeduplicationCheckResult {
    const signature = `${tripId}:${timestamp.getTime()}:${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
    const recent = this.recentPings.get(tripId);

    if (recent) {
      // 1. Exact duplicate check (network retry of identical GPS packet)
      if (recent.signature === signature) {
        this.logger.debug(`Exact duplicate GPS ping suppressed for trip ${tripId}`);
        return { isDuplicate: true, isJitterSuppressed: false };
      }

      // 2. Stationary micro-jitter suppression check
      const timeDeltaMs = timestamp.getTime() - recent.timestamp;
      if (timeDeltaMs >= 0 && timeDeltaMs < GPS_CONFIG.MIN_PING_INTERVAL_MS) {
        const distanceDelta = haversineDistance(
          recent.latitude,
          recent.longitude,
          latitude,
          longitude,
        );

        if (distanceDelta < GPS_CONFIG.MIN_DISTANCE_DELTA_METERS) {
          this.logger.debug(
            `Micro-jitter suppressed for trip ${tripId}: ${distanceDelta.toFixed(2)}m in ${timeDeltaMs}ms`,
          );
          return { isDuplicate: false, isJitterSuppressed: true };
        }
      }
    }

    // Cache this latest ping
    this.recentPings.set(tripId, {
      signature,
      latitude,
      longitude,
      timestamp: timestamp.getTime(),
    });

    // Cleanup cache periodically if it grows beyond 1,000 entries
    if (this.recentPings.size > 1000) {
      const oldestEntries = Array.from(this.recentPings.keys()).slice(0, 200);
      for (const key of oldestEntries) {
        this.recentPings.delete(key);
      }
    }

    return { isDuplicate: false, isJitterSuppressed: false };
  }

  /**
   * Retrieves previous recorded ping state for rollback support.
   */
  getRecentPing(
    tripId: string,
  ): { signature: string; latitude: number; longitude: number; timestamp: number } | undefined {
    const entry = this.recentPings.get(tripId);
    return entry ? { ...entry } : undefined;
  }

  /**
   * Restores previous deduplication state if database write fails.
   */
  restoreRecentPing(
    tripId: string,
    previous?: { signature: string; latitude: number; longitude: number; timestamp: number },
  ): void {
    if (previous) {
      this.recentPings.set(tripId, previous);
    } else {
      this.recentPings.delete(tripId);
    }
  }

  /**
   * Resets deduplication state for a trip (e.g. upon trip completion)
   */
  clearTrip(tripId: string): void {
    this.recentPings.delete(tripId);
  }
}

