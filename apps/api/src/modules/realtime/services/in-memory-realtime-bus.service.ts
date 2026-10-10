import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Subject, Subscription } from 'rxjs';
import { RealtimeBus, RealtimeSubscription } from '../interfaces/realtime-bus.interface';

/**
 * InMemoryRealtimeBus
 * Single-process pub/sub event bus wrapping RxJS Subject instances.
 * Ideal for local development, test environments, and circuit-breaker fallback.
 */
@Injectable()
export class InMemoryRealtimeBus implements RealtimeBus, OnModuleDestroy {
  private readonly logger = new Logger(InMemoryRealtimeBus.name);
  private readonly channelSubjects = new Map<string, Subject<unknown>>();
  private readonly subscriberCount = new Map<string, number>();

  onModuleDestroy(): void {
    this.logger.log('Disposing InMemoryRealtimeBus channels');
    for (const subject of this.channelSubjects.values()) {
      subject.complete();
    }
    this.channelSubjects.clear();
    this.subscriberCount.clear();
  }

  private getOrCreateSubject(channel: string): Subject<unknown> {
    let subject = this.channelSubjects.get(channel);
    if (!subject) {
      subject = new Subject<unknown>();
      this.channelSubjects.set(channel, subject);
      this.subscriberCount.set(channel, 0);
    }
    return subject;
  }

  publish(channel: string, payload: unknown): void {
    const subject = this.channelSubjects.get(channel);
    if (subject && !subject.closed) {
      subject.next(payload);
    }
  }

  subscribe(channel: string, handler: (payload: unknown) => void): RealtimeSubscription {
    const subject = this.getOrCreateSubject(channel);
    const count = (this.subscriberCount.get(channel) || 0) + 1;
    this.subscriberCount.set(channel, count);

    const subscription: Subscription = subject.subscribe({
      next: (data) => {
        try {
          handler(data);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Error in subscriber handler for channel ${channel}: ${msg}`);
        }
      },
    });

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
        const current = this.subscriberCount.get(channel) || 1;
        this.subscriberCount.set(channel, Math.max(0, current - 1));
      },
    };
  }

  getActiveSubscribersCount(channel?: string): number {
    if (channel) {
      return this.subscriberCount.get(channel) || 0;
    }
    let total = 0;
    for (const count of this.subscriberCount.values()) {
      total += count;
    }
    return total;
  }
}
