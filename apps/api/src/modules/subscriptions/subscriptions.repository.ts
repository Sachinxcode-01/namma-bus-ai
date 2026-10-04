import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, Route, Stop, Student, Subscription } from '@prisma/client';

export type SubscriptionWithDetails = Subscription & {
  route: Route;
  stop: Stop;
  student?: Pick<Student, 'id' | 'usn' | 'name' | 'phone'>;
};

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip: number;
    take: number;
    studentId?: string;
    routeId?: string;
    stopId?: string;
  }): Promise<{ subscriptions: SubscriptionWithDetails[]; total: number }> {
    const where: Prisma.SubscriptionWhereInput = {
      isActive: true,
    };

    if (params.studentId) where.studentId = params.studentId;
    if (params.routeId) where.routeId = params.routeId;
    if (params.stopId) where.stopId = params.stopId;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: {
          route: true,
          stop: true,
          student: {
            select: { id: true, usn: true, name: true, phone: true },
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { subscriptions, total };
  }

  async findByStudentId(studentId: string): Promise<SubscriptionWithDetails[]> {
    return this.prisma.subscription.findMany({
      where: {
        studentId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        route: true,
        stop: true,
      },
    });
  }

  async findById(id: string): Promise<SubscriptionWithDetails | null> {
    return this.prisma.subscription.findUnique({
      where: { id },
      include: {
        route: true,
        stop: true,
        student: {
          select: { id: true, usn: true, name: true, phone: true },
        },
      },
    });
  }

  async findByStudentStopRoute(
    studentId: string,
    stopId: string,
    routeId: string,
  ): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({
      where: {
        studentId_stopId_routeId: {
          studentId,
          stopId,
          routeId,
        },
      },
    });
  }

  async isStopOnRoute(routeId: string, stopId: string): Promise<boolean> {
    const count = await this.prisma.routeStop.count({
      where: {
        routeId,
        stopId,
      },
    });
    return count > 0;
  }

  async create(data: {
    studentId: string;
    stopId: string;
    routeId: string;
  }): Promise<SubscriptionWithDetails> {
    return this.prisma.subscription.create({
      data: {
        studentId: data.studentId,
        stopId: data.stopId,
        routeId: data.routeId,
        isActive: true,
      },
      include: {
        route: true,
        stop: true,
        student: {
          select: { id: true, usn: true, name: true, phone: true },
        },
      },
    });
  }

  async reactivate(id: string): Promise<SubscriptionWithDetails> {
    return this.prisma.subscription.update({
      where: { id },
      data: { isActive: true },
      include: {
        route: true,
        stop: true,
        student: {
          select: { id: true, usn: true, name: true, phone: true },
        },
      },
    });
  }

  async deactivate(id: string): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async delete(id: string): Promise<Subscription> {
    return this.prisma.subscription.delete({
      where: { id },
    });
  }
}
