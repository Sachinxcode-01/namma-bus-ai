import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

/**
 * SseRateLimitGuard
 * Protects real-time SSE streaming endpoints against connection-exhaustion DoS attacks.
 * Tracks active concurrent SSE sockets per authenticated user ID and per client IP address.
 * Automatically releases tracking counters upon socket termination ('close' event).
 */
@Injectable()
export class SseRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(SseRateLimitGuard.name);

  // Active concurrent connection counters
  private readonly userConnections = new Map<string, number>();
  private readonly ipConnections = new Map<string, number>();

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: AuthenticatedUser }>();
    const res = http.getResponse<Response>();

    const maxPerUser = this.configService.get<number>(
      'realtime.sseMaxConcurrentPerUser',
      10,
    );
    const maxPerIp = this.configService.get<number>(
      'realtime.sseMaxConcurrentPerIp',
      30,
    );

    const clientIp = this.extractClientIp(req);
    const userId = req.user?.id;

    // Check IP limit
    const currentIpCount = this.ipConnections.get(clientIp) || 0;
    if (currentIpCount >= maxPerIp) {
      this.logger.warn(`SSE rate limit exceeded for IP: ${clientIp} (${currentIpCount}/${maxPerIp})`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          errorCode: 'TOO_MANY_CONNECTIONS',
          errorMessage: 'Concurrent real-time stream limit exceeded for IP address.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check User limit (if authenticated)
    if (userId) {
      const currentUserCount = this.userConnections.get(userId) || 0;
      if (currentUserCount >= maxPerUser) {
        this.logger.warn(`SSE rate limit exceeded for User: ${userId} (${currentUserCount}/${maxPerUser})`);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            errorCode: 'TOO_MANY_CONNECTIONS',
            errorMessage: 'Concurrent real-time stream limit exceeded for user account.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Increment active connection counts
    this.ipConnections.set(clientIp, currentIpCount + 1);
    if (userId) {
      this.userConnections.set(userId, (this.userConnections.get(userId) || 0) + 1);
    }

    // Decrement when socket closes
    res.on('close', () => {
      const remainingIp = Math.max(0, (this.ipConnections.get(clientIp) || 1) - 1);
      if (remainingIp === 0) {
        this.ipConnections.delete(clientIp);
      } else {
        this.ipConnections.set(clientIp, remainingIp);
      }

      if (userId) {
        const remainingUser = Math.max(0, (this.userConnections.get(userId) || 1) - 1);
        if (remainingUser === 0) {
          this.userConnections.delete(userId);
        } else {
          this.userConnections.set(userId, remainingUser);
        }
      }
    });

    return true;
  }

  private extractClientIp(req: Request): string {
    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  }

  /**
   * Diagnostic inspection of active stream connection counts.
   */
  getActiveConnectionsSummary(): { totalByIp: number; totalByUser: number } {
    let totalByIp = 0;
    for (const count of this.ipConnections.values()) totalByIp += count;
    let totalByUser = 0;
    for (const count of this.userConnections.values()) totalByUser += count;
    return { totalByIp, totalByUser };
  }
}
