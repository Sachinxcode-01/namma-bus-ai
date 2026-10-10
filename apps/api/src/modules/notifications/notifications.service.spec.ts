import { Test, TestingModule } from '@nestjs/testing';
import { IncidentSeverity, NotificationType, Prisma, Trip, UserRole } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationDispatchService } from './services/notification-dispatch.service';
import { NotificationStreamService } from './services/notification-stream.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { ForbiddenException } from '../../common/errors/app.exception';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { REALTIME_BUS } from '../realtime/interfaces/realtime-bus.interface';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: jest.Mocked<NotificationsRepository>;
  let dispatchService: jest.Mocked<NotificationDispatchService>;
  let streamService: jest.Mocked<NotificationStreamService>;
  let preferencesService: jest.Mocked<NotificationPreferencesService>;

  const createMockNotification = (data: Prisma.NotificationCreateInput) => ({
    id: `notif-${Math.random()}`,
    recipientId: (data.recipient?.connect as { id: string })?.id || 'u-1',
    tripId: (data.trip?.connect as { id: string })?.id || null,
    type: data.type,
    title: data.title,
    body: data.body,
    deduplicationKey: data.deduplicationKey ?? null,
    isRead: false,
    readAt: null,
    metadata: (data.metadata as Prisma.JsonValue) ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const adminUser: AuthenticatedUser = {
    id: 'user-admin-1',
    email: 'admin@college.edu',
    role: UserRole.ADMIN,
    isActive: true,
  };

  const driverUser: AuthenticatedUser = {
    id: 'user-driver-1',
    email: 'driver@college.edu',
    role: UserRole.DRIVER,
    isActive: true,
    driverId: 'driver-1',
  };

  const mockRepo = {
    createNotification: jest.fn(),
    findNotificationById: jest.fn(),
    findByRecipientAndDedupKey: jest.fn(),
    findMany: jest.fn(),
    countUnread: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    findSubscribedUserIdsByStopAndRoute: jest.fn(),
    findSubscribedUserIdsByRoute: jest.fn(),
    findAdminUserIds: jest.fn(),
    findAllActiveUserIds: jest.fn(),
  };

  const mockDispatchService = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  };

  const mockStreamService = {
    emitNotification: jest.fn(),
    getUserStream: jest.fn(),
  };

  const mockPreferencesService = {
    isNotificationEnabled: jest.fn().mockResolvedValue(true),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsRepository,
          useValue: mockRepo,
        },
        {
          provide: NotificationDispatchService,
          useValue: mockDispatchService,
        },
        {
          provide: NotificationStreamService,
          useValue: mockStreamService,
        },
        {
          provide: NotificationPreferencesService,
          useValue: mockPreferencesService,
        },
        {
          provide: REALTIME_BUS,
          useValue: {
            publish: jest.fn(),
            subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repository = module.get(NotificationsRepository);
    dispatchService = module.get(NotificationDispatchService);
    streamService = module.get(NotificationStreamService);
    preferencesService = module.get(NotificationPreferencesService);
    jest.clearAllMocks();
    preferencesService.isNotificationEnabled.mockResolvedValue(true);
  });

  describe('handleEtaThresholdAlert', () => {
    it('should create and dispatch ~10-minute ETA alerts to all students subscribed to the stop', async () => {
      repository.findSubscribedUserIdsByStopAndRoute.mockResolvedValue([
        'user-student-1',
        'user-student-2',
      ]);
      repository.findByRecipientAndDedupKey.mockResolvedValue(null);
      repository.createNotification.mockImplementation(
        async (data: Prisma.NotificationCreateInput) => createMockNotification(data),
      );

      await service.handleEtaThresholdAlert('trip-1', 'stop-1', 9, 'route-1', 'Campus Gate');

      expect(repository.findSubscribedUserIdsByStopAndRoute).toHaveBeenCalledWith(
        'route-1',
        'stop-1',
      );
      expect(repository.createNotification).toHaveBeenCalledTimes(2);
      expect(dispatchService.dispatch).toHaveBeenCalledTimes(2);
      expect(streamService.emitNotification).toHaveBeenCalledTimes(2);
    });

    it('should suppress duplicate ~10-min alerts if already sent for the same trip and stop', async () => {
      repository.findSubscribedUserIdsByStopAndRoute.mockResolvedValue(['user-student-1']);
      const existingNotification = {
        id: 'notif-existing',
        recipientId: 'user-student-1',
        tripId: 'trip-1',
        type: NotificationType.ETA_10_MIN,
        title: 'Bus Approaching',
        body: 'Already sent',
        deduplicationKey: 'trip:trip-1:stop:stop-1:type:ETA_10_MIN',
        isRead: false,
        readAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repository.findByRecipientAndDedupKey.mockResolvedValue(existingNotification);

      await service.handleEtaThresholdAlert('trip-1', 'stop-1', 8, 'route-1', 'Campus Gate');

      expect(repository.createNotification).not.toHaveBeenCalled();
      expect(dispatchService.dispatch).not.toHaveBeenCalled();
    });

    it('should suppress alert if recipient disabled ETA alerts in preferences', async () => {
      repository.findSubscribedUserIdsByStopAndRoute.mockResolvedValue(['user-student-1']);
      preferencesService.isNotificationEnabled.mockResolvedValue(false); // Disabled!

      await service.handleEtaThresholdAlert('trip-1', 'stop-1', 9, 'route-1', 'Campus Gate');

      expect(repository.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('handleStopArrival', () => {
    it('should create and dispatch STOP_REACHED alerts with deduplication key', async () => {
      repository.findSubscribedUserIdsByStopAndRoute.mockResolvedValue(['user-student-1']);
      repository.findByRecipientAndDedupKey.mockResolvedValue(null);
      repository.createNotification.mockResolvedValue({
        id: 'notif-arrival',
        recipientId: 'user-student-1',
        tripId: 'trip-1',
        type: NotificationType.STOP_REACHED,
        title: 'Bus Arrived: Campus Gate',
        body: 'Your college bus has arrived at Campus Gate.',
        deduplicationKey: 'trip:trip-1:stop:stop-1:type:STOP_REACHED',
        isRead: false,
        readAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.handleStopArrival(
        { id: 'trip-1', routeId: 'route-1' },
        {
          id: 'stop-1',
          name: 'Campus Gate',
          code: 'STP-01',
          latitude: 12.9,
          longitude: 77.5,
          geofenceRadiusMeters: 50.0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.STOP_REACHED,
          deduplicationKey: 'trip:trip-1:stop:stop-1:type:STOP_REACHED',
        }),
      );
      expect(dispatchService.dispatch).toHaveBeenCalled();
    });
  });

  describe('handleTripStarted and handleTripCompleted', () => {
    it('should notify all students subscribed along the route when a trip starts', async () => {
      repository.findSubscribedUserIdsByRoute.mockResolvedValue([
        'user-student-1',
        'user-student-2',
      ]);
      repository.findByRecipientAndDedupKey.mockResolvedValue(null);
      repository.createNotification.mockImplementation(
        async (data: Prisma.NotificationCreateInput) => createMockNotification(data),
      );

      await service.handleTripStarted({
        id: 'trip-1',
        routeId: 'route-1',
        route: { code: 'R-01', name: 'Campus Route' },
      });

      expect(repository.createNotification).toHaveBeenCalledTimes(2);
      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.TRIP_STARTED,
          deduplicationKey: 'trip:trip-1:type:TRIP_STARTED',
        }),
      );
    });

    it('should notify all students subscribed along the route when a trip completes', async () => {
      repository.findSubscribedUserIdsByRoute.mockResolvedValue(['user-student-1']);
      repository.findByRecipientAndDedupKey.mockResolvedValue(null);
      repository.createNotification.mockImplementation(
        async (data: Prisma.NotificationCreateInput) => createMockNotification(data),
      );

      await service.handleTripCompleted({
        id: 'trip-1',
        routeId: 'route-1',
        route: { code: 'R-01', name: 'Campus Route' },
      });

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.TRIP_COMPLETED,
          deduplicationKey: 'trip:trip-1:type:TRIP_COMPLETED',
        }),
      );
    });
  });

  describe('handleIncidentReported', () => {
    it('should send immediate emergency SOS notification to all administrators', async () => {
      repository.findAdminUserIds.mockResolvedValue(['user-admin-1', 'user-admin-2']);
      repository.findSubscribedUserIdsByRoute.mockResolvedValue(['user-student-1']);
      repository.findByRecipientAndDedupKey.mockResolvedValue(null);
      repository.createNotification.mockImplementation(
        async (data: Prisma.NotificationCreateInput) => createMockNotification(data),
      );

      await service.handleIncidentReported(
        {
          id: 'incident-sos-1',
          tripId: 'trip-1',
          reportedById: 'driver-1',
          type: 'SOS',
          severity: IncidentSeverity.CRITICAL,
          description: 'Medical emergency on bus',
          status: 'OPEN',
          resolvedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { id: 'trip-1', routeId: 'route-1' } as unknown as Trip,
      );

      // Admins received SOS alerts
      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.SOS,
          title: expect.stringContaining('EMERGENCY: SOS Triggered'),
        }),
      );

      // Students received non-panic operational delay advisory
      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.DELAY,
          title: 'Service Delay Advisory',
        }),
      );
    });
  });

  describe('Authorization and History', () => {
    it('should retrieve paginated notification history for the authenticated user only', async () => {
      repository.findMany.mockResolvedValue({
        notifications: [
          {
            id: 'notif-1',
            recipientId: 'user-student-1',
            tripId: 'trip-1',
            type: NotificationType.ETA_10_MIN,
            title: 'Bus Approaching',
            body: 'Bus is near',
            isRead: false,
            readAt: null,
            deduplicationKey: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      });

      const result = await service.getUserNotifications('user-student-1', { page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ recipientId: 'user-student-1' }),
      );
    });

    it('should mark a notification as read when requested by its recipient', async () => {
      repository.findNotificationById.mockResolvedValue({
        id: 'notif-1',
        recipientId: 'user-student-1',
        tripId: 'trip-1',
        type: NotificationType.ETA_10_MIN,
        title: 'Bus Approaching',
        body: 'Bus is near',
        isRead: false,
        readAt: null,
        deduplicationKey: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.markAsRead.mockResolvedValue({
        id: 'notif-1',
        recipientId: 'user-student-1',
        tripId: 'trip-1',
        type: NotificationType.ETA_10_MIN,
        title: 'Bus Approaching',
        body: 'Bus is near',
        isRead: true,
        readAt: new Date(),
        deduplicationKey: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.markAsRead('user-student-1', 'notif-1');

      expect(result.isRead).toBe(true);
      expect(repository.markAsRead).toHaveBeenCalledWith('notif-1');
    });

    it('should throw ForbiddenException if user attempts to mark another user’s notification as read', async () => {
      repository.findNotificationById.mockResolvedValue({
        id: 'notif-1',
        recipientId: 'user-student-2', // Owned by student 2
        tripId: 'trip-1',
        type: NotificationType.ETA_10_MIN,
        title: 'Bus Approaching',
        body: 'Bus is near',
        isRead: false,
        readAt: null,
        deduplicationKey: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.markAsRead('user-student-1', 'notif-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow admin to broadcast and throw ForbiddenException if non-admin attempts broadcast', async () => {
      repository.findAllActiveUserIds.mockResolvedValue(['user-student-1', 'user-student-2']);
      repository.createNotification.mockImplementation(
        async (data: Prisma.NotificationCreateInput) => createMockNotification(data),
      );

      // Non-admin driver attempts broadcast -> ForbiddenException
      await expect(
        service.broadcast(
          { title: 'Test', body: 'Test broadcast', type: NotificationType.BROADCAST },
          driverUser,
        ),
      ).rejects.toThrow(ForbiddenException);

      // Admin broadcasts -> success
      const result = await service.broadcast(
        { title: 'Announcement', body: 'Holiday tomorrow', type: NotificationType.BROADCAST },
        adminUser,
      );

      expect(result.recipientCount).toBe(2);
    });
  });
});
