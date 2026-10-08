import 'package:flutter/foundation.dart';
import '../data/models/trip_model.dart';
import '../data/repositories/driver_trip_repository.dart';
import 'location_tracking_controller.dart';

class DriverTripController extends ChangeNotifier {
  final IDriverTripRepository _tripRepo;
  final LocationTrackingController _trackingController;

  DriverTripModel? _currentTrip;
  bool _isLoading = false;
  String? _errorMessage;

  DriverTripController({
    required IDriverTripRepository tripRepo,
    required LocationTrackingController trackingController,
  })  : _tripRepo = tripRepo,
        _trackingController = trackingController;

  DriverTripModel? get currentTrip => _currentTrip;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  DriverTripStatus get status => _currentTrip?.status ?? DriverTripStatus.notStarted;

  bool get canStart => status == DriverTripStatus.notStarted && !_isLoading;
  bool get canEnd => status == DriverTripStatus.active && !_isLoading;
  bool get isTripActive => status == DriverTripStatus.active;

  Future<void> loadAssignedTrip() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _tripRepo.getAssignedTrip();
    _isLoading = false;

    result.when(
      success: (trip) {
        _currentTrip = trip;
        _errorMessage = null;
        notifyListeners();
      },
      failure: (message, _) {
        _errorMessage = message;
        notifyListeners();
      },
    );
  }

  Future<bool> startTrip() async {
    if (_currentTrip == null || !canStart) return false;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    // 1. Request GPS permissions and verify readiness
    final hasGps = await _trackingController.checkAndRequestPermissions();
    if (!hasGps) {
      _isLoading = false;
      _errorMessage = 'GPS permission is required to start your trip';
      notifyListeners();
      return false;
    }

    // 2. Start Trip on backend
    final result = await _tripRepo.startTrip(_currentTrip!.id);

    return result.when(
      success: (trip) async {
        _currentTrip = trip;
        _isLoading = false;
        notifyListeners();

        // 3. Initiate active GPS broadcast
        await _trackingController.startTracking(
          busId: trip.busId,
          tripId: trip.id,
        );
        return true;
      },
      failure: (message, _) {
        _isLoading = false;
        _errorMessage = message;
        notifyListeners();
        return false;
      },
    );
  }

  Future<bool> endTrip() async {
    if (_currentTrip == null || !canEnd) return false;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    // 1. Stop location broadcasting
    await _trackingController.stopTracking();

    // 2. Mark Trip complete on backend
    final result = await _tripRepo.endTrip(_currentTrip!.id);

    return result.when(
      success: (trip) {
        _currentTrip = trip;
        _isLoading = false;
        notifyListeners();
        return true;
      },
      failure: (message, _) {
        _isLoading = false;
        _errorMessage = message;
        notifyListeners();
        return false;
      },
    );
  }

  Future<void> markStopCompleted(int stopIndex) async {
    if (_currentTrip == null) return;
    final result = await _tripRepo.markStopComplete(_currentTrip!.id, stopIndex);
    result.when(
      success: (trip) {
        _currentTrip = trip;
        notifyListeners();
      },
      failure: (_, _) {},
    );
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
