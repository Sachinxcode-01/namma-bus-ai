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

  async findByEmail(email: string): Promise<UserDetails | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
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

  async createUser(params: {
    email: string;
    passwordHash: string;
    role: UserRole;
    name?: string;
    usn?: string;
    licenseNumber?: string;
    phone?: string;
  }): Promise<UserDetails> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: params.email.toLowerCase().trim(),
          passwordHash: params.passwordHash,
          role: params.role,
          student:
            params.role === UserRole.STUDENT && params.usn
              ? {
                  create: {
                    name: (params.name || 'Student').trim(),
                    usn: params.usn.toUpperCase().trim(),
                    phone: params.phone?.trim(),
                  },
                }
              : undefined,
          driver:
            params.role === UserRole.DRIVER && params.licenseNumber
              ? {
                  create: {
                    name: (params.name || 'Driver').trim(),
                    licenseNumber: params.licenseNumber.toUpperCase().trim(),
                    phone: (params.phone || '').trim(),
                  },
                }
              : undefined,
        },
        include: {
          student: {
            select: { id: true, usn: true, name: true, phone: true },
          },
          driver: {
            select: { id: true, licenseNumber: true, name: true, phone: true },
          },
        },
      });

      return user;
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
