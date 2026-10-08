import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LiveLocation, Prisma } from '@prisma/client';

export interface CreateLocationInput {
  busId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  timestamp: Date;
}

@Injectable()
export class LocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLocationInput): Promise<LiveLocation> {
    return this.prisma.liveLocation.create({
      data: {
        busId: data.busId,
        tripId: data.tripId,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed ?? null,
        heading: data.heading ?? null,
        accuracy: data.accuracy ?? null,
        timestamp: data.timestamp,
      },
    });
  }

  async createMany(data: CreateLocationInput[]): Promise<number> {
    if (data.length === 0) return 0;
    const result = await this.prisma.liveLocation.createMany({
      data: data.map((d) => ({
        busId: d.busId,
        tripId: d.tripId,
        latitude: d.latitude,
        longitude: d.longitude,
        speed: d.speed ?? null,
        heading: d.heading ?? null,
        accuracy: d.accuracy ?? null,
        timestamp: d.timestamp,
      })),
    });
    return result.count;
  }

  async findLatestByTripId(tripId: string): Promise<LiveLocation | null> {
    return this.prisma.liveLocation.findFirst({
      where: { tripId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findLatestByBusId(busId: string): Promise<LiveLocation | null> {
    return this.prisma.liveLocation.findFirst({
      where: { busId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findHistoryByTripId(tripId: string, limit = 100, since?: Date): Promise<LiveLocation[]> {
    const where: Prisma.LiveLocationWhereInput = { tripId };

    if (since) {
      where.timestamp = { gte: since };
    }

    const records = await this.prisma.liveLocation.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return records.reverse();
  }
}
