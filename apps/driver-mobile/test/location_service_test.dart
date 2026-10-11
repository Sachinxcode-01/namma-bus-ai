import 'package:flutter_test/flutter_test.dart';
import 'package:driver_mobile/core/network/http_client.dart';
import 'package:driver_mobile/data/models/location_telemetry_model.dart';
import 'package:driver_mobile/data/repositories/location_service.dart';

void main() {
  late ApiClient apiClient;
  late LocationTrackingService locationService;

  setUp(() {
    apiClient = ApiClient();
    locationService = LocationTrackingService(
      client: apiClient,
      useSimulation: true,
    );
  });

  tearDown(() {
    locationService.dispose();
  });

  group('LocationTrackingService', () {
    test('initial status is unknown and latest telemetry is null', () {
      expect(locationService.currentStatus, equals(LocationTrackingStatus.unknown));
      expect(locationService.latestTelemetry, isNull);
    });

    test('checkAndRequestPermissions grants ready status in simulation mode', () async {
      final granted = await locationService.checkAndRequestPermissions();

      expect(granted, isTrue);
      expect(locationService.currentStatus, equals(LocationTrackingStatus.ready));
    });

    test('startTracking emits initial telemetry and transitions to tracking status', () async {
      await locationService.checkAndRequestPermissions();

      final emittedTelemetry = <LocationTelemetryModel>[];
      final subscription = locationService.telemetryStream.listen(emittedTelemetry.add);

      await locationService.startTracking(busId: 'bus-test-01', tripId: 'trip-test-01');

      expect(locationService.currentStatus, equals(LocationTrackingStatus.tracking));
      expect(locationService.latestTelemetry, isNotNull);
      expect(locationService.latestTelemetry!.busId, equals('bus-test-01'));
      expect(locationService.latestTelemetry!.tripId, equals('trip-test-01'));

      await Future.delayed(const Duration(milliseconds: 100));
      expect(emittedTelemetry.isNotEmpty, isTrue);

      await subscription.cancel();
      await locationService.stopTracking();
      expect(locationService.currentStatus, equals(LocationTrackingStatus.ready));
    });

    test('stopTracking stops telemetry broadcasts and returns status to ready', () async {
      await locationService.startTracking(busId: 'bus-01', tripId: 'trip-01');
      expect(locationService.currentStatus, equals(LocationTrackingStatus.tracking));

      await locationService.stopTracking();
      expect(locationService.currentStatus, equals(LocationTrackingStatus.ready));
    });

    test('setUseSimulation updates mode appropriately', () {
      expect(locationService.useSimulation, isTrue);
      locationService.setUseSimulation(false);
      expect(locationService.useSimulation, isFalse);
    });
  });
}
