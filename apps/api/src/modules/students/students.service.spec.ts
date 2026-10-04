import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { StudentsService } from './students.service';
import { StudentsRepository } from './students.repository';
import { ForbiddenException, NotFoundException } from '../../common/errors/app.exception';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('StudentsService', () => {
  let service: StudentsService;
  let repository: jest.Mocked<StudentsRepository>;

  const mockStudent = {
    id: 'student-123',
    userId: 'user-student-1',
    usn: '1MS21CS001',
    name: 'Rahul Sharma',
    phone: '+919876543210',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'user-student-1', email: 'rahul@college.edu', isActive: true },
    subscriptions: [],
  };

  const studentUser: AuthenticatedUser = {
    id: 'user-student-1',
    email: 'rahul@college.edu',
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

  beforeEach(async () => {
    const mockRepo = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        {
          provide: StudentsRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
    repository = module.get(StudentsRepository);
  });

  describe('findAll', () => {
    it('should return paginated students', async () => {
      repository.findMany.mockResolvedValue({
        students: [mockStudent],
        total: 1,
      });

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return student when found', async () => {
      repository.findById.mockResolvedValue(mockStudent);

      const result = await service.findOne('student-123');
      expect(result).toEqual(mockStudent);
    });

    it('should throw NotFoundException when student does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should allow student to update their own contact details', async () => {
      repository.findById.mockResolvedValue(mockStudent);
      repository.update.mockResolvedValue({ ...mockStudent, phone: '+919999999999' });

      const result = await service.update('student-123', { phone: '+919999999999' }, studentUser);
      expect(result.phone).toBe('+919999999999');
    });

    it('should forbid student from updating another student profile', async () => {
      repository.findById.mockResolvedValue(mockStudent);

      await expect(
        service.update('student-123', { name: 'Hacked Name' }, otherStudentUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
