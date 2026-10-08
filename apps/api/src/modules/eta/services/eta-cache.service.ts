import { Injectable } from '@nestjs/common';
import { TripEtaDomainResult } from '../domain/eta.types';
import { ETA_CONFIG } from '../constants/eta.constants';

interface CacheEntry {
  data: TripEtaDomainResult;
  expiresAt: number;
}

/**
 * EtaCacheService
 * High-performance, in-memory short-lived cache for active trip ETA predictions.
 * Shields the calculation pipeline and database from redundant computation during
 * concurrent student request spikes without introducing unnecessary external Redis dependencies.
 */
@Injectable()
export class EtaCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  get(tripId: string, stopId?: string): TripEtaDomainResult | null {
    const key = this.buildKey(tripId, stopId);
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(
    tripId: string,
    data: TripEtaDomainResult,
    stopId?: string,
    ttlMs: number = ETA_CONFIG.CACHE_TTL_MS,
  ): void {
    const key = this.buildKey(tripId, stopId);
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(tripId: string): void {
    // Invalidate all entries for this trip (both with and without specific stopId)
    for (const key of this.cache.keys()) {
      if (key.startsWith(`trip:${tripId}`)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  private buildKey(tripId: string, stopId?: string): string {
    return stopId ? `trip:${tripId}:stop:${stopId}` : `trip:${tripId}:all`;
  }
}
