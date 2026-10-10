import { PushSendResult } from '../domain/notification.types';

export interface IPushNotificationProvider {
  /**
   * Dispatches a push notification to a specific device registration token.
   */
  send(
    deviceToken: string,
    title: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<PushSendResult>;

  /**
   * Indicates whether the provider is initialized with active production credentials.
   */
  isConfigured(): boolean;
}
