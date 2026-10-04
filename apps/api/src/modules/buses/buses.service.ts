import { Injectable, Logger } from '@nestjs/common';
import { Bus } from '@prisma/client';
import { BusesRepository, BusWithStatus } from './buses.repository';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { QueryBusesDto } from './dto/query-buses.dto';
import { ConflictException, NotFoundException } from '../../common/errors/app.exception';
import { PaginatedResult } from '../users/users.service';

@Injectable()
export class BusesService {
  private readonly logger = new Logger(BusesService.name);

  constructor(private readonly busesRepository: BusesRepository) {}

  async create(dto: CreateBusDto): Promise<Bus> {
    const [existingBusNumber, existingRegNumber] = await Promise.all([
      this.busesRepository.findByBusNumber(dto.busNumber.trim()),
      this.busesRepository.findByRegistrationNumber(dto.registrationNumber.trim().toUpperCase()),
    ]);

    if (existingBusNumber) {
      throw new ConflictException(`Bus with bus number '${dto.busNumber}' already exists.`);
    }

    if (existingRegNumber) {
      throw new ConflictException(
        `Bus with registration number '${dto.registrationNumber}' already exists.`,
      );
    }

    const bus = await this.busesRepository.create(dto);
    this.logger.log(`Bus created: ID=${bus.id}, BusNumber=${bus.busNumber}`);
    return bus;
  }

  async findAll(query: QueryBusesDto): Promise<PaginatedResult<BusWithStatus>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { buses, total } = await this.busesRepository.findMany({
      skip,
      take: limit,
      search: query.search,
      isActive: query.isActive,
    });

    return {
      items: buses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<BusWithStatus> {
    const bus = await this.busesRepository.findById(id);
    if (!bus) {
      throw new NotFoundException('Bus', id);
    }
    return bus;
  }

  async update(id: string, dto: UpdateBusDto): Promise<Bus> {
    const existing = await this.findOne(id);

    if (dto.busNumber && dto.busNumber.trim() !== existing.busNumber) {
      const conflict = await this.busesRepository.findByBusNumber(dto.busNumber.trim());
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Bus with bus number '${dto.busNumber}' already exists.`);
      }
    }

    if (
      dto.registrationNumber &&
      dto.registrationNumber.trim().toUpperCase() !== existing.registrationNumber
    ) {
      const conflict = await this.busesRepository.findByRegistrationNumber(
        dto.registrationNumber.trim().toUpperCase(),
      );
      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Bus with registration number '${dto.registrationNumber}' already exists.`,
        );
      }
    }

    const updated = await this.busesRepository.update(id, dto);
    this.logger.log(`Bus updated: ID=${id}`);
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean; id: string }> {
    await this.findOne(id);

    const tripCount = await this.busesRepository.countTrips(id);
    if (tripCount > 0) {
      throw new ConflictException(
        `Cannot delete bus with ${tripCount} associated trip(s). Deactivate the bus instead.`,
      );
    }

    await this.busesRepository.delete(id);
    this.logger.log(`Bus deleted: ID=${id}`);
    return { deleted: true, id };
  }
}
