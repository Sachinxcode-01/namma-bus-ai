import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, User, UserRole } from '@prisma/client';

export type UserDetails = User & {
  student: { id: string; usn: string; name: string; phone: string | null } | null;
  driver: { id: string; licenseNumber: string; name: string; phone: string } | null;
};

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip: number;
    take: number;
    role?: UserRole;
    search?: string;
  }): Promise<{ users: UserDetails[]; total: number }> {
    const where: Prisma.UserWhereInput = {};

    if (params.role) {
      where.role = params.role;
    }

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { email: { contains: s, mode: 'insensitive' } },
        { student: { name: { contains: s, mode: 'insensitive' } } },
        { student: { usn: { contains: s, mode: 'insensitive' } } },
        { driver: { name: { contains: s, mode: 'insensitive' } } },
        { driver: { licenseNumber: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { id: true, usn: true, name: true, phone: true },
          },
          driver: {
            select: { id: true, licenseNumber: true, name: true, phone: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async findById(id: string): Promise<UserDetails | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, usn: true, name: true, phone: true },
        },
        driver: {
          select: { id: true, licenseNumber: true, name: true, phone: true },
        },
      },
    });
  }

  async updateStatus(id: string, isActive: boolean): Promise<UserDetails> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      include: {
        student: {
          select: { id: true, usn: true, name: true, phone: true },
        },
        driver: {
          select: { id: true, licenseNumber: true, name: true, phone: true },
        },
      },
    });
  }
}
