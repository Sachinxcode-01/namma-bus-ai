import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Driver, Prisma, TripStatus, User } from '@prisma/client';

export type DriverWithDetails = Driver & {
  user: Pick<User, 'id' | 'email' | 'isActive'>;
  activeTrip?: {
    id: string;
    routeId: string;
    busId: string;
    status: TripStatus;
  } | null;
  _count?: {
    trips: number;
  };
};

@Injectable()
export class DriversRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<{ drivers: DriverWithDetails[]; total: number }> {
    const where: Prisma.DriverWhereInput = {};

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { licenseNumber: { contains: s, mode: 'insensitive' } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [drivers, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { name: 'asc' },
        include: {
          user: {
            select: { id: true, email: true, isActive: true },
          },
          trips: {
            where: { status: TripStatus.ACTIVE },
            select: { id: true, routeId: true, busId: true, status: true },
            take: 1,
          },
          _count: {
            select: { trips: true },
          },
        },
      }),
      this.prisma.driver.count({ where }),
    ]);

    const formatted: DriverWithDetails[] = drivers.map((d) => ({
      ...d,
      activeTrip: d.trips[0] ?? null,
    }));

    return { drivers: formatted, total };
  }

  async findById(id: string): Promise<DriverWithDetails | null> {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
        trips: {
          where: { status: TripStatus.ACTIVE },
          select: { id: true, routeId: true, busId: true, status: true },
          take: 1,
        },
        _count: {
          select: { trips: true },
        },
      },
    });

    if (!driver) return null;

    return {
      ...driver,
      activeTrip: driver.trips[0] ?? null,
    };
  }

  async findByUserId(userId: string): Promise<DriverWithDetails | null> {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
        trips: {
          where: { status: TripStatus.ACTIVE },
          select: { id: true, routeId: true, busId: true, status: true },
          take: 1,
        },
        _count: {
          select: { trips: true },
        },
      },
    });

    if (!driver) return null;

    return {
      ...driver,
      activeTrip: driver.trips[0] ?? null,
    };
  }

  async findByLicenseNumber(licenseNumber: string): Promise<Driver | null> {
    return this.prisma.driver.findUnique({
      where: { licenseNumber },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      phone?: string;
      licenseNumber?: string;
    },
  ): Promise<DriverWithDetails> {
    const updateData: Prisma.DriverUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.phone !== undefined) updateData.phone = data.phone.trim();
    if (data.licenseNumber !== undefined) {
      updateData.licenseNumber = data.licenseNumber.trim().toUpperCase();
    }

    const updated = await this.prisma.driver.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
        _count: {
          select: { trips: true },
        },
      },
    });

    return updated;
  }
}
