import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { IPushNotificationProvider } from './push-notification.provider.interface';
import { PushSendResult } from '../domain/notification.types';

@Injectable()
export class FirebasePushService implements IPushNotificationProvider, OnModuleInit {
  private readonly logger = new Logger(FirebasePushService.name);
  private firebaseApp: App | null = null;
  private configured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');

    if (projectId && clientEmail && privateKey) {
      try {
        const apps = getApps();
        if (apps.length === 0) {
          this.firebaseApp = initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        } else {
          this.firebaseApp = getApp();
        }
        this.configured = true;
        this.logger.log(`Firebase Cloud Messaging initialized for project: ${projectId}`);
      } catch (error) {
        this.logger.error(
          `Failed to initialize Firebase Admin SDK: ${(error as Error).message}. Running in dry-run mode.`,
        );
        this.configured = false;
      }
    } else {
      this.logger.log(
        'Firebase credentials not configured (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Push notifications running in dry-run mode.',
      );
      this.configured = false;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async send(
    deviceToken: string,
    title: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<PushSendResult> {
    const maskedToken = this.maskToken(deviceToken);

    // Dry-run mode for local development and integration tests
    if (!this.configured || !this.firebaseApp) {
      this.logger.debug(
        `[DRY-RUN] Push notification simulated for token ${maskedToken}: "${title}" - "${body}"`,
      );
      return {
        success: true,
        providerMsgId: `dry-run-msg-${Date.now()}`,
      };
    }

    try {
      // Serialize string values for FCM data payload
      const stringifiedData: Record<string, string> = {};
      if (metadata) {
        for (const [key, val] of Object.entries(metadata)) {
          if (val !== undefined && val !== null) {
            stringifiedData[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
          }
        }
      }

      const messaging = getMessaging(this.firebaseApp);
      const response = await messaging.send({
        token: deviceToken,
        notification: {
          title,
          body,
        },
        data: stringifiedData,
        android: {
          priority: 'high',
          notification: {
            channelId: 'nammabus_alerts',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      this.logger.debug(
        `Push notification dispatched successfully to ${maskedToken}. Message ID: ${response}`,
      );

      return {
        success: true,
        providerMsgId: response,
      };
    } catch (error: unknown) {
      const fcmError = error as { code?: string; message?: string };
      const errorCode = fcmError.code || 'UNKNOWN';
      const errorMessage = fcmError.message || String(error);

      this.logger.warn(
        `FCM push delivery failed for token ${maskedToken}: [${errorCode}] ${errorMessage}`,
      );

      // Detect permanent token invalidation
      const isInvalidToken =
        errorCode === 'messaging/registration-token-not-registered' ||
        errorCode === 'messaging/invalid-registration-token' ||
        errorCode === 'messaging/invalid-argument';

      return {
        success: false,
        error: `[${errorCode}] ${errorMessage}`,
        isInvalidToken,
      };
    }
  }

  private maskToken(token: string): string {
    if (!token || token.length < 10) return '***';
    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  }
}
