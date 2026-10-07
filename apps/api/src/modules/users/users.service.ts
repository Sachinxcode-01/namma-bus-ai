import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository, UserDetails } from './users.repository';
import { AuthRepository } from '../auth/auth.repository';
import { PasswordHasherService } from '../auth/services/password-hasher.service';
import { AuditLogService } from '../auth/services/audit-log.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserRole } from '@prisma/client';
import {
  NotFoundException,
  ConflictException,
  ValidationException,
} from '../../common/errors/app.exception';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authRepository: AuthRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(query: QueryUsersDto): Promise<PaginatedResult<UserDetails>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { users, total } = await this.usersRepository.findMany({
      skip,
      take: limit,
      role: query.role,
      search: query.search,
    });

    return {
      items: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<UserDetails> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User', id);
    }
    return user;
  }

  async createUser(
    dto: CreateUserDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<UserDetails> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    if (dto.role === UserRole.STUDENT && !dto.usn) {
      throw new ValidationException('Student USN is required when creating a STUDENT user.');
    }

    if (dto.role === UserRole.DRIVER && !dto.licenseNumber) {
      throw new ValidationException(
        'Driver license number is required when creating a DRIVER user.',
      );
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);

    const user = await this.usersRepository.createUser({
      email: dto.email,
      passwordHash,
      role: dto.role,
      name: dto.name,
      usn: dto.usn,
      licenseNumber: dto.licenseNumber,
      phone: dto.phone,
    });

    this.logger.log(`User created by Admin: ${user.id} (${user.role} - ${user.email})`);

    await this.auditLogService.recordEvent({
      userId: user.id,
      action: 'AUTH_ADMIN_CREATE_USER',
      resource: 'user',
      resourceId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return user;
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<UserDetails> {
    await this.findOne(id); // Ensure user exists
    const updated = await this.usersRepository.updateStatus(id, dto.isActive);

    // If an account is deactivated, invalidate all their active refresh tokens immediately
    if (!dto.isActive) {
      await this.authRepository.revokeAllUserRefreshTokens(id);
      this.logger.log(`Account deactivated: All active refresh tokens revoked for user ${id}`);
    }

    this.logger.log(`User ${id} status updated to: isActive=${dto.isActive}`);

    await this.auditLogService.recordEvent({
      userId: id,
      action: 'AUTH_USER_STATUS_CHANGE',
      resource: 'user',
      resourceId: id,
      details: { isActive: dto.isActive },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return updated;
  }
}
