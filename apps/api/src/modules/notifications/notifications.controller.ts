import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  Sse,
  MessageEvent,
  UseFilters,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DeviceToken, Notification, NotificationPreference, UserRole } from '@prisma/client';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { DeviceTokensService } from './services/device-tokens.service';
import { NotificationStreamService } from './services/notification-stream.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { UnregisterDeviceTokenDto } from './dto/unregister-device-token.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { BroadcastIncidentDto } from './dto/broadcast-incident.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SseRateLimitGuard } from '../realtime/guards/sse-rate-limit.guard';
import { SseExceptionFilter } from '../realtime/filters/sse-exception.filter';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PaginatedResult } from '../users/users.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer-jwt')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly deviceTokensService: DeviceTokensService,
    private readonly streamService: NotificationStreamService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  // ---------------------------------------------------------------------------
  // Device Token Management
  // ---------------------------------------------------------------------------

  @Post('devices')
  @ApiOperation({ summary: 'Register an FCM device token for push notifications' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Device token registered or refreshed' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid token payload' })
  async registerDevice(
    @Body() dto: RegisterDeviceTokenDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<DeviceToken> {
    return this.deviceTokensService.register(currentUser.id, dto);
  }

  @Delete('devices')
  @ApiOperation({ summary: 'Unregister an FCM device token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Device token unregistered' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot unregister another user’s token',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Token not found' })
  async unregisterDevice(
    @Body() dto: UnregisterDeviceTokenDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.deviceTokensService.unregister(currentUser.id, dto.token);
  }

  // ---------------------------------------------------------------------------
  // User Notification History & Reading
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'List notifications for the authenticated user (paginated)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated user notifications returned' })
  async findAll(
    @Query() query: QueryNotificationsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedResult<Notification>> {
    return this.notificationsService.getUserNotifications(currentUser.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread notification count for the authenticated user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unread notification count returned' })
  async getUnreadCount(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ unreadCount: number }> {
    return this.notificationsService.getUnreadCount(currentUser.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notification marked as read' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot access another user’s notification',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Notification not found' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(currentUser.id, id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all unread notifications as read for the authenticated user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All notifications marked as read' })
  async markAllAsRead(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ updatedCount: number }> {
    return this.notificationsService.markAllAsRead(currentUser.id);
  }

  // ---------------------------------------------------------------------------
  // Notification Preferences
  // ---------------------------------------------------------------------------

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for the authenticated user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notification preferences returned' })
  async getPreferences(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<NotificationPreference> {
    return this.preferencesService.getPreferences(currentUser.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences for the authenticated user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notification preferences updated' })
  async updatePreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<NotificationPreference> {
    return this.preferencesService.updatePreferences(currentUser.id, dto);
  }

  // ---------------------------------------------------------------------------
  // Administrative Operations
  // ---------------------------------------------------------------------------

  @Post('broadcast')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Broadcast an announcement to all students or a designated route' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Broadcast queued and dispatched' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only administrators may broadcast' })
  async broadcast(
    @Body() dto: BroadcastNotificationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ recipientCount: number }> {
    return this.notificationsService.broadcast(dto, currentUser);
  }

  @Post('incidents/broadcast')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Broadcast transit incident alert across realtime stream and push channels (Admin only)',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Incident alert broadcasted to fleet and subscribers' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only administrators may broadcast incident alerts' })
  async broadcastIncident(
    @Body() dto: BroadcastIncidentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ recipientCount: number }> {
    return this.notificationsService.broadcastIncident(dto, currentUser);
  }

  // ---------------------------------------------------------------------------
  // Real-time SSE Stream
  // ---------------------------------------------------------------------------

  @Sse('stream')
  @UseGuards(SseRateLimitGuard)
  @UseFilters(SseExceptionFilter)
  @ApiOperation({
    summary: 'Real-time Server-Sent Events (SSE) notification stream for authenticated user',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Real-time stream of user notifications' })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Concurrent SSE stream connection limit exceeded',
  })
  getUserStream(@CurrentUser() currentUser: AuthenticatedUser): Observable<MessageEvent> {
    return this.streamService.getUserStream(currentUser.id);
  }
}
