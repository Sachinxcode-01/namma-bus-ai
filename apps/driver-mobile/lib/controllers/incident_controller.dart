import 'package:flutter/foundation.dart';
import '../data/models/incident_model.dart';
import '../data/repositories/incident_repository.dart';

class IncidentController extends ChangeNotifier {
  final IIncidentRepository _incidentRepo;

  bool _isSubmitting = false;
  bool _isSosActive = false;
  String? _errorMessage;
  String? _successMessage;

  IncidentController({required IIncidentRepository incidentRepo})
      : _incidentRepo = incidentRepo;

  bool get isSubmitting => _isSubmitting;
  bool get isSosActive => _isSosActive;
  String? get errorMessage => _errorMessage;
  String? get successMessage => _successMessage;

  Future<bool> reportIncident({
    required String tripId,
    required String busId,
    required IncidentType type,
    required IncidentSeverity severity,
    required String description,
    double? latitude,
    double? longitude,
  }) async {
    _isSubmitting = true;
    _errorMessage = null;
    _successMessage = null;
    notifyListeners();

    final report = IncidentReportModel(
      id: 'inc-${DateTime.now().millisecondsSinceEpoch}',
      tripId: tripId,
      busId: busId,
      type: type,
      severity: severity,
      description: description,
      latitude: latitude,
      longitude: longitude,
      createdAt: DateTime.now(),
    );

    final result = await _incidentRepo.submitIncident(report);
    _isSubmitting = false;

    return result.when(
      success: (_) {
        _successMessage = 'Incident reported to campus control center';
        notifyListeners();
        return true;
      },
      failure: (msg, _) {
        _errorMessage = msg;
        notifyListeners();
        return false;
      },
    );
  }

  Future<bool> triggerEmergencySos({
    required String tripId,
    required String busId,
    required double latitude,
    required double longitude,
    required String driverName,
  }) async {
    _isSubmitting = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _incidentRepo.triggerEmergencySos(
      tripId: tripId,
      busId: busId,
      latitude: latitude,
      longitude: longitude,
      driverName: driverName,
    );

    _isSubmitting = false;
    return result.when(
      success: (_) {
        _isSosActive = true;
        _successMessage = 'EMERGENCY SOS BROADCASTED TO CAMPUS SECURITY & DISPATCH';
        notifyListeners();
        return true;
      },
      failure: (msg, _) {
        _errorMessage = msg;
        notifyListeners();
        return false;
      },
    );
  }

  void resetSos() {
    _isSosActive = false;
    _successMessage = null;
    _errorMessage = null;
    notifyListeners();
  }

  void clearMessages() {
    _successMessage = null;
    _errorMessage = null;
    notifyListeners();
  }
}
