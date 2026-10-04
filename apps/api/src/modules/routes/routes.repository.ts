import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, Route, RouteStop, Stop } from '@prisma/client';

export type RouteWithDetails = Route & {
  routeStops?: (RouteStop & { stop: Stop })[];
  _count?: {
    routeStops: number;
    trips: number;
    subscriptions: number;
  };
};

export type OrderedRouteStop = RouteStop & { stop: Stop };

@Injectable()
export class RoutesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
  }): Promise<{ routes: RouteWithDetails[]; total: number }> {
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
        include: {
          _count: {
            select: { routeStops: true, trips: true, subscriptions: true },
          },
        },
      }),
      this.prisma.route.count({ where }),
    ]);

    return { routes, total };
  }

  async findById(id: string): Promise<RouteWithDetails | null> {
    return this.prisma.route.findUnique({
      where: { id },
      include: {
        routeStops: {
          orderBy: { sequenceOrder: 'asc' },
          include: {
            stop: true,
          },
        },
        _count: {
          select: { routeStops: true, trips: true, subscriptions: true },
        },
      },
    });
  }

  async findByCode(code: string): Promise<Route | null> {
    return this.prisma.route.findUnique({
      where: { code },
    });
  }

  async create(data: {
    name: string;
    code: string;
    description?: string;
    isActive?: boolean;
  }): Promise<Route> {
    return this.prisma.route.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim() ?? null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      code?: string;
      description?: string;
      isActive?: boolean;
    },
  ): Promise<Route> {
    const updateData: Prisma.RouteUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.code !== undefined) updateData.code = data.code.trim().toUpperCase();
    if (data.description !== undefined) updateData.description = data.description?.trim() ?? null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.prisma.route.update({
      where: { id },
      data: updateData,
    });
  }

  async countTrips(id: string): Promise<number> {
    return this.prisma.trip.count({
      where: { routeId: id },
    });
  }

  async delete(id: string): Promise<Route> {
    return this.prisma.route.delete({
      where: { id },
    });
  }

  async findRouteStops(routeId: string): Promise<OrderedRouteStop[]> {
    return this.prisma.routeStop.findMany({
      where: { routeId },
      orderBy: { sequenceOrder: 'asc' },
      include: {
        stop: true,
      },
    });
  }

  async assignStops(
    routeId: string,
    stops: { stopId: string; sequenceOrder: number; estimatedMinutesFromStart?: number }[],
  ): Promise<OrderedRouteStop[]> {
    const newStopIds = stops.map((s) => s.stopId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Deactivate active subscriptions for stops being removed from this route
      await tx.subscription.updateMany({
        where: {
          routeId,
          stopId: { notIn: newStopIds },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // 2. Remove existing route stops
      await tx.routeStop.deleteMany({
        where: { routeId },
      });

      // 3. Insert new route stops
      await tx.routeStop.createMany({
        data: stops.map((s) => ({
          routeId,
          stopId: s.stopId,
          sequenceOrder: s.sequenceOrder,
          estimatedMinutesFromStart: s.estimatedMinutesFromStart ?? null,
        })),
      });

      // 4. Return refreshed ordered list
      return tx.routeStop.findMany({
        where: { routeId },
        orderBy: { sequenceOrder: 'asc' },
        include: {
          stop: true,
        },
      });
    });
  }
}
