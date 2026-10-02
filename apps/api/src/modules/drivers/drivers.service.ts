import { Injectable, Logger } from '@nestjs/common';
import { DriversRepository, DriverWithUser } from './drivers.repository';
import { QueryDriversDto } from './dto/query-drivers.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { PaginatedResult } from '../users/users.service';
import { ConflictException, NotFoundException } from '../../common/errors/app.exception';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(private readonly driversRepository: DriversRepository) {}

  async findAll(query: QueryDriversDto): Promise<PaginatedResult<DriverWithUser>> {
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

  async findOne(id: string): Promise<DriverWithUser> {
    const driver = await this.driversRepository.findById(id);
    if (!driver) {
      throw new NotFoundException('Driver', id);
    }
    return driver;
  }

  async update(id: string, dto: UpdateDriverDto): Promise<DriverWithUser> {
    const driver = await this.findOne(id);

    if (dto.licenseNumber && dto.licenseNumber.toUpperCase() !== driver.licenseNumber) {
      const existing = await this.driversRepository.findByLicenseNumber(dto.licenseNumber);
      if (existing && existing.id !== id) {
        throw new ConflictException(`License number '${dto.licenseNumber}' is already in use.`);
      }
    }

    const updated = await this.driversRepository.update(id, dto);
    this.logger.log(`Driver updated: ${updated.id} (${updated.name})`);
    return updated;
  }
}
