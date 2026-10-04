import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Bus, Prisma, TripStatus } from '@prisma/client';

export type BusWithStatus = Bus & {
  activeTrip?: {
    id: string;
    routeId: string;
    status: TripStatus;
    actualStartTime: Date | null;
  } | null;
  _count?: {
    trips: number;
  };
};

@Injectable()
export class BusesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
  }): Promise<{ buses: BusWithStatus[]; total: number }> {
    const where: Prisma.BusWhereInput = {};

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { busNumber: { contains: s, mode: 'insensitive' } },
        { registrationNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [buses, total] = await Promise.all([
      this.prisma.bus.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { busNumber: 'asc' },
        include: {
          trips: {
            where: { status: TripStatus.ACTIVE },
            select: { id: true, routeId: true, status: true, actualStartTime: true },
            take: 1,
          },
          _count: {
            select: { trips: true },
          },
        },
      }),
      this.prisma.bus.count({ where }),
    ]);

    const formattedBuses: BusWithStatus[] = buses.map((b) => ({
      ...b,
      activeTrip: b.trips[0] ?? null,
    }));

    return { buses: formattedBuses, total };
  }

  async findById(id: string): Promise<BusWithStatus | null> {
    const bus = await this.prisma.bus.findUnique({
      where: { id },
      include: {
        trips: {
          where: { status: TripStatus.ACTIVE },
          select: { id: true, routeId: true, status: true, actualStartTime: true },
          take: 1,
        },
        _count: {
          select: { trips: true },
        },
      },
    });

    if (!bus) return null;

    return {
      ...bus,
      activeTrip: bus.trips[0] ?? null,
    };
  }

  async findByBusNumber(busNumber: string): Promise<Bus | null> {
    return this.prisma.bus.findUnique({
      where: { busNumber },
    });
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<Bus | null> {
    return this.prisma.bus.findUnique({
      where: { registrationNumber },
    });
  }

  async create(data: {
    busNumber: string;
    registrationNumber: string;
    capacity: number;
    isActive?: boolean;
  }): Promise<Bus> {
    return this.prisma.bus.create({
      data: {
        busNumber: data.busNumber.trim(),
        registrationNumber: data.registrationNumber.trim().toUpperCase(),
        capacity: data.capacity,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(
    id: string,
    data: {
      busNumber?: string;
      registrationNumber?: string;
      capacity?: number;
      isActive?: boolean;
    },
  ): Promise<Bus> {
    const updateData: Prisma.BusUpdateInput = {};
    if (data.busNumber !== undefined) updateData.busNumber = data.busNumber.trim();
    if (data.registrationNumber !== undefined) {
      updateData.registrationNumber = data.registrationNumber.trim().toUpperCase();
    }
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.prisma.bus.update({
      where: { id },
      data: updateData,
    });
  }

  async countTrips(id: string): Promise<number> {
    return this.prisma.trip.count({
      where: { busId: id },
    });
  }

  async delete(id: string): Promise<Bus> {
    return this.prisma.bus.delete({
      where: { id },
    });
  }
}
