import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Bus, Prisma } from '@prisma/client';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';

@Injectable()
export class BusesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip: number;
    take: number;
    isActive?: boolean;
    search?: string;
  }): Promise<{ buses: Bus[]; total: number }> {
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
      }),
      this.prisma.bus.count({ where }),
    ]);

    return { buses, total };
  }

  async findById(id: string): Promise<Bus | null> {
    return this.prisma.bus.findUnique({
      where: { id },
    });
  }

  async findByBusNumber(busNumber: string): Promise<Bus | null> {
    return this.prisma.bus.findUnique({
      where: { busNumber: busNumber.trim().toUpperCase() },
    });
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<Bus | null> {
    return this.prisma.bus.findUnique({
      where: { registrationNumber: registrationNumber.trim().toUpperCase() },
    });
  }

  async create(data: CreateBusDto): Promise<Bus> {
    return this.prisma.bus.create({
      data: {
        busNumber: data.busNumber.trim().toUpperCase(),
        registrationNumber: data.registrationNumber.trim().toUpperCase(),
        capacity: data.capacity,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async update(id: string, data: UpdateBusDto): Promise<Bus> {
    return this.prisma.bus.update({
      where: { id },
      data: {
        ...(data.busNumber ? { busNumber: data.busNumber.trim().toUpperCase() } : {}),
        ...(data.registrationNumber
          ? { registrationNumber: data.registrationNumber.trim().toUpperCase() }
          : {}),
        ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async delete(id: string): Promise<Bus> {
    return this.prisma.bus.delete({
      where: { id },
    });
  }
}
