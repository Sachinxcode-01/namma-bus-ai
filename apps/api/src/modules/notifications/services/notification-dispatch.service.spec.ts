import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryStatus, NotificationDelivery, NotificationType } from '@prisma/client';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationsRepository } from '../notifications.repository';
import { DeviceTokensService } from './device-tokens.service';
import { FirebasePushService } from '../providers/firebase-push.service';

describe('NotificationDispatchService', () => {
  let service: NotificationDispatchService;
  let repository: jest.Mocked<NotificationsRepository>;
  let deviceTokensService: jest.Mocked<DeviceTokensService>;
  let pushService: jest.Mocked<FirebasePushService>;

  const mockNotification = {
    id: 'notif-1',
    recipientId: 'user-student-1',
    tripId: 'trip-1',
    type: NotificationType.ETA_10_MIN,
    title: 'Bus Approaching',
    body: 'Your bus is 8 minutes away.',
    isRead: false,
    readAt: null,
    deduplicationKey: 'trip:trip-1:stop:stop-1:type:ETA_10_MIN',
    metadata: { etaMinutes: 8 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockDelivery = (
    overrides: Partial<NotificationDelivery> = {},
  ): NotificationDelivery => ({
    id: 'deliv-1',
    notificationId: 'notif-1',
    deviceTokenId: null,
    channel: 'IN_APP',
    status: DeliveryStatus.SENT,
    attempts: 1,
    sentAt: null,
    lastError: null,
    providerMsgId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const mockRepo = {
    createDelivery: jest.fn(),
    updateDelivery: jest.fn(),
  };

  const mockDeviceTokensService = {
    getActiveTokens: jest.fn(),
    deactivateInvalidToken: jest.fn(),
  };

  const mockPushService = {
    send: jest.fn(),
    isConfigured: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatchService,
        {
          provide: NotificationsRepository,
          useValue: mockRepo,
        },
        {
          provide: DeviceTokensService,
          useValue: mockDeviceTokensService,
        },
        {
          provide: FirebasePushService,
          useValue: mockPushService,
        },
      ],
    }).compile();

    service = module.get<NotificationDispatchService>(NotificationDispatchService);
    repository = module.get(NotificationsRepository);
    deviceTokensService = module.get(DeviceTokensService);
    pushService = module.get(FirebasePushService);
    jest.clearAllMocks();
  });

  it('should record an IN_APP delivery when recipient has no registered mobile devices', async () => {
    deviceTokensService.getActiveTokens.mockResolvedValue([]);
    repository.createDelivery.mockResolvedValue(createMockDelivery());

    await service.dispatch(mockNotification);

    expect(repository.createDelivery).toHaveBeenCalledWith({
      notificationId: 'notif-1',
      channel: 'IN_APP',
      status: DeliveryStatus.SENT,
    });
    expect(pushService.send).not.toHaveBeenCalled();
  });

  it('should dispatch push delivery successfully to a registered device', async () => {
    const device = {
      id: 'device-1',
      userId: 'user-student-1',
      token: 'fcm-token-1',
      platform: 'android',
      deviceModel: null,
      isActive: true,
      lastUsedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    deviceTokensService.getActiveTokens.mockResolvedValue([device]);
    repository.createDelivery.mockResolvedValue(createMockDelivery({ id: 'deliv-1' }));
    pushService.send.mockResolvedValue({ success: true, providerMsgId: 'msg-abc-123' });
    repository.updateDelivery.mockResolvedValue(
      createMockDelivery({ id: 'deliv-1', status: DeliveryStatus.SENT }),
    );

    await service.dispatch(mockNotification);

    expect(repository.createDelivery).toHaveBeenCalledWith({
      notificationId: 'notif-1',
      deviceTokenId: 'device-1',
      channel: 'FCM',
      status: DeliveryStatus.PENDING,
    });
    expect(pushService.send).toHaveBeenCalledWith(
      'fcm-token-1',
      'Bus Approaching',
      'Your bus is 8 minutes away.',
      expect.objectContaining({
        notificationId: 'notif-1',
        type: NotificationType.ETA_10_MIN,
      }),
    );
    expect(repository.updateDelivery).toHaveBeenCalledWith(
      'deliv-1',
      expect.objectContaining({
        status: DeliveryStatus.SENT,
        attempts: 1,
        providerMsgId: 'msg-abc-123',
      }),
    );
  });

  it('should dispatch to multiple registered devices independently', async () => {
    const devices = [
      {
        id: 'device-1',
        userId: 'user-student-1',
        token: 'fcm-token-1',
        platform: 'android',
        deviceModel: null,
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'device-2',
        userId: 'user-student-1',
        token: 'fcm-token-2',
        platform: 'ios',
        deviceModel: null,
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    deviceTokensService.getActiveTokens.mockResolvedValue(devices);
    repository.createDelivery
      .mockResolvedValueOnce(createMockDelivery({ id: 'deliv-1' }))
      .mockResolvedValueOnce(createMockDelivery({ id: 'deliv-2' }));

    // device 1 succeeds, device 2 fails
    pushService.send
      .mockResolvedValueOnce({ success: true, providerMsgId: 'msg-1' })
      .mockResolvedValueOnce({
        success: false,
        error: 'messaging/registration-token-not-registered',
        isInvalidToken: true,
      });

    repository.updateDelivery.mockResolvedValue(createMockDelivery());

    await service.dispatch(mockNotification);

    expect(pushService.send).toHaveBeenCalledTimes(2);
    expect(deviceTokensService.deactivateInvalidToken).toHaveBeenCalledWith(
      'fcm-token-2',
      'messaging/registration-token-not-registered',
    );
  });
});
