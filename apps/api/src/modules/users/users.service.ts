import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository, UserDetails } from './users.repository';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { NotFoundException } from '../../common/errors/app.exception';

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

  constructor(private readonly usersRepository: UsersRepository) {}

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

  async updateStatus(id: string, dto: UpdateUserStatusDto): Promise<UserDetails> {
    await this.findOne(id); // Ensure user exists
    const updated = await this.usersRepository.updateStatus(id, dto.isActive);
    this.logger.log(`User ${id} status updated to: isActive=${dto.isActive}`);
    return updated;
  }
}
