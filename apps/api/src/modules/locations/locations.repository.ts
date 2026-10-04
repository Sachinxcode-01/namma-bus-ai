import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LiveLocation, Prisma } from '@prisma/client';

@Injectable()
export class LocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    busId: string;
    tripId: string;
    latitude: number;
    longitude: number;
    speed?: number | null;
    heading?: number | null;
    accuracy?: number | null;
    timestamp: Date;
  }): Promise<LiveLocation> {
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

    return this.prisma.liveLocation.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
  }
}
