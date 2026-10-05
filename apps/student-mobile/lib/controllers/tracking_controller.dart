import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../core/constants/app_constants.dart';
import '../data/models/tracking_model.dart';
import '../data/repositories/tracking_repository.dart';

class TrackingController extends ChangeNotifier {
  final TrackingRepository _trackingRepository;

  LiveLocationEntity? _liveLocation;
  TripEtaResponse? _etaData;

  bool _isInitialLoading = false;
  bool _isPolling = false;
  String? _errorMessage;
  Timer? _timer;

  String? _activeBusId;
  String _activeTripId = 'trip-1';

  TrackingController({required TrackingRepository trackingRepository})
      : _trackingRepository = trackingRepository;

  LiveLocationEntity? get liveLocation => _liveLocation;
  TripEtaResponse? get etaData => _etaData;
  bool get isInitialLoading => _isInitialLoading;
  bool get isPolling => _isPolling;
  String? get errorMessage => _errorMessage;

  /// Checks if location update is older than 2 minutes
  bool get isGpsStale {
    if (_liveLocation == null) return false;
    final diff = DateTime.now().difference(_liveLocation!.timestamp);
    return diff > AppConstants.staleGpsThreshold;
  }

  /// Calculates ETA for a specific stop
  StopEtaDto? getEtaForStop(String? stopId) {
    if (stopId == null || _etaData == null) return null;
    return _etaData!.getStopEta(stopId);
  }

  void startPolling({required String busId, String tripId = 'trip-1'}) {
    if (_activeBusId == busId && _timer != null && _timer!.isActive) {
      return;
    }

    _activeBusId = busId;
    _activeTripId = tripId;
    stopPolling();

    _isInitialLoading = _liveLocation == null;
    notifyListeners();

    // Immediate first fetch
    _fetchTrackingData();

    // Setup periodic polling
    _timer = Timer.periodic(AppConstants.liveTrackingPollInterval, (_) {
      _fetchTrackingData();
    });
    _isPolling = true;
  }

  Future<void> refreshNow() async {
    await _fetchTrackingData();
  }

  Future<void> _fetchTrackingData() async {
    if (_activeBusId == null) return;

    try {
      final locFuture = _trackingRepository.getLiveLocation(_activeBusId!);
      final etaFuture = _trackingRepository.getTripEta(_activeTripId);

      final locRes = await locFuture;
      final etaRes = await etaFuture;

      if (locRes.isSuccess && locRes.dataOrNull != null) {
        _liveLocation = locRes.dataOrNull;
      }

      if (etaRes.isSuccess && etaRes.dataOrNull != null) {
        _etaData = etaRes.dataOrNull;
      }

      _errorMessage = null;
    } catch (e) {
      if (_liveLocation == null) {
        _errorMessage = 'Unable to connect to live bus telemetry. Retrying...';
      }
    } finally {
      _isInitialLoading = false;
      notifyListeners();
    }
  }

  void stopPolling() {
    _timer?.cancel();
    _timer = null;
    _isPolling = false;
  }

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }
}
