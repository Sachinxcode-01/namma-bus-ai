import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Driver, Prisma } from '@prisma/client';
import { UpdateDriverDto } from './dto/update-driver.dto';

export type DriverWithUser = Driver & {
  user: {
    id: string;
    email: string;
    isActive: boolean;
  };
};

@Injectable()
export class DriversRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<{ drivers: DriverWithUser[]; total: number }> {
    const where: Prisma.DriverWhereInput = {};

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { licenseNumber: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
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
        },
      }),
      this.prisma.driver.count({ where }),
    ]);

    return { drivers, total };
  }

  async findById(id: string): Promise<DriverWithUser | null> {
    return this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
      },
    });
  }

  async findByLicenseNumber(licenseNumber: string): Promise<Driver | null> {
    return this.prisma.driver.findUnique({
      where: { licenseNumber: licenseNumber.trim().toUpperCase() },
    });
  }

  async update(id: string, data: UpdateDriverDto): Promise<DriverWithUser> {
    return this.prisma.driver.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.licenseNumber ? { licenseNumber: data.licenseNumber.trim().toUpperCase() } : {}),
        ...(data.phone ? { phone: data.phone.trim() } : {}),
      },
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
      },
    });
  }
}
