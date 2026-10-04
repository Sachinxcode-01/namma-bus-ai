import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsRepository, SubscriptionWithDetails } from './subscriptions.repository';
import { RoutesRepository, RouteWithDetails } from '../routes/routes.repository';
import { StopsRepository, StopWithRelations } from '../stops/stops.repository';
import { StudentsRepository, StudentWithDetails } from '../students/students.repository';
import {
  ConflictException,
  ForbiddenException,
  ValidationException,
} from '../../common/errors/app.exception';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let subRepo: jest.Mocked<SubscriptionsRepository>;
  let routesRepo: jest.Mocked<RoutesRepository>;
  let stopsRepo: jest.Mocked<StopsRepository>;
  let studentsRepo: jest.Mocked<StudentsRepository>;

  const studentUser: AuthenticatedUser = {
    id: 'user-student-1',
    email: 'student@college.edu',
    role: UserRole.STUDENT,
    isActive: true,
    studentId: 'student-123',
  };

  const otherStudentUser: AuthenticatedUser = {
    id: 'user-student-2',
    email: 'other@college.edu',
    role: UserRole.STUDENT,
    isActive: true,
    studentId: 'student-999',
  };

  const mockRoute = {
    id: 'route-1',
    name: 'North Campus Route',
    code: 'R-01',
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStop = {
    id: 'stop-1',
    name: 'Hebbal Stop',
    code: 'STP-01',
    latitude: 13.0,
    longitude: 77.0,
    geofenceRadiusMeters: 50.0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStudent = {
    id: 'student-123',
    userId: 'user-student-1',
    usn: '1MS21CS001',
    name: 'Rahul Sharma',
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'user-student-1', email: 'student@college.edu', isActive: true },
  };

  const mockSub = {
    id: 'sub-123',
    studentId: 'student-123',
    routeId: 'route-1',
    stopId: 'stop-1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    route: mockRoute,
    stop: mockStop,
  };

  beforeEach(async () => {
    const mockSubRepo = {
      findMany: jest.fn(),
      findByStudentId: jest.fn(),
      findById: jest.fn(),
      findByStudentStopRoute: jest.fn(),
      isStopOnRoute: jest.fn(),
      create: jest.fn(),
      reactivate: jest.fn(),
      delete: jest.fn(),
    };

    const mockRoutesRepo = { findById: jest.fn() };
    const mockStopsRepo = { findById: jest.fn() };
    const mockStudentsRepo = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: SubscriptionsRepository, useValue: mockSubRepo },
        { provide: RoutesRepository, useValue: mockRoutesRepo },
        { provide: StopsRepository, useValue: mockStopsRepo },
        { provide: StudentsRepository, useValue: mockStudentsRepo },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    subRepo = module.get(SubscriptionsRepository);
    routesRepo = module.get(RoutesRepository);
    stopsRepo = module.get(StopsRepository);
    studentsRepo = module.get(StudentsRepository);
  });

  describe('create', () => {
    it('should create subscription successfully when stop belongs to route', async () => {
      studentsRepo.findById.mockResolvedValue(mockStudent as unknown as StudentWithDetails);
      routesRepo.findById.mockResolvedValue(mockRoute as unknown as RouteWithDetails);
      stopsRepo.findById.mockResolvedValue(mockStop as unknown as StopWithRelations);
      subRepo.isStopOnRoute.mockResolvedValue(true);
      subRepo.findByStudentStopRoute.mockResolvedValue(null);
      subRepo.create.mockResolvedValue(mockSub as unknown as SubscriptionWithDetails);

      const result = await service.create({ routeId: 'route-1', stopId: 'stop-1' }, studentUser);

      expect(result).toEqual(mockSub);
      expect(subRepo.create).toHaveBeenCalledWith({
        studentId: 'student-123',
        routeId: 'route-1',
        stopId: 'stop-1',
      });
    });

    it('should throw ValidationException when stop is not on route', async () => {
      studentsRepo.findById.mockResolvedValue(mockStudent as unknown as StudentWithDetails);
      routesRepo.findById.mockResolvedValue(mockRoute as unknown as RouteWithDetails);
      stopsRepo.findById.mockResolvedValue(mockStop as unknown as StopWithRelations);
      subRepo.isStopOnRoute.mockResolvedValue(false);

      await expect(
        service.create({ routeId: 'route-1', stopId: 'stop-1' }, studentUser),
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ConflictException if already actively subscribed', async () => {
      studentsRepo.findById.mockResolvedValue(mockStudent as unknown as StudentWithDetails);
      routesRepo.findById.mockResolvedValue(mockRoute as unknown as RouteWithDetails);
      stopsRepo.findById.mockResolvedValue(mockStop as unknown as StopWithRelations);
      subRepo.isStopOnRoute.mockResolvedValue(true);
      subRepo.findByStudentStopRoute.mockResolvedValue(
        mockSub as unknown as SubscriptionWithDetails,
      );

      await expect(
        service.create({ routeId: 'route-1', stopId: 'stop-1' }, studentUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should reactivate subscription if previously inactive', async () => {
      studentsRepo.findById.mockResolvedValue(mockStudent as unknown as StudentWithDetails);
      routesRepo.findById.mockResolvedValue(mockRoute as unknown as RouteWithDetails);
      stopsRepo.findById.mockResolvedValue(mockStop as unknown as StopWithRelations);
      subRepo.isStopOnRoute.mockResolvedValue(true);
      subRepo.findByStudentStopRoute.mockResolvedValue({
        ...mockSub,
        isActive: false,
      } as unknown as SubscriptionWithDetails);
      subRepo.reactivate.mockResolvedValue(mockSub as unknown as SubscriptionWithDetails);

      const result = await service.create({ routeId: 'route-1', stopId: 'stop-1' }, studentUser);

      expect(result).toEqual(mockSub);
      expect(subRepo.reactivate).toHaveBeenCalledWith('sub-123');
    });
  });

  describe('remove', () => {
    it('should allow student to remove their own subscription', async () => {
      subRepo.findById.mockResolvedValue(mockSub as unknown as SubscriptionWithDetails);
      subRepo.delete.mockResolvedValue(mockSub as unknown as SubscriptionWithDetails);

      const result = await service.remove('sub-123', studentUser);
      expect(result).toEqual({ deleted: true, id: 'sub-123' });
    });

    it('should forbid student from deleting another students subscription', async () => {
      subRepo.findById.mockResolvedValue(mockSub as unknown as SubscriptionWithDetails);

      await expect(service.remove('sub-123', otherStudentUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
