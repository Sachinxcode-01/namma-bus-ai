import 'dart:async';
import 'package:flutter/foundation.dart';
import '../data/models/location_telemetry_model.dart';
import '../data/repositories/location_service.dart';

class LocationTrackingController extends ChangeNotifier {
  final ILocationTrackingService _locationService;

  LocationTrackingStatus _status = LocationTrackingStatus.unknown;
  final ValueNotifier<LocationTelemetryModel?> telemetryNotifier =
      ValueNotifier<LocationTelemetryModel?>(null);

  StreamSubscription<LocationTelemetryModel>? _telemetrySub;
  StreamSubscription<LocationTrackingStatus>? _statusSub;

  LocationTrackingController({
    required ILocationTrackingService locationService,
  }) : _locationService = locationService {
    _status = _locationService.currentStatus;
    telemetryNotifier.value = _locationService.latestTelemetry;

    _statusSub = _locationService.statusStream.listen((newStatus) {
      if (_status != newStatus) {
        _status = newStatus;
        notifyListeners();
      }
    });

    _telemetrySub = _locationService.telemetryStream.listen((telemetry) {
      telemetryNotifier.value = telemetry;
      // High-frequency telemetry updates only update ValueNotifier,
      // avoiding whole-screen tree invalidation!
    });
  }

  LocationTrackingStatus get status => _status;
  bool get isTracking => _status == LocationTrackingStatus.tracking;
  bool get isGpsReady => _status == LocationTrackingStatus.ready;
  bool get hasError => _status.hasError;
  String get statusLabel => _status.displayLabel;

  Future<bool> checkAndRequestPermissions() async {
    return _locationService.checkAndRequestPermissions();
  }

  Future<void> startTracking({required String busId, required String tripId}) async {
    await _locationService.startTracking(busId: busId, tripId: tripId);
  }

  Future<void> stopTracking() async {
    await _locationService.stopTracking();
  }

  @override
  void dispose() {
    _statusSub?.cancel();
    _telemetrySub?.cancel();
    telemetryNotifier.dispose();
    super.dispose();
  }
}
