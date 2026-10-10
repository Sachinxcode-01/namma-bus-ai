import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EtaAlertEvaluatorService } from './eta-alert-evaluator.service';
import { NotificationsService } from '../notifications.service';
import { EtaConfidence, EtaStatus, TripEtaDomainResult } from '../../eta/domain/eta.types';

describe('EtaAlertEvaluatorService', () => {
  let service: EtaAlertEvaluatorService;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockNotificationsService = {
    handleEtaThresholdAlert: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(10), // 10 minutes threshold
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtaAlertEvaluatorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<EtaAlertEvaluatorService>(EtaAlertEvaluatorService);
    notificationsService = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  it('should trigger alert when stop ETA is within the configured threshold (e.g. 8 min <= 10 min)', async () => {
    const etaResult: TripEtaDomainResult = {
      tripId: 'trip-1',
      busId: 'bus-1',
      routeId: 'route-1',
      lastUpdated: new Date().toISOString(),
      currentDelayMinutes: 0,
      stops: [
        {
          stopId: 'stop-1',
          stopName: 'Campus Gate',
          stopCode: 'STP-01',
          sequenceOrder: 1,
          latitude: 12.9,
          longitude: 77.5,
          estimatedMinutes: 8, // Within 10 min threshold!
          estimatedArrivalTime: new Date().toISOString(),
          distanceRemainingMeters: 3000,
          status: 'UPCOMING',
        },
        {
          stopId: 'stop-2',
          stopName: 'Far Away Stop',
          stopCode: 'STP-02',
          sequenceOrder: 2,
          latitude: 13.1,
          longitude: 77.7,
          estimatedMinutes: 28, // Outside threshold
          estimatedArrivalTime: new Date().toISOString(),
          distanceRemainingMeters: 12000,
          status: 'UPCOMING',
        },
      ],
      stopId: 'stop-1',
      etaMinutes: 8,
      estimatedArrivalTime: new Date().toISOString(),
      distanceRemainingMeters: 3000,
      nextStop: null,
      status: EtaStatus.AVAILABLE,
      confidence: EtaConfidence.HIGH,
      calculatedAt: new Date().toISOString(),
      isOffRoute: false,
    };

    await service.evaluate(etaResult);

    expect(notificationsService.handleEtaThresholdAlert).toHaveBeenCalledWith(
      'trip-1',
      'stop-1',
      8,
      'route-1',
      'Campus Gate',
    );
    // Far Away Stop should NOT trigger
    expect(notificationsService.handleEtaThresholdAlert).not.toHaveBeenCalledWith(
      'trip-1',
      'stop-2',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('should not trigger alerts when ETA status is STALE or GPS_UNAVAILABLE', async () => {
    const staleResult: TripEtaDomainResult = {
      tripId: 'trip-1',
      busId: 'bus-1',
      routeId: 'route-1',
      lastUpdated: new Date().toISOString(),
      currentDelayMinutes: 0,
      stops: [
        {
          stopId: 'stop-1',
          stopName: 'Campus Gate',
          stopCode: 'STP-01',
          sequenceOrder: 1,
          latitude: 12.9,
          longitude: 77.5,
          estimatedMinutes: 5,
          estimatedArrivalTime: new Date().toISOString(),
          distanceRemainingMeters: 2000,
          status: 'UPCOMING',
        },
      ],
      stopId: 'stop-1',
      etaMinutes: 5,
      estimatedArrivalTime: new Date().toISOString(),
      distanceRemainingMeters: 2000,
      nextStop: null,
      status: EtaStatus.STALE, // Stale!
      confidence: EtaConfidence.LOW,
      calculatedAt: new Date().toISOString(),
      isOffRoute: false,
    };

    await service.evaluate(staleResult);

    expect(notificationsService.handleEtaThresholdAlert).not.toHaveBeenCalled();
  });

  it('should ignore stops that have status PASSED', async () => {
    const passedResult: TripEtaDomainResult = {
      tripId: 'trip-1',
      busId: 'bus-1',
      routeId: 'route-1',
      lastUpdated: new Date().toISOString(),
      currentDelayMinutes: 0,
      stops: [
        {
          stopId: 'stop-1',
          stopName: 'Campus Gate',
          stopCode: 'STP-01',
          sequenceOrder: 1,
          latitude: 12.9,
          longitude: 77.5,
          estimatedMinutes: 0,
          estimatedArrivalTime: new Date().toISOString(),
          distanceRemainingMeters: 0,
          status: 'PASSED', // Already passed!
        },
      ],
      stopId: 'stop-1',
      etaMinutes: 0,
      estimatedArrivalTime: new Date().toISOString(),
      distanceRemainingMeters: 0,
      nextStop: null,
      status: EtaStatus.AVAILABLE,
      confidence: EtaConfidence.HIGH,
      calculatedAt: new Date().toISOString(),
      isOffRoute: false,
    };

    await service.evaluate(passedResult);

    expect(notificationsService.handleEtaThresholdAlert).not.toHaveBeenCalled();
  });
});
