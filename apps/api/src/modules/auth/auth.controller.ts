import { Controller, Post, Get, Body, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/student')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ limit: 5, ttlSeconds: 60 })
  @ApiOperation({ summary: 'Register a new student account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Student account created and authenticated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email or USN already exists' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  async registerStudent(
    @Body() dto: RegisterStudentDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.registerStudent(dto, this.extractMeta(req));
  }

  @Post('register/driver')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ limit: 5, ttlSeconds: 60 })
  @ApiOperation({ summary: 'Register a new driver account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Driver account created and authenticated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email or license number already exists',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  async registerDriver(
    @Body() dto: RegisterDriverDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.registerDriver(dto, this.extractMeta(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, ttlSeconds: 60 })
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User authenticated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid email or password' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.login(dto, this.extractMeta(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 20, ttlSeconds: 60 })
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token rotated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid, expired, or compromised refresh token',
  })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(dto.refreshToken, this.extractMeta(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke active refresh token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Logged out successfully' })
  async logout(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<{ message: string }> {
    await this.authService.logout(dto.refreshToken, this.extractMeta(req));
    return { message: 'Successfully logged out and session revoked.' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer-jwt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all active sessions and refresh tokens for current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All active sessions revoked successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid token' })
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.authService.logoutAll(user.id, this.extractMeta(req));
    return { message: 'All active sessions have been successfully revoked.' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer-jwt')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, ttlSeconds: 300 })
  @ApiOperation({ summary: 'Change password for currently authenticated user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully and all active sessions invalidated',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Current password verification failed or missing token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or new password identical to current',
  })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(user.id, dto, this.extractMeta(req));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer-jwt')
  @ApiOperation({ summary: 'Retrieve currently authenticated user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile returned',
    type: UserProfileDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid token' })
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileDto> {
    return this.authService.getProfile(user.id);
  }

  private extractMeta(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === 'string'
        ? forwarded.split(',')[0]
        : req.ip;

    return {
      ipAddress: ip?.trim() || req.socket?.remoteAddress || '127.0.0.1',
      userAgent: (req.headers['user-agent'] as string) || undefined,
    };
  }
}
