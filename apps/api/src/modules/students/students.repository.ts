import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, Route, Stop, Student, Subscription, User } from '@prisma/client';

export type StudentWithDetails = Student & {
  user: Pick<User, 'id' | 'email' | 'isActive'>;
  subscriptions?: (Subscription & {
    route: Route;
    stop: Stop;
  })[];
  _count?: {
    subscriptions: number;
  };
};

@Injectable()
export class StudentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<{ students: StudentWithDetails[]; total: number }> {
    const where: Prisma.StudentWhereInput = {};

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { usn: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { name: 'asc' },
        include: {
          user: {
            select: { id: true, email: true, isActive: true },
          },
          _count: {
            select: { subscriptions: true },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return { students, total };
  }

  async findById(id: string): Promise<StudentWithDetails | null> {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
        subscriptions: {
          where: { isActive: true },
          include: {
            route: true,
            stop: true,
          },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<StudentWithDetails | null> {
    return this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
        subscriptions: {
          where: { isActive: true },
          include: {
            route: true,
            stop: true,
          },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      phone?: string;
    },
  ): Promise<StudentWithDetails> {
    const updateData: Prisma.StudentUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() ?? null;

    return this.prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
        subscriptions: {
          where: { isActive: true },
          include: {
            route: true,
            stop: true,
          },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
    });
  }
}
