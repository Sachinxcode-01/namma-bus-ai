import { Test, TestingModule } from '@nestjs/testing';
import { DeviceTokensService } from './device-tokens.service';
import { NotificationsRepository } from '../notifications.repository';
import { ForbiddenException, NotFoundException } from '../../../common/errors/app.exception';

describe('DeviceTokensService', () => {
  let service: DeviceTokensService;
  let repository: jest.Mocked<NotificationsRepository>;

  const mockRepo = {
    upsertDeviceToken: jest.fn(),
    findDeviceToken: jest.fn(),
    findActiveTokensByUserId: jest.fn(),
    deactivateDeviceToken: jest.fn(),
    deleteDeviceToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceTokensService,
        {
          provide: NotificationsRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<DeviceTokensService>(DeviceTokensService);
    repository = module.get(NotificationsRepository);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register or update an FCM token for an authenticated user', async () => {
      const tokenRecord = {
        id: 'token-1',
        userId: 'user-student-1',
        token: 'fcm-token-xyz-1234567890',
        platform: 'android',
        deviceModel: 'Pixel 8',
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.upsertDeviceToken.mockResolvedValue(tokenRecord);

      const result = await service.register('user-student-1', {
        token: 'fcm-token-xyz-1234567890',
        platform: 'android',
        deviceModel: 'Pixel 8',
      });

      expect(result).toEqual(tokenRecord);
      expect(repository.upsertDeviceToken).toHaveBeenCalledWith({
        userId: 'user-student-1',
        token: 'fcm-token-xyz-1234567890',
        platform: 'android',
        deviceModel: 'Pixel 8',
      });
    });
  });

  describe('unregister', () => {
    it('should deactivate a token when requested by its authorized owner', async () => {
      repository.findDeviceToken.mockResolvedValue({
        id: 'token-1',
        userId: 'user-student-1',
        token: 'fcm-token-xyz',
        platform: 'android',
        deviceModel: null,
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.deactivateDeviceToken.mockResolvedValue(null);

      const result = await service.unregister('user-student-1', 'fcm-token-xyz');

      expect(result).toEqual({ success: true });
      expect(repository.deactivateDeviceToken).toHaveBeenCalledWith('fcm-token-xyz');
    });

    it('should throw ForbiddenException if user attempts to unregister a token owned by someone else', async () => {
      repository.findDeviceToken.mockResolvedValue({
        id: 'token-1',
        userId: 'user-student-2', // different user
        token: 'fcm-token-xyz',
        platform: 'android',
        deviceModel: null,
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.unregister('user-student-1', 'fcm-token-xyz')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.deactivateDeviceToken).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if token does not exist', async () => {
      repository.findDeviceToken.mockResolvedValue(null);

      await expect(service.unregister('user-student-1', 'unknown-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivateInvalidToken', () => {
    it('should deactivate token when reported invalid by FCM', async () => {
      repository.deactivateDeviceToken.mockResolvedValue(null);

      await service.deactivateInvalidToken('bad-token-123', 'registration-token-not-registered');

      expect(repository.deactivateDeviceToken).toHaveBeenCalledWith('bad-token-123');
    });
  });
});
