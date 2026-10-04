import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, Stop } from '@prisma/client';

export type StopWithRelations = Stop & {
  _count?: {
    routeStops: number;
    subscriptions: number;
  };
};

@Injectable()
export class StopsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<{ stops: StopWithRelations[]; total: number }> {
    const where: Prisma.StopWhereInput = {};

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [stops, total] = await Promise.all([
      this.prisma.stop.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { routeStops: true, subscriptions: true },
          },
        },
      }),
      this.prisma.stop.count({ where }),
    ]);

    return { stops, total };
  }

  async findById(id: string): Promise<StopWithRelations | null> {
    return this.prisma.stop.findUnique({
      where: { id },
      include: {
        _count: {
          select: { routeStops: true, subscriptions: true },
        },
      },
    });
  }

  async findByCode(code: string): Promise<Stop | null> {
    return this.prisma.stop.findUnique({
      where: { code },
    });
  }

  async create(data: {
    name: string;
    code: string;
    latitude: number;
    longitude: number;
    geofenceRadiusMeters?: number;
  }): Promise<Stop> {
    return this.prisma.stop.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        latitude: data.latitude,
        longitude: data.longitude,
        geofenceRadiusMeters: data.geofenceRadiusMeters ?? 50.0,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      code?: string;
      latitude?: number;
      longitude?: number;
      geofenceRadiusMeters?: number;
    },
  ): Promise<Stop> {
    const updateData: Prisma.StopUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.code !== undefined) updateData.code = data.code.trim().toUpperCase();
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.geofenceRadiusMeters !== undefined) {
      updateData.geofenceRadiusMeters = data.geofenceRadiusMeters;
    }

    return this.prisma.stop.update({
      where: { id },
      data: updateData,
    });
  }

  async countRouteStops(id: string): Promise<number> {
    return this.prisma.routeStop.count({
      where: { stopId: id },
    });
  }

  async countSubscriptions(id: string): Promise<number> {
    return this.prisma.subscription.count({
      where: { stopId: id },
    });
  }

  async delete(id: string): Promise<Stop> {
    return this.prisma.stop.delete({
      where: { id },
    });
  }
}
