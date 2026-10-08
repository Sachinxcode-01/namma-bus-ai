import { Injectable } from '@nestjs/common';

export interface GpsMetricsSnapshot {
  totalReceived: number;
  acceptedCount: number;
  rejectedCount: number;
  staleCount: number;
  suspiciousCount: number;
  teleportationCount: number;
  duplicateCount: number;
  lastIngestAt: string | null;
  uptimeSeconds: number;
}

@Injectable()
export class GpsMetricsService {
  private totalReceived = 0;
  private acceptedCount = 0;
  private rejectedCount = 0;
  private staleCount = 0;
  private suspiciousCount = 0;
  private teleportationCount = 0;
  private duplicateCount = 0;
  private lastIngestTimestamp: Date | null = null;
  private readonly startedAt = Date.now();

  recordReceived(): void {
    this.totalReceived++;
    this.lastIngestTimestamp = new Date();
  }

  recordAccepted(): void {
    this.acceptedCount++;
  }

  recordRejected(): void {
    this.rejectedCount++;
  }

  recordStale(): void {
    this.staleCount++;
  }

  recordSuspicious(): void {
    this.suspiciousCount++;
  }

  recordTeleportation(): void {
    this.teleportationCount++;
  }

  recordDuplicate(): void {
    this.duplicateCount++;
  }

  getMetricsSnapshot(): GpsMetricsSnapshot {
    return {
      totalReceived: this.totalReceived,
      acceptedCount: this.acceptedCount,
      rejectedCount: this.rejectedCount,
      staleCount: this.staleCount,
      suspiciousCount: this.suspiciousCount,
      teleportationCount: this.teleportationCount,
      duplicateCount: this.duplicateCount,
      lastIngestAt: this.lastIngestTimestamp ? this.lastIngestTimestamp.toISOString() : null,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }

  reset(): void {
    this.totalReceived = 0;
    this.acceptedCount = 0;
    this.rejectedCount = 0;
    this.staleCount = 0;
    this.suspiciousCount = 0;
    this.teleportationCount = 0;
    this.duplicateCount = 0;
    this.lastIngestTimestamp = null;
  }
}
