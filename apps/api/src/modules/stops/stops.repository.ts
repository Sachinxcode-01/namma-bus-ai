import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Stop, Prisma } from '@prisma/client';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';

@Injectable()
export class StopsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<{ stops: Stop[]; total: number }> {
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
      }),
      this.prisma.stop.count({ where }),
    ]);

    return { stops, total };
  }

  async findById(id: string): Promise<Stop | null> {
    return this.prisma.stop.findUnique({
      where: { id },
      include: {
        routeStops: {
          include: {
            route: { select: { id: true, code: true, name: true } },
          },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });
  }

  async findByCode(code: string): Promise<Stop | null> {
    return this.prisma.stop.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
  }

  async create(data: CreateStopDto): Promise<Stop> {
    return this.prisma.stop.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        geofenceRadiusMeters:
          data.geofenceRadiusMeters !== undefined ? Number(data.geofenceRadiusMeters) : 50.0,
      },
    });
  }

  async update(id: string, data: UpdateStopDto): Promise<Stop> {
    return this.prisma.stop.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
        ...(data.latitude !== undefined ? { latitude: Number(data.latitude) } : {}),
        ...(data.longitude !== undefined ? { longitude: Number(data.longitude) } : {}),
        ...(data.geofenceRadiusMeters !== undefined
          ? { geofenceRadiusMeters: Number(data.geofenceRadiusMeters) }
          : {}),
      },
    });
  }

  async delete(id: string): Promise<Stop> {
    return this.prisma.stop.delete({
      where: { id },
    });
  }
}
