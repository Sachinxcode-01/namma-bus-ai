import { Injectable, Logger } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { DriversRepository, DriverWithDetails } from './drivers.repository';
import { QueryDriversDto } from './dto/query-drivers.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../common/errors/app.exception';
import { PaginatedResult } from '../users/users.service';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(private readonly driversRepository: DriversRepository) {}

  async findAll(query: QueryDriversDto): Promise<PaginatedResult<DriverWithDetails>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { drivers, total } = await this.driversRepository.findMany({
      skip,
      take: limit,
      search: query.search,
    });

    return {
      items: drivers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<DriverWithDetails> {
    const driver = await this.driversRepository.findById(id);
    if (!driver) {
      throw new NotFoundException('Driver', id);
    }
    return driver;
  }

  async findByUserId(userId: string): Promise<DriverWithDetails> {
    const driver = await this.driversRepository.findByUserId(userId);
    if (!driver) {
      throw new NotFoundException('Driver with associated user ID', userId);
    }
    return driver;
  }

  async update(
    id: string,
    dto: UpdateDriverDto,
    currentUser: AuthenticatedUser,
  ): Promise<DriverWithDetails> {
    const existing = await this.findOne(id);

    // Rule 12: Resource-level authorization
    const isOwner = existing.userId === currentUser.id;
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You are not authorized to update another driver profile.');
    }

    const normalizedLicense = dto.licenseNumber
      ? dto.licenseNumber.trim().toUpperCase()
      : undefined;

    if (normalizedLicense && !isAdmin && normalizedLicense !== existing.licenseNumber) {
      throw new ForbiddenException(
        'Only administrators can update driver commercial license numbers.',
      );
    }

    if (normalizedLicense && normalizedLicense !== existing.licenseNumber) {
      const conflict = await this.driversRepository.findByLicenseNumber(normalizedLicense);
      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Driver with license number '${dto.licenseNumber}' already exists.`,
        );
      }
    }

    try {
      const updated = await this.driversRepository.update(id, {
        ...dto,
        licenseNumber: normalizedLicense,
      });
      this.logger.log(`Driver updated: ID=${id}, Name=${updated.name}`);
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          `Driver with license number '${dto.licenseNumber}' already exists.`,
        );
      }
      throw error;
    }
  }
}
