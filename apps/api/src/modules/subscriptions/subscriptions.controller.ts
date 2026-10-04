import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionWithDetails } from './subscriptions.repository';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { QuerySubscriptionsDto } from './dto/query-subscriptions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PaginatedResult } from '../users/users.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Subscribe a student to a designated bus route and stop' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Subscription created or reactivated' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Subscription already active' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Stop does not belong to specified route',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Route, Stop or Student not found' })
  async create(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<SubscriptionWithDetails> {
    return this.subscriptionsService.create(dto, currentUser);
  }

  @Get()
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'List subscriptions (Students view theirs, Admins can filter)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of subscriptions returned' })
  async findAll(
    @Query() query: QuerySubscriptionsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedResult<SubscriptionWithDetails>> {
    return this.subscriptionsService.findAll(query, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel/delete a stop subscription' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription deleted' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot delete another student subscription',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Subscription not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ deleted: boolean; id: string }> {
    return this.subscriptionsService.remove(id, currentUser);
  }
}
