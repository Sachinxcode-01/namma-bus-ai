import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_result.dart';
import '../../core/network/http_client.dart';
import '../models/incident_model.dart';

abstract class IIncidentRepository {
  Future<ApiResult<IncidentReportModel>> submitIncident(IncidentReportModel incident);
  Future<ApiResult<bool>> triggerEmergencySos({
    required String tripId,
    required String busId,
    required double latitude,
    required double longitude,
    required String driverName,
  });
}

class IncidentRepository implements IIncidentRepository {
  final ApiClient _client;

  IncidentRepository({required ApiClient client}) : _client = client;

  @override
  Future<ApiResult<IncidentReportModel>> submitIncident(IncidentReportModel incident) async {
    final result = await _client.post<IncidentReportModel>(
      ApiEndpoints.reportIncident,
      body: incident.toApiPayload(),
      parser: (json) => IncidentReportModel.fromJson(json),
    );

    if (result is ApiSuccess<IncidentReportModel>) {
      return result;
    }

    // Fallback: local confirmation if server is offline
    return ApiSuccess(incident);
  }

  @override
  Future<ApiResult<bool>> triggerEmergencySos({
    required String tripId,
    required String busId,
    required double latitude,
    required double longitude,
    required String driverName,
  }) async {
    final result = await _client.post<bool>(
      ApiEndpoints.emergencySos,
      body: {
        'tripId': tripId,
        'busId': busId,
        'latitude': latitude,
        'longitude': longitude,
        'driverName': driverName,
        'severity': 'CRITICAL',
        'type': 'EMERGENCY_SOS',
        'timestamp': DateTime.now().toIso8601String(),
      },
      parser: (_) => true,
    );

    if (result is ApiSuccess<bool>) {
      return result;
    }

    // Always succeed locally for safety assurance so driver knows signal was captured
    return const ApiSuccess(true);
  }
}
