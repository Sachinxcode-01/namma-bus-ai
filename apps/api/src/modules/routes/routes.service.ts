import { Injectable, Logger } from '@nestjs/common';
import { Route } from '@prisma/client';
import { RoutesRepository, RouteWithDetails, OrderedRouteStop } from './routes.repository';
import { StopsRepository } from '../stops/stops.repository';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { QueryRoutesDto } from './dto/query-routes.dto';
import { AssignRouteStopsDto } from './dto/assign-route-stops.dto';
import {
  ConflictException,
  NotFoundException,
  ValidationException,
} from '../../common/errors/app.exception';
import { PaginatedResult } from '../users/users.service';

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    private readonly routesRepository: RoutesRepository,
    private readonly stopsRepository: StopsRepository,
  ) {}

  async create(dto: CreateRouteDto): Promise<Route> {
    const existing = await this.routesRepository.findByCode(dto.code.trim().toUpperCase());
    if (existing) {
      throw new ConflictException(`Route with code '${dto.code}' already exists.`);
    }

    const route = await this.routesRepository.create(dto);
    this.logger.log(`Route created: ID=${route.id}, Code=${route.code}`);
    return route;
  }

  async findAll(query: QueryRoutesDto): Promise<PaginatedResult<RouteWithDetails>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { routes, total } = await this.routesRepository.findMany({
      skip,
      take: limit,
      search: query.search,
      isActive: query.isActive,
    });

    return {
      items: routes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<RouteWithDetails> {
    const route = await this.routesRepository.findById(id);
    if (!route) {
      throw new NotFoundException('Route', id);
    }
    return route;
  }

  async update(id: string, dto: UpdateRouteDto): Promise<Route> {
    const existing = await this.findOne(id);

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const conflict = await this.routesRepository.findByCode(dto.code.trim().toUpperCase());
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Route with code '${dto.code}' already exists.`);
      }
    }

    const updated = await this.routesRepository.update(id, dto);
    this.logger.log(`Route updated: ID=${id}, Code=${updated.code}`);
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean; id: string }> {
    await this.findOne(id);

    const tripCount = await this.routesRepository.countTrips(id);
    if (tripCount > 0) {
      throw new ConflictException(
        `Cannot delete route with ${tripCount} associated trip(s). Deactivate the route instead.`,
      );
    }

    await this.routesRepository.delete(id);
    this.logger.log(`Route deleted: ID=${id}`);
    return { deleted: true, id };
  }

  async assignStops(routeId: string, dto: AssignRouteStopsDto): Promise<OrderedRouteStop[]> {
    await this.findOne(routeId);

    // Validate unique stopIds within the assigned route stops
    const stopIds = dto.stops.map((s) => s.stopId);
    const uniqueStopIds = new Set(stopIds);
    if (uniqueStopIds.size !== stopIds.length) {
      throw new ValidationException('Duplicate stopId found in the assigned stops list.');
    }

    // Validate unique sequenceOrder within the assigned route stops
    const sequences = dto.stops.map((s) => s.sequenceOrder);
    const uniqueSequences = new Set(sequences);
    if (uniqueSequences.size !== sequences.length) {
      throw new ValidationException('Duplicate sequenceOrder found in the assigned stops list.');
    }

    // Validate that all specified stop IDs actually exist in database
    await Promise.all(
      stopIds.map(async (stopId) => {
        const stop = await this.stopsRepository.findById(stopId);
        if (!stop) {
          throw new NotFoundException('Stop', stopId);
        }
      }),
    );

    // Sort by sequenceOrder before persisting
    const sortedStops = [...dto.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    const assigned = await this.routesRepository.assignStops(routeId, sortedStops);
    this.logger.log(`Assigned ${assigned.length} stops to route ${routeId}`);
    return assigned;
  }

  async getStops(routeId: string): Promise<OrderedRouteStop[]> {
    await this.findOne(routeId);
    return this.routesRepository.findRouteStops(routeId);
  }
}
