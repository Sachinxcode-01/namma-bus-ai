import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/student')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new student account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Student account created and authenticated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email or USN already exists' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  async registerStudent(@Body() dto: RegisterStudentDto): Promise<AuthResponseDto> {
    return this.authService.registerStudent(dto);
  }

  @Post('register/driver')
  @HttpCode(HttpStatus.CREATED)
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
  async registerDriver(@Body() dto: RegisterDriverDto): Promise<AuthResponseDto> {
    return this.authService.registerDriver(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User authenticated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token rotated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke active refresh token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Logged out successfully' })
  async logout(@Body() dto: RefreshTokenDto): Promise<{ message: string }> {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Successfully logged out and session revoked.' };
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
}
