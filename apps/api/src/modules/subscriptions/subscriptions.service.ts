import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SubscriptionsRepository, SubscriptionWithDetails } from './subscriptions.repository';
import { RoutesRepository } from '../routes/routes.repository';
import { StopsRepository } from '../stops/stops.repository';
import { StudentsRepository } from '../students/students.repository';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { QuerySubscriptionsDto } from './dto/query-subscriptions.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ValidationException,
} from '../../common/errors/app.exception';
import { PaginatedResult } from '../users/users.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly routesRepository: RoutesRepository,
    private readonly stopsRepository: StopsRepository,
    private readonly studentsRepository: StudentsRepository,
  ) {}

  async create(
    dto: CreateSubscriptionDto,
    currentUser: AuthenticatedUser,
  ): Promise<SubscriptionWithDetails> {
    let studentId = currentUser.studentId;

    if (currentUser.role === UserRole.ADMIN) {
      if (dto.studentId) {
        studentId = dto.studentId;
      }
    }

    if (!studentId) {
      throw new ForbiddenException('Student profile ID is required to create a subscription.');
    }

    // Verify student exists
    const student = await this.studentsRepository.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student', studentId);
    }

    // Verify route exists
    const route = await this.routesRepository.findById(dto.routeId);
    if (!route) {
      throw new NotFoundException('Route', dto.routeId);
    }

    // Verify stop exists
    const stop = await this.stopsRepository.findById(dto.stopId);
    if (!stop) {
      throw new NotFoundException('Stop', dto.stopId);
    }

    // Verify stop is sequenced on this route
    const isStopOnRoute = await this.subscriptionsRepository.isStopOnRoute(dto.routeId, dto.stopId);
    if (!isStopOnRoute) {
      throw new ValidationException(
        `Stop '${stop.name}' (${stop.code}) is not assigned to Route '${route.name}' (${route.code}).`,
      );
    }

    // Check if subscription already exists
    const existing = await this.subscriptionsRepository.findByStudentStopRoute(
      studentId,
      dto.stopId,
      dto.routeId,
    );

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException(
          'Student is already actively subscribed to this route and stop.',
        );
      }
      const reactivated = await this.subscriptionsRepository.reactivate(existing.id);
      this.logger.log(`Subscription reactivated: ID=${reactivated.id}`);
      return reactivated;
    }

    const created = await this.subscriptionsRepository.create({
      studentId,
      routeId: dto.routeId,
      stopId: dto.stopId,
    });
    this.logger.log(`Subscription created: ID=${created.id}`);
    return created;
  }

  async findAll(
    query: QuerySubscriptionsDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedResult<SubscriptionWithDetails>> {
    const isStudent = currentUser.role === UserRole.STUDENT;
    const filterStudentId = isStudent ? currentUser.studentId : query.studentId;

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { subscriptions, total } = await this.subscriptionsRepository.findMany({
      skip,
      take: limit,
      studentId: filterStudentId,
      routeId: query.routeId,
      stopId: query.stopId,
    });

    return {
      items: subscriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async remove(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ deleted: boolean; id: string }> {
    const subscription = await this.subscriptionsRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException('Subscription', id);
    }

    if (currentUser.role !== UserRole.ADMIN && subscription.studentId !== currentUser.studentId) {
      throw new ForbiddenException(
        'You are not authorized to cancel another student subscription.',
      );
    }

    await this.subscriptionsRepository.delete(id);
    this.logger.log(`Subscription deleted: ID=${id}`);
    return { deleted: true, id };
  }
}
