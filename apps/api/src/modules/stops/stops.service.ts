import { Injectable, Logger } from '@nestjs/common';
import { Stop } from '@prisma/client';
import { StopsRepository } from './stops.repository';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { QueryStopsDto } from './dto/query-stops.dto';
import { PaginatedResult } from '../users/users.service';
import { ConflictException, NotFoundException } from '../../common/errors/app.exception';

@Injectable()
export class StopsService {
  private readonly logger = new Logger(StopsService.name);

  constructor(private readonly stopsRepository: StopsRepository) {}

  async findAll(query: QueryStopsDto): Promise<PaginatedResult<Stop>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { stops, total } = await this.stopsRepository.findMany({
      skip,
      take: limit,
      search: query.search,
    });

    return {
      items: stops,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<Stop> {
    const stop = await this.stopsRepository.findById(id);
    if (!stop) {
      throw new NotFoundException('Stop', id);
    }
    return stop;
  }

  async create(dto: CreateStopDto): Promise<Stop> {
    const existing = await this.stopsRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(`Stop with code '${dto.code}' already exists.`);
    }

    const stop = await this.stopsRepository.create(dto);
    this.logger.log(`Stop created: ${stop.id} (${stop.name}, code=${stop.code})`);
    return stop;
  }

  async update(id: string, dto: UpdateStopDto): Promise<Stop> {
    const stop = await this.findOne(id);

    if (dto.code && dto.code.toUpperCase() !== stop.code) {
      const existing = await this.stopsRepository.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Stop code '${dto.code}' is already in use.`);
      }
    }

    const updated = await this.stopsRepository.update(id, dto);
    this.logger.log(`Stop updated: ${updated.id} (${updated.code})`);
    return updated;
  }

  async remove(id: string): Promise<Stop> {
    await this.findOne(id);
    const deleted = await this.stopsRepository.delete(id);
    this.logger.log(`Stop deleted: ${deleted.id} (${deleted.code})`);
    return deleted;
  }
}
