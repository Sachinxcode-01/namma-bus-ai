import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { AuthRepository, UserWithProfile } from './auth.repository';
import { PasswordHasherService } from './services/password-hasher.service';
import { AuditLogService } from './services/audit-log.service';
import { RegisterStudentDto } from './dto/register-student.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ValidationException,
} from '../../common/errors/app.exception';

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessSecret: string;
  private readonly refreshExpiresInDays: number;
  private readonly accessExpiresInSeconds: number;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {
    this.accessSecret =
      this.configService.get<string>('auth.jwtAccessSecret') ||
      process.env.JWT_ACCESS_SECRET ||
      'fallback-secret-for-tests-only';

    // Parse expiration settings
    const accessExp = this.configService.get<string>('auth.jwtAccessExpiresIn') || '15m';
    this.accessExpiresInSeconds = this.parseDurationToSeconds(accessExp);
    this.refreshExpiresInDays = 7; // Default 7 days
  }

  async registerStudent(dto: RegisterStudentDto, meta?: RequestMetadata): Promise<AuthResponseDto> {
    const existing = await this.authRepository.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);

    try {
      const user = await this.authRepository.createStudentUser({
        email: dto.email,
        passwordHash,
        name: dto.name,
        usn: dto.usn,
        phone: dto.phone,
      });

      this.logger.log(`Student registered successfully: ${user.id} (${user.email})`);
      await this.auditLogService.recordEvent({
        userId: user.id,
        action: 'AUTH_REGISTER_STUDENT',
        resource: 'user',
        resourceId: user.id,
        details: { email: user.email, usn: dto.usn },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });

      return this.generateAuthResponse(user);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const pErr = err as { code: string; meta?: { target?: string[] } };
        if (pErr.code === 'P2002') {
          const target = pErr.meta?.target?.join(', ') || 'field';
          throw new ConflictException(`Unique constraint violation on: ${target}`);
        }
      }
      throw err;
    }
  }

  async registerDriver(dto: RegisterDriverDto, meta?: RequestMetadata): Promise<AuthResponseDto> {
    const existing = await this.authRepository.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);

    try {
      const user = await this.authRepository.createDriverUser({
        email: dto.email,
        passwordHash,
        name: dto.name,
        licenseNumber: dto.licenseNumber,
        phone: dto.phone,
      });

      this.logger.log(`Driver registered successfully: ${user.id} (${user.email})`);
      await this.auditLogService.recordEvent({
        userId: user.id,
        action: 'AUTH_REGISTER_DRIVER',
        resource: 'user',
        resourceId: user.id,
        details: { email: user.email, licenseNumber: dto.licenseNumber },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });

      return this.generateAuthResponse(user);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const pErr = err as { code: string; meta?: { target?: string[] } };
        if (pErr.code === 'P2002') {
          const target = pErr.meta?.target?.join(', ') || 'field';
          throw new ConflictException(`Unique constraint violation on: ${target}`);
        }
      }
      throw err;
    }
  }

  async login(dto: LoginDto, meta?: RequestMetadata): Promise<AuthResponseDto> {
    const user = await this.authRepository.findUserByEmail(dto.email);

    if (!user) {
      await this.auditLogService.recordEvent({
        action: 'AUTH_LOGIN_FAILED',
        resource: 'auth',
        details: { email: dto.email, reason: 'USER_NOT_FOUND' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      // Generic error message to prevent user/email enumeration
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isActive) {
      await this.auditLogService.recordEvent({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        resource: 'user',
        resourceId: user.id,
        details: { email: dto.email, reason: 'ACCOUNT_DEACTIVATED' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedException('User account has been deactivated.');
    }

    const isPasswordValid = await this.passwordHasher.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      await this.auditLogService.recordEvent({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        resource: 'user',
        resourceId: user.id,
        details: { email: dto.email, reason: 'INVALID_PASSWORD' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.logger.log(`User logged in successfully: ${user.id} (${user.role})`);
    await this.auditLogService.recordEvent({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      resource: 'user',
      resourceId: user.id,
      details: { role: user.role },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return this.generateAuthResponse(user);
  }

  /**
   * Rotates a refresh token with strict token-reuse breach detection.
   * If an already-revoked refresh token is presented, all active sessions
   * for that user are immediately invalidated to mitigate token exfiltration attacks.
   */
  async refreshTokens(refreshToken: string, meta?: RequestMetadata): Promise<AuthResponseDto> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const existingToken = await this.authRepository.findRefreshToken(tokenHash);

    if (!existingToken) {
      await this.auditLogService.recordEvent({
        action: 'AUTH_TOKEN_REFRESH_FAILED',
        resource: 'refresh_token',
        details: { reason: 'TOKEN_NOT_FOUND' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Token reuse detection: if a revoked token is presented, trigger family revocation!
    if (existingToken.revokedAt !== null) {
      this.logger.error(
        `🚨 Security violation: Compromised refresh token reuse detected for user ${existingToken.userId}. Revoking entire token family.`,
      );

      await this.authRepository.revokeAllUserRefreshTokens(existingToken.userId);

      await this.auditLogService.recordEvent({
        userId: existingToken.userId,
        action: 'AUTH_TOKEN_REUSE_DETECTED',
        resource: 'refresh_token',
        resourceId: existingToken.id,
        details: {
          compromisedTokenId: existingToken.id,
          message: 'Revoked refresh token was presented; all active user sessions revoked.',
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });

      throw new UnauthorizedException(
        'Security violation: Compromised refresh token detected. All active sessions have been terminated for security.',
      );
    }

    // Check expiration
    if (existingToken.expiresAt < new Date()) {
      await this.authRepository.revokeRefreshToken(tokenHash);

      await this.auditLogService.recordEvent({
        userId: existingToken.userId,
        action: 'AUTH_TOKEN_REFRESH_FAILED',
        resource: 'refresh_token',
        resourceId: existingToken.id,
        details: { reason: 'TOKEN_EXPIRED' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });

      throw new UnauthorizedException('Refresh token has expired. Please log in again.');
    }

    if (!existingToken.user.isActive) {
      throw new UnauthorizedException('User account has been deactivated.');
    }

    // Single-use rotation: Revoke current token
    await this.authRepository.revokeRefreshToken(tokenHash);

    await this.auditLogService.recordEvent({
      userId: existingToken.userId,
      action: 'AUTH_TOKEN_ROTATED',
      resource: 'refresh_token',
      resourceId: existingToken.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    // Generate new token pair
    return this.generateAuthResponse(existingToken.user);
  }

  async logout(refreshToken: string, meta?: RequestMetadata): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const existingToken = await this.authRepository.findRefreshToken(tokenHash);

    if (existingToken) {
      await this.authRepository.revokeRefreshToken(tokenHash);

      await this.auditLogService.recordEvent({
        userId: existingToken.userId,
        action: 'AUTH_LOGOUT',
        resource: 'refresh_token',
        resourceId: existingToken.id,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
    }
  }

  async logoutAll(userId: string, meta?: RequestMetadata): Promise<void> {
    await this.authRepository.revokeAllUserRefreshTokens(userId);

    await this.auditLogService.recordEvent({
      userId,
      action: 'AUTH_LOGOUT_ALL',
      resource: 'user',
      resourceId: userId,
      details: { message: 'All active sessions and refresh tokens revoked.' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    meta?: RequestMetadata,
  ): Promise<{ message: string }> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User', userId);
    }

    const isCurrentValid = await this.passwordHasher.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentValid) {
      await this.auditLogService.recordEvent({
        userId,
        action: 'AUTH_PASSWORD_CHANGE_FAILED',
        resource: 'user',
        resourceId: userId,
        details: { reason: 'INVALID_CURRENT_PASSWORD' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedException('Current password verification failed.');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new ValidationException('New password must be different from your current password.');
    }

    const newPasswordHash = await this.passwordHasher.hash(dto.newPassword);
    await this.authRepository.updateUserPassword(userId, newPasswordHash);

    // Security practice: Revoke all refresh tokens on password change to terminate stale sessions
    await this.authRepository.revokeAllUserRefreshTokens(userId);

    await this.auditLogService.recordEvent({
      userId,
      action: 'AUTH_PASSWORD_CHANGE_SUCCESS',
      resource: 'user',
      resourceId: userId,
      details: { message: 'Password updated and all active sessions invalidated.' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    this.logger.log(`Password changed successfully for user: ${userId}`);

    return {
      message:
        'Password changed successfully. All active sessions have been terminated. Please log in again.',
    };
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    return this.mapToUserProfile(user);
  }

  private async generateAuthResponse(user: UserWithProfile): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      studentId: user.student?.id,
      driverId: user.driver?.id,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresInSeconds,
    });

    // High-entropy random refresh token (40 bytes hex = 80 chars)
    const rawRefreshToken = randomBytes(40).toString('hex');
    const tokenHash = this.hashRefreshToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshExpiresInDays);

    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: this.accessExpiresInSeconds,
      tokenType: 'Bearer',
      user: this.mapToUserProfile(user),
    };
  }

  private mapToUserProfile(user: UserWithProfile): UserProfileDto {
    const name = user.student?.name || user.driver?.name;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      studentId: user.student?.id,
      driverId: user.driver?.id,
      name,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token.trim()).digest('hex');
  }

  private parseDurationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 15 mins default

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
