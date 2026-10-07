import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export interface SecurityEventParams {
  userId?: string | null;
  action: string;
  resource?: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a security/authentication event both to the PostgreSQL audit_logs table
   * and to structured Pino stdout logs. Automatically redacts any sensitive credential keys.
   */
  async recordEvent(params: SecurityEventParams): Promise<void> {
    const sanitizedDetails = this.sanitizeDetails(params.details);

    this.logger.log(
      JSON.stringify({
        event: 'SECURITY_AUDIT',
        action: params.action,
        userId: params.userId || 'anonymous',
        resource: params.resource || 'auth',
        resourceId: params.resourceId,
        details: sanitizedDetails,
        ipAddress: params.ipAddress,
        timestamp: new Date().toISOString(),
      }),
    );

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          resource: params.resource || 'auth',
          resourceId: params.resourceId || null,
          details: sanitizedDetails ? JSON.parse(JSON.stringify(sanitizedDetails)) : undefined,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (err: unknown) {
      // Never let an audit logging write failure interrupt the user's primary transaction
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to persist audit log entry to database: ${errorMsg}`);
    }
  }

  /**
   * Recursively sanitizes any keys resembling secrets, passwords, or tokens.
   */
  private sanitizeDetails(
    details?: Record<string, unknown> | null,
  ): Record<string, unknown> | undefined {
    if (!details) return undefined;

    const sensitiveKeys = [
      'password',
      'passwordhash',
      'currentpassword',
      'newpassword',
      'accesstoken',
      'refreshtoken',
      'token',
      'secret',
      'authorization',
    ];

    const clean: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        clean[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        clean[key] = this.sanitizeDetails(value as Record<string, unknown>);
      } else {
        clean[key] = value;
      }
    }

    return clean;
  }
}
