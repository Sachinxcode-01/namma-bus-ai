import { Injectable, Logger } from '@nestjs/common';
import { Bus } from '@prisma/client';
import { BusesRepository } from './buses.repository';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { QueryBusesDto } from './dto/query-buses.dto';
import { PaginatedResult } from '../users/users.service';
import { ConflictException, NotFoundException } from '../../common/errors/app.exception';

@Injectable()
export class BusesService {
  private readonly logger = new Logger(BusesService.name);

  constructor(private readonly busesRepository: BusesRepository) {}

  async findAll(query: QueryBusesDto): Promise<PaginatedResult<Bus>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { buses, total } = await this.busesRepository.findMany({
      skip,
      take: limit,
      isActive: query.isActive,
      search: query.search,
    });

    return {
      items: buses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<Bus> {
    const bus = await this.busesRepository.findById(id);
    if (!bus) {
      throw new NotFoundException('Bus', id);
    }
    return bus;
  }

  async create(dto: CreateBusDto): Promise<Bus> {
    const existingBusNum = await this.busesRepository.findByBusNumber(dto.busNumber);
    if (existingBusNum) {
      throw new ConflictException(`Bus number '${dto.busNumber}' is already registered.`);
    }

    const existingReg = await this.busesRepository.findByRegistrationNumber(dto.registrationNumber);
    if (existingReg) {
      throw new ConflictException(
        `Registration number '${dto.registrationNumber}' is already registered.`,
      );
    }

    const created = await this.busesRepository.create(dto);
    this.logger.log(`Bus created: ${created.id} (${created.busNumber})`);
    return created;
  }

  async update(id: string, dto: UpdateBusDto): Promise<Bus> {
    const bus = await this.findOne(id);

    if (dto.busNumber && dto.busNumber.toUpperCase() !== bus.busNumber) {
      const existing = await this.busesRepository.findByBusNumber(dto.busNumber);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Bus number '${dto.busNumber}' is already in use.`);
      }
    }

    if (dto.registrationNumber && dto.registrationNumber.toUpperCase() !== bus.registrationNumber) {
      const existing = await this.busesRepository.findByRegistrationNumber(dto.registrationNumber);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Registration number '${dto.registrationNumber}' is already in use.`,
        );
      }
    }

    const updated = await this.busesRepository.update(id, dto);
    this.logger.log(`Bus updated: ${updated.id} (${updated.busNumber})`);
    return updated;
  }

  async remove(id: string): Promise<Bus> {
    await this.findOne(id);
    try {
      const deleted = await this.busesRepository.delete(id);
      this.logger.log(`Bus deleted: ${deleted.id} (${deleted.busNumber})`);
      return deleted;
    } catch {
      // If bus has trips linked to it, toggle active status instead of hard deletion
      const deactivated = await this.busesRepository.update(id, { isActive: false });
      this.logger.log(`Bus ${id} has relational references, soft-deactivated (isActive=false).`);
      return deactivated;
    }
  }
}
