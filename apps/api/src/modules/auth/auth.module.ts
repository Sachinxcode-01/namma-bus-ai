import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { PasswordHasherService } from './services/password-hasher.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { AuditLogService } from './services/audit-log.service';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('auth.jwtAccessSecret') ||
          process.env.JWT_ACCESS_SECRET ||
          'fallback-dev-secret',
        signOptions: {
          expiresIn: configService.get<string>('auth.jwtAccessExpiresIn') || '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    PasswordHasherService,
    AuditLogService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    RateLimitGuard,
  ],
  exports: [
    AuthService,
    AuthRepository,
    PasswordHasherService,
    AuditLogService,
    JwtAuthGuard,
    RolesGuard,
    RateLimitGuard,
    JwtModule,
  ],
})
export class AuthModule {}
