import { Injectable, Logger } from '@nestjs/common';
import { Route, RouteStop } from '@prisma/client';
import { RoutesRepository, RouteWithStops } from './routes.repository';
import { StopsRepository } from '../stops/stops.repository';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { QueryRoutesDto } from './dto/query-routes.dto';
import { AddRouteStopDto } from './dto/add-route-stop.dto';
import { ReorderRouteStopsDto } from './dto/reorder-route-stops.dto';
import { PaginatedResult } from '../users/users.service';
import {
  ConflictException,
  NotFoundException,
  ValidationException,
} from '../../common/errors/app.exception';

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    private readonly routesRepository: RoutesRepository,
    private readonly stopsRepository: StopsRepository,
  ) {}

  async findAll(query: QueryRoutesDto): Promise<PaginatedResult<Route>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { routes, total } = await this.routesRepository.findMany({
      skip,
      take: limit,
      isActive: query.isActive,
      search: query.search,
    });

    return {
      items: routes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<RouteWithStops> {
    const route = await this.routesRepository.findById(id);
    if (!route) {
      throw new NotFoundException('Route', id);
    }
    return route;
  }

  async create(dto: CreateRouteDto): Promise<Route> {
    const existing = await this.routesRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(`Route with code '${dto.code}' already exists.`);
    }

    const created = await this.routesRepository.create(dto);
    this.logger.log(`Route created: ${created.id} (${created.code})`);
    return created;
  }

  async update(id: string, dto: UpdateRouteDto): Promise<Route> {
    const route = await this.findOne(id);

    if (dto.code && dto.code.toUpperCase() !== route.code) {
      const existing = await this.routesRepository.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Route code '${dto.code}' is already in use.`);
      }
    }

    const updated = await this.routesRepository.update(id, dto);
    this.logger.log(`Route updated: ${updated.id} (${updated.code})`);
    return updated;
  }

  async remove(id: string): Promise<Route> {
    await this.findOne(id);
    const deleted = await this.routesRepository.delete(id);
    this.logger.log(`Route deleted: ${deleted.id} (${deleted.code})`);
    return deleted;
  }

  async addStop(routeId: string, dto: AddRouteStopDto): Promise<RouteStop> {
    const route = await this.findOne(routeId);

    // Verify stop exists
    const stop = await this.stopsRepository.findById(dto.stopId);
    if (!stop) {
      throw new NotFoundException('Stop', dto.stopId);
    }

    // Check if stop is already part of route
    const duplicateStop = route.routeStops.find((rs) => rs.stopId === dto.stopId);
    if (duplicateStop) {
      throw new ConflictException(
        `Stop '${stop.name}' is already assigned to route '${route.code}'.`,
      );
    }

    // Check if sequenceOrder is already occupied
    const duplicateSeq = route.routeStops.find((rs) => rs.sequenceOrder === dto.sequenceOrder);
    if (duplicateSeq) {
      throw new ConflictException(
        `Sequence position ${dto.sequenceOrder} is already occupied on route '${route.code}'.`,
      );
    }

    const routeStop = await this.routesRepository.addStop(routeId, dto);
    this.logger.log(
      `Stop ${dto.stopId} added to Route ${routeId} at sequence ${dto.sequenceOrder}`,
    );
    return routeStop;
  }

  async removeStop(routeId: string, stopId: string): Promise<void> {
    await this.findOne(routeId);
    try {
      await this.routesRepository.removeStop(routeId, stopId);
      this.logger.log(`Stop ${stopId} removed from Route ${routeId}`);
    } catch {
      throw new NotFoundException('RouteStop assignment not found');
    }
  }

  async reorderStops(routeId: string, dto: ReorderRouteStopsDto): Promise<RouteWithStops> {
    await this.findOne(routeId);

    // Business validation: unique stop IDs
    const stopIds = new Set(dto.stops.map((s) => s.stopId));
    if (stopIds.size !== dto.stops.length) {
      throw new ValidationException(['Duplicate stop IDs in reorder payload']);
    }

    // Business validation: unique sequence numbers
    const seqOrders = new Set(dto.stops.map((s) => s.sequenceOrder));
    if (seqOrders.size !== dto.stops.length) {
      throw new ValidationException(['Duplicate sequenceOrder numbers in reorder payload']);
    }

    const updated = await this.routesRepository.reorderStops(routeId, dto.stops);
    this.logger.log(`Route ${routeId} stops reordered successfully`);
    return updated;
  }

  async getStops(routeId: string) {
    const route = await this.findOne(routeId);
    return route.routeStops;
  }
}
