import { Injectable, Logger } from '@nestjs/common';
import { DeviceToken } from '@prisma/client';
import { NotificationsRepository } from '../notifications.repository';
import { RegisterDeviceTokenDto } from '../dto/register-device-token.dto';
import { ForbiddenException, NotFoundException } from '../../../common/errors/app.exception';

@Injectable()
export class DeviceTokensService {
  private readonly logger = new Logger(DeviceTokensService.name);

  constructor(private readonly repository: NotificationsRepository) {}

  /**
   * Registers or updates an FCM device token for an authenticated user.
   * If the token was previously registered to another account (e.g., shared/reassigned device),
   * it is safely reassigned to the current authenticated user.
   */
  async register(userId: string, dto: RegisterDeviceTokenDto): Promise<DeviceToken> {
    const masked = this.maskToken(dto.token);
    this.logger.log(
      `Registering device token for user ${userId}: ${masked} (${dto.platform || 'unknown'})`,
    );

    return this.repository.upsertDeviceToken({
      userId,
      token: dto.token,
      platform: dto.platform,
      deviceModel: dto.deviceModel,
    });
  }

  /**
   * Unregisters a device token for the authenticated user.
   * Enforces strict ownership: users can only unregister their own tokens.
   */
  async unregister(userId: string, token: string): Promise<{ success: boolean }> {
    const existing = await this.repository.findDeviceToken(token);
    if (!existing) {
      throw new NotFoundException('Device token');
    }

    if (existing.userId !== userId) {
      this.logger.warn(
        `User ${userId} attempted unauthorized unregistration of device token owned by user ${existing.userId}`,
      );
      throw new ForbiddenException(
        'You are not authorized to unregister another user’s device token.',
      );
    }

    const masked = this.maskToken(token);
    this.logger.log(`Deactivating device token for user ${userId}: ${masked}`);

    await this.repository.deactivateDeviceToken(token);
    return { success: true };
  }

  /**
   * Deactivates a token permanently rejected by FCM (e.g. unregistered or invalid).
   */
  async deactivateInvalidToken(token: string, reason?: string): Promise<void> {
    const masked = this.maskToken(token);
    this.logger.warn(
      `Deactivating invalid FCM token ${masked}. Reason: ${reason || 'unregistered'}`,
    );
    await this.repository.deactivateDeviceToken(token);
  }

  /**
   * Retrieves all active device tokens for a given user.
   */
  async getActiveTokens(userId: string): Promise<DeviceToken[]> {
    return this.repository.findActiveTokensByUserId(userId);
  }

  private maskToken(token: string): string {
    if (!token || token.length < 10) return '***';
    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  }
}
