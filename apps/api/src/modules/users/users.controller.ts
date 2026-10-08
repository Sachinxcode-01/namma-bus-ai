import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { UsersService, PaginatedResult } from './users.service';
import { UserDetails } from './users.repository';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ForbiddenException } from '../../common/errors/app.exception';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user account with role (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'User account created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already exists' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async create(@Body() dto: CreateUserDto, @Req() req: Request): Promise<UserDetails> {
    return this.usersService.createUser(dto, this.extractMeta(req));
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users with pagination and filtering (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated user list returned' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async findAll(@Query() query: QueryUsersDto): Promise<PaginatedResult<UserDetails>> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID (Admin or account owner)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User details returned' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to view this account' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserDetails> {
    // Non-admin users may only view their own record (Rule 12: Resource ownership)
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You are not authorized to view another user profile.');
    }
    return this.usersService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate a user account (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User account status updated' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: Request,
  ): Promise<UserDetails> {
    return this.usersService.updateStatus(id, dto, this.extractMeta(req));
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
