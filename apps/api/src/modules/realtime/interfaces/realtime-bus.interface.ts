export interface RealtimeSubscription {
  unsubscribe(): void;
}

export interface RealtimeBus {
  /**
   * Publishes a message to a specific broadcast channel.
   * In a distributed setup, all subscribing instances receive this event.
   */
  publish(channel: string, payload: unknown): Promise<void> | void;

  /**
   * Subscribes a local listener handler to a distributed channel.
   */
  subscribe(channel: string, handler: (payload: unknown) => void): RealtimeSubscription;

  /**
   * Returns active subscription / connection counts for monitoring and health reporting.
   */
  getActiveSubscribersCount?(channel?: string): number;
}

export const REALTIME_BUS = Symbol('REALTIME_BUS');
