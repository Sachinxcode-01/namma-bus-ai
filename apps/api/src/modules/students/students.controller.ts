import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { StudentsService } from './students.service';
import { StudentWithDetails } from './students.repository';
import { QueryStudentsDto } from './dto/query-students.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ForbiddenException } from '../../common/errors/app.exception';
import { PaginatedResult } from '../users/users.service';

@ApiTags('Students')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List students with pagination and search (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of students returned' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async findAll(@Query() query: QueryStudentsDto): Promise<PaginatedResult<StudentWithDetails>> {
    return this.studentsService.findAll(query);
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get current student profile and route subscriptions (Student only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Student profile returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Student profile not linked' })
  async getMyProfile(@CurrentUser() currentUser: AuthenticatedUser): Promise<StudentWithDetails> {
    return this.studentsService.findByUserId(currentUser.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student details by ID (Admin or Student themself)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Student details returned' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to view other students',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Student not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<StudentWithDetails> {
    const student = await this.studentsService.findOne(id);
    if (currentUser.role !== UserRole.ADMIN && student.userId !== currentUser.id) {
      throw new ForbiddenException('You are not authorized to view another student profile.');
    }
    return student;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update student contact profile (Admin or Student themself)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Student profile updated' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Unauthorized update attempt' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Student not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<StudentWithDetails> {
    return this.studentsService.update(id, dto, currentUser);
  }
}
