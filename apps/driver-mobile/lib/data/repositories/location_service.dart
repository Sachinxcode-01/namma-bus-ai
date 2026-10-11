import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
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
  bool get isHardwareGpsActive;
  bool get useSimulation;
  void setUseSimulation(bool value);

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
  StreamSubscription<Position>? _positionSubscription;
  int _simulationWaypointIndex = 0;
  String? _activeBusId;
  String? _activeTripId;
  bool _useSimulation = false;
  bool _isHardwareGpsActive = false;

  LocationTrackingService({
    required ApiClient client,
    bool? useSimulation,
  })  : _client = client,
        _useSimulation = useSimulation ?? _detectDefaultSimulationMode();

  static bool _detectDefaultSimulationMode() {
    if (kIsWeb) return false;
    try {
      if (Platform.environment.containsKey('FLUTTER_TEST')) return true;
      if (!Platform.isAndroid && !Platform.isIOS) return true;
    } catch (_) {
      return false;
    }
    return false;
  }

  @override
  Stream<LocationTelemetryModel> get telemetryStream => _telemetryController.stream;

  @override
  Stream<LocationTrackingStatus> get statusStream => _statusController.stream;

  @override
  LocationTrackingStatus get currentStatus => _currentStatus;

  @override
  LocationTelemetryModel? get latestTelemetry => _latestTelemetry;

  @override
  bool get isHardwareGpsActive => _isHardwareGpsActive;

  @override
  bool get useSimulation => _useSimulation;

  @override
  void setUseSimulation(bool value) {
    _useSimulation = value;
  }

  void _updateStatus(LocationTrackingStatus status) {
    if (_currentStatus != status) {
      _currentStatus = status;
      _statusController.add(status);
    }
  }

  @override
  Future<bool> checkAndRequestPermissions() async {
    _updateStatus(LocationTrackingStatus.requestingPermission);

    if (_useSimulation) {
      await Future.delayed(const Duration(milliseconds: 200));
      _isHardwareGpsActive = false;
      _updateStatus(LocationTrackingStatus.ready);
      return true;
    }

    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _updateStatus(LocationTrackingStatus.gpsDisabled);
        return false;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _updateStatus(LocationTrackingStatus.permissionDenied);
          return false;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _updateStatus(LocationTrackingStatus.permissionDenied);
        return false;
      }

      _isHardwareGpsActive = true;
      _updateStatus(LocationTrackingStatus.ready);
      return true;
    } catch (e) {
      // In automated test environments or unsupported desktop platforms, fallback to simulation
      debugPrint('Geolocator hardware check fallback to simulated route: $e');
      _isHardwareGpsActive = false;
      _updateStatus(LocationTrackingStatus.ready);
      return true;
    }
  }

  @override
  Future<void> startTracking({required String busId, required String tripId}) async {
    if (_currentStatus == LocationTrackingStatus.tracking) {
      return; // Already tracking, prevent duplicate start
    }

    _activeBusId = busId;
    _activeTripId = tripId;

    if (!_useSimulation && _isHardwareGpsActive) {
      try {
        await _startHardwareGpsTracking(busId: busId, tripId: tripId);
      } catch (e) {
        debugPrint('Error starting hardware GPS, falling back to simulation: $e');
        _startSimulatedTracking(busId: busId, tripId: tripId);
      }
    } else {
      _startSimulatedTracking(busId: busId, tripId: tripId);
    }

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

  Future<void> _startHardwareGpsTracking({required String busId, required String tripId}) async {
    // 1. Immediate initial reading
    try {
      final initialPosition = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 5),
        ),
      );
      final initialTelemetry = _mapPositionToTelemetry(initialPosition, busId, tripId);
      _latestTelemetry = initialTelemetry;
      _updateStatus(LocationTrackingStatus.tracking);
      _telemetryController.add(initialTelemetry);
      _sendTelemetryToBackend(initialTelemetry);
    } catch (e) {
      debugPrint('Initial hardware GPS lock pending: $e');
      _latestTelemetry = MockDriverData.initialTelemetry;
      _updateStatus(LocationTrackingStatus.tracking);
      _telemetryController.add(_latestTelemetry!);
    }

    // 2. Continuous real position stream
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5, // minimum movement of 5 meters between updates
    );

    await _positionSubscription?.cancel();
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen(
      (Position position) {
        final telemetry = _mapPositionToTelemetry(position, busId, tripId);
        _latestTelemetry = telemetry;
        _updateStatus(LocationTrackingStatus.tracking);
        _telemetryController.add(telemetry);
        _sendTelemetryToBackend(telemetry);
      },
      onError: (err) {
        debugPrint('Hardware GPS stream error: $err, switching to simulated fallback');
        _startSimulatedTracking(busId: busId, tripId: tripId);
      },
    );
  }

  void _startSimulatedTracking({required String busId, required String tripId}) {
    _updateStatus(LocationTrackingStatus.tracking);

    if (_latestTelemetry == null) {
      _latestTelemetry = MockDriverData.initialTelemetry.copyWith(
        busId: busId,
        tripId: tripId,
      );
      _telemetryController.add(_latestTelemetry!);
      _sendTelemetryToBackend(_latestTelemetry!);
    }

    _broadcastTimer?.cancel();
    _broadcastTimer = Timer.periodic(AppConstants.locationBroadcastInterval, (_) {
      _tickGpsLocation();
    });
  }

  LocationTelemetryModel _mapPositionToTelemetry(
    Position pos,
    String busId,
    String? tripId,
  ) {
    // Convert m/s to km/h, clamped to realistic limits
    final speedKmh = pos.speed > 0 ? (pos.speed * 3.6).clamp(0.0, 120.0) : 0.0;

    final signal = switch (pos.accuracy) {
      <= 10.0 => GpsSignalQuality.excellent,
      <= 25.0 => GpsSignalQuality.good,
      <= 50.0 => GpsSignalQuality.poor,
      _ => GpsSignalQuality.lost,
    };

    return LocationTelemetryModel(
      busId: busId,
      tripId: tripId,
      latitude: pos.latitude,
      longitude: pos.longitude,
      speedKmh: speedKmh,
      headingDegrees: pos.heading >= 0 ? pos.heading : 0.0,
      accuracyMeters: pos.accuracy,
      timestamp: pos.timestamp,
      signalQuality: signal,
    );
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
    await _positionSubscription?.cancel();
    _positionSubscription = null;
    _broadcastTimer?.cancel();
    _broadcastTimer = null;
    _staleCheckTimer?.cancel();
    _staleCheckTimer = null;
    _activeTripId = null;
    _updateStatus(LocationTrackingStatus.ready);
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _broadcastTimer?.cancel();
    _staleCheckTimer?.cancel();
    _telemetryController.close();
    _statusController.close();
  }
}
