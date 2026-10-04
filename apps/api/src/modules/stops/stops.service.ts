import { Injectable, Logger } from '@nestjs/common';
import { Stop } from '@prisma/client';
import { StopsRepository, StopWithRelations } from './stops.repository';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { QueryStopsDto } from './dto/query-stops.dto';
import { ConflictException, NotFoundException } from '../../common/errors/app.exception';
import { PaginatedResult } from '../users/users.service';

@Injectable()
export class StopsService {
  private readonly logger = new Logger(StopsService.name);

  constructor(private readonly stopsRepository: StopsRepository) {}

  async create(dto: CreateStopDto): Promise<Stop> {
    const existing = await this.stopsRepository.findByCode(dto.code.trim().toUpperCase());
    if (existing) {
      throw new ConflictException(`Stop with code '${dto.code}' already exists.`);
    }

    const stop = await this.stopsRepository.create(dto);
    this.logger.log(`Stop created: ID=${stop.id}, Code=${stop.code}`);
    return stop;
  }

  async findAll(query: QueryStopsDto): Promise<PaginatedResult<StopWithRelations>> {
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

  async findOne(id: string): Promise<StopWithRelations> {
    const stop = await this.stopsRepository.findById(id);
    if (!stop) {
      throw new NotFoundException('Stop', id);
    }
    return stop;
  }

  async update(id: string, dto: UpdateStopDto): Promise<Stop> {
    const existing = await this.findOne(id);

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const conflict = await this.stopsRepository.findByCode(dto.code.trim().toUpperCase());
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Stop with code '${dto.code}' already exists.`);
      }
    }

    const updated = await this.stopsRepository.update(id, dto);
    this.logger.log(`Stop updated: ID=${id}, Code=${updated.code}`);
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean; id: string }> {
    await this.findOne(id);

    const [routeStopCount, subCount] = await Promise.all([
      this.stopsRepository.countRouteStops(id),
      this.stopsRepository.countSubscriptions(id),
    ]);

    if (routeStopCount > 0) {
      throw new ConflictException(
        `Cannot delete stop assigned to ${routeStopCount} route(s). Remove it from all routes first.`,
      );
    }

    if (subCount > 0) {
      throw new ConflictException(
        `Cannot delete stop with ${subCount} active student subscription(s).`,
      );
    }

    await this.stopsRepository.delete(id);
    this.logger.log(`Stop deleted: ID=${id}`);
    return { deleted: true, id };
  }
}
