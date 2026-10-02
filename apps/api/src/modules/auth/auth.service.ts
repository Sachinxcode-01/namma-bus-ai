import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { AuthRepository, UserWithProfile } from './auth.repository';
import { PasswordHasherService } from './services/password-hasher.service';
import { RegisterStudentDto } from './dto/register-student.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '../../common/errors/app.exception';

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

  async registerStudent(dto: RegisterStudentDto): Promise<AuthResponseDto> {
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

  async registerDriver(dto: RegisterDriverDto): Promise<AuthResponseDto> {
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

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.authRepository.findUserByEmail(dto.email);

    if (!user) {
      // Use generic error to prevent email enumeration
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account has been deactivated.');
    }

    const isPasswordValid = await this.passwordHasher.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.logger.log(`User logged in successfully: ${user.id} (${user.role})`);
    return this.generateAuthResponse(user);
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const existingToken = await this.authRepository.findValidRefreshToken(tokenHash);

    if (!existingToken) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    if (!existingToken.user.isActive) {
      throw new UnauthorizedException('User account has been deactivated.');
    }

    // Revoke old token to enforce rotation
    await this.authRepository.revokeRefreshToken(tokenHash);

    // Generate new token pair
    return this.generateAuthResponse(existingToken.user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.authRepository.revokeRefreshToken(tokenHash);
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

    // High-entropy random refresh token
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
