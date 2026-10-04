import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { StudentsRepository, StudentWithDetails } from './students.repository';
import { QueryStudentsDto } from './dto/query-students.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ForbiddenException, NotFoundException } from '../../common/errors/app.exception';
import { PaginatedResult } from '../users/users.service';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(private readonly studentsRepository: StudentsRepository) {}

  async findAll(query: QueryStudentsDto): Promise<PaginatedResult<StudentWithDetails>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { students, total } = await this.studentsRepository.findMany({
      skip,
      take: limit,
      search: query.search,
    });

    return {
      items: students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<StudentWithDetails> {
    const student = await this.studentsRepository.findById(id);
    if (!student) {
      throw new NotFoundException('Student', id);
    }
    return student;
  }

  async findByUserId(userId: string): Promise<StudentWithDetails> {
    const student = await this.studentsRepository.findByUserId(userId);
    if (!student) {
      throw new NotFoundException('Student associated with user ID', userId);
    }
    return student;
  }

  async update(
    id: string,
    dto: UpdateStudentDto,
    currentUser: AuthenticatedUser,
  ): Promise<StudentWithDetails> {
    const existing = await this.findOne(id);

    const isOwner = existing.userId === currentUser.id;
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You are not authorized to update another student profile.');
    }

    const updated = await this.studentsRepository.update(id, dto);
    this.logger.log(`Student profile updated: ID=${id}, Name=${updated.name}`);
    return updated;
  }
}
