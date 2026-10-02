import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Route, RouteStop, Prisma } from '@prisma/client';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { AddRouteStopDto } from './dto/add-route-stop.dto';

export type RouteWithStops = Route & {
  routeStops: (RouteStop & {
    stop: {
      id: string;
      name: string;
      code: string;
      latitude: number;
      longitude: number;
      geofenceRadiusMeters: number;
    };
  })[];
};

@Injectable()
export class RoutesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip: number;
    take: number;
    isActive?: boolean;
    search?: string;
  }): Promise<{ routes: Route[]; total: number }> {
    const where: Prisma.RouteWhereInput = {};

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [routes, total] = await Promise.all([
      this.prisma.route.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { code: 'asc' },
      }),
      this.prisma.route.count({ where }),
    ]);

    return { routes, total };
  }

  async findById(id: string): Promise<RouteWithStops | null> {
    return this.prisma.route.findUnique({
      where: { id },
      include: {
        routeStops: {
          include: {
            stop: {
              select: {
                id: true,
                name: true,
                code: true,
                latitude: true,
                longitude: true,
                geofenceRadiusMeters: true,
              },
            },
          },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });
  }

  async findByCode(code: string): Promise<Route | null> {
    return this.prisma.route.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
  }

  async create(data: CreateRouteDto): Promise<Route> {
    return this.prisma.route.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim(),
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async update(id: string, data: UpdateRouteDto): Promise<Route> {
    return this.prisma.route.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async delete(id: string): Promise<Route> {
    return this.prisma.route.delete({
      where: { id },
    });
  }

  async addStop(routeId: string, data: AddRouteStopDto): Promise<RouteStop> {
    return this.prisma.routeStop.create({
      data: {
        routeId,
        stopId: data.stopId,
        sequenceOrder: data.sequenceOrder,
        estimatedMinutesFromStart: data.estimatedMinutesFromStart,
      },
      include: {
        stop: true,
      },
    });
  }

  async removeStop(routeId: string, stopId: string): Promise<void> {
    await this.prisma.routeStop.delete({
      where: {
        routeId_stopId: {
          routeId,
          stopId,
        },
      },
    });
  }

  async reorderStops(routeId: string, stops: AddRouteStopDto[]): Promise<RouteWithStops> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Remove existing route stops
      await tx.routeStop.deleteMany({
        where: { routeId },
      });

      // 2. Insert reordered route stops
      await tx.routeStop.createMany({
        data: stops.map((s) => ({
          routeId,
          stopId: s.stopId,
          sequenceOrder: s.sequenceOrder,
          estimatedMinutesFromStart: s.estimatedMinutesFromStart,
        })),
      });

      // 3. Return updated route with ordered stops
      const updatedRoute = await tx.route.findUnique({
        where: { id: routeId },
        include: {
          routeStops: {
            include: {
              stop: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  latitude: true,
                  longitude: true,
                  geofenceRadiusMeters: true,
                },
              },
            },
            orderBy: { sequenceOrder: 'asc' },
          },
        },
      });

      return updatedRoute!;
    });
  }
}
