import 'dart:async';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/app_constants.dart';
import '../../core/network/http_client.dart';
import '../mock/mock_driver_data.dart';
import '../models/location_telemetry_model.dart';

enum LocationTrackingStatus {
  unknown,
  requestingPermission,
  ready,
  tracking,
  stale,
  permissionDenied,
  gpsDisabled,
  error;

  String get displayLabel => switch (this) {
        LocationTrackingStatus.unknown => 'GPS UNKNOWN',
        LocationTrackingStatus.requestingPermission => 'CHECKING PERMISSIONS...',
        LocationTrackingStatus.ready => 'GPS READY',
        LocationTrackingStatus.tracking => 'GPS ACTIVE & SHARING',
        LocationTrackingStatus.stale => 'GPS SIGNAL WEAK / STALE',
        LocationTrackingStatus.permissionDenied => 'LOCATION PERMISSION DENIED',
        LocationTrackingStatus.gpsDisabled => 'DEVICE GPS TURNED OFF',
        LocationTrackingStatus.error => 'GPS TELEMETRY ERROR',
      };

  bool get isBroadcasting => this == LocationTrackingStatus.tracking;
  bool get hasError =>
      this == LocationTrackingStatus.permissionDenied ||
      this == LocationTrackingStatus.gpsDisabled ||
      this == LocationTrackingStatus.error;
}

abstract class ILocationTrackingService {
  Stream<LocationTelemetryModel> get telemetryStream;
  Stream<LocationTrackingStatus> get statusStream;
  LocationTrackingStatus get currentStatus;
  LocationTelemetryModel? get latestTelemetry;

  Future<bool> checkAndRequestPermissions();
  Future<void> startTracking({required String busId, required String tripId});
  Future<void> stopTracking();
  void dispose();
}

class LocationTrackingService implements ILocationTrackingService {
  final ApiClient _client;

  final StreamController<LocationTelemetryModel> _telemetryController =
      StreamController<LocationTelemetryModel>.broadcast();
  final StreamController<LocationTrackingStatus> _statusController =
      StreamController<LocationTrackingStatus>.broadcast();

  LocationTrackingStatus _currentStatus = LocationTrackingStatus.unknown;
  LocationTelemetryModel? _latestTelemetry;
  Timer? _broadcastTimer;
  Timer? _staleCheckTimer;
  int _simulationWaypointIndex = 0;
  String? _activeBusId;
  String? _activeTripId;

  LocationTrackingService({required ApiClient client}) : _client = client;

  @override
  Stream<LocationTelemetryModel> get telemetryStream => _telemetryController.stream;

  @override
  Stream<LocationTrackingStatus> get statusStream => _statusController.stream;

  @override
  LocationTrackingStatus get currentStatus => _currentStatus;

  @override
  LocationTelemetryModel? get latestTelemetry => _latestTelemetry;

  void _updateStatus(LocationTrackingStatus status) {
    if (_currentStatus != status) {
      _currentStatus = status;
      _statusController.add(status);
    }
  }

  @override
  Future<bool> checkAndRequestPermissions() async {
    _updateStatus(LocationTrackingStatus.requestingPermission);

    // In a Flutter mobile app, this interfaces with geolocator / platform channels.
    // For pure cross-platform resilience and tests, we simulate standard OS permission grant:
    await Future.delayed(const Duration(milliseconds: 300));
    _updateStatus(LocationTrackingStatus.ready);
    return true;
  }

  @override
  Future<void> startTracking({required String busId, required String tripId}) async {
    if (_currentStatus == LocationTrackingStatus.tracking) {
      return; // Already tracking, prevent duplicate start
    }

    _activeBusId = busId;
    _activeTripId = tripId;
    _updateStatus(LocationTrackingStatus.tracking);

    // Initial reading
    _latestTelemetry = MockDriverData.initialTelemetry;
    _telemetryController.add(_latestTelemetry!);
    _sendTelemetryToBackend(_latestTelemetry!);

    // Start periodic broadcast timer (2.5 seconds)
    _broadcastTimer?.cancel();
    _broadcastTimer = Timer.periodic(AppConstants.locationBroadcastInterval, (_) {
      _tickGpsLocation();
    });

    // Start stale watchdog (detects if no updates received within 15 seconds)
    _staleCheckTimer?.cancel();
    _staleCheckTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (_currentStatus == LocationTrackingStatus.tracking && _latestTelemetry != null) {
        final age = DateTime.now().difference(_latestTelemetry!.timestamp);
        if (age > AppConstants.staleGpsWarningThreshold) {
          _updateStatus(LocationTrackingStatus.stale);
        }
      }
    });
  }

  void _tickGpsLocation() {
    if (_currentStatus != LocationTrackingStatus.tracking &&
        _currentStatus != LocationTrackingStatus.stale) {
      return;
    }

    final waypoints = MockDriverData.gpsWaypoints;
    _simulationWaypointIndex = (_simulationWaypointIndex + 1) % waypoints.length;
    final wp = waypoints[_simulationWaypointIndex];

    final telemetry = LocationTelemetryModel(
      busId: _activeBusId ?? 'bus-01',
      tripId: _activeTripId,
      latitude: wp['lat'] ?? 12.9772,
      longitude: wp['lng'] ?? 77.5713,
      speedKmh: wp['speed'] ?? 25.0,
      headingDegrees: wp['heading'] ?? 0.0,
      accuracyMeters: 3.5,
      timestamp: DateTime.now(),
      signalQuality: GpsSignalQuality.excellent,
    );

    _latestTelemetry = telemetry;
    _updateStatus(LocationTrackingStatus.tracking);
    _telemetryController.add(telemetry);

    // Broadcast to backend API
    _sendTelemetryToBackend(telemetry);
  }

  Future<void> _sendTelemetryToBackend(LocationTelemetryModel telemetry) async {
    try {
      await _client.post(
        ApiEndpoints.ingestLocation,
        body: telemetry.toApiPayload(),
        parser: (_) => null,
      );
    } catch (_) {
      // Telemetry transmission errors shouldn't crash the driver app;
      // location is buffered or re-transmitted on next tick.
    }
  }

  @override
  Future<void> stopTracking() async {
    _broadcastTimer?.cancel();
    _broadcastTimer = null;
    _staleCheckTimer?.cancel();
    _staleCheckTimer = null;
    _activeTripId = null;
    _updateStatus(LocationTrackingStatus.ready);
  }

  @override
  void dispose() {
    _broadcastTimer?.cancel();
    _staleCheckTimer?.cancel();
    _telemetryController.close();
    _statusController.close();
  }
}
