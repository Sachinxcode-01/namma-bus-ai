import { NotificationType } from '@prisma/client';

export interface NotificationPayload {
  recipientId: string;
  tripId?: string;
  type: NotificationType;
  title: string;
  body: string;
  deduplicationKey?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationBroadcastEvent {
  id: string;
  recipientId: string;
  tripId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  metadata?: unknown;
  createdAt: string;
}

export interface PushSendResult {
  success: boolean;
  providerMsgId?: string;
  error?: string;
  isInvalidToken?: boolean;
}

export interface CandidateArrival {
  stopId: string;
  firstDetectedAt: Date;
  consecutivePings: number;
  lastDistanceMeters: number;
}

export interface StopArrivalEvaluationResult {
  hasArrived: boolean;
  stopId?: string;
  stopName?: string;
  distanceMeters?: number;
  isStabilized: boolean;
}
