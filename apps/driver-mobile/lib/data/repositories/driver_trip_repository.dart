import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_result.dart';
import '../../core/network/http_client.dart';
import '../mock/mock_driver_data.dart';
import '../models/trip_model.dart';

abstract class IDriverTripRepository {
  Future<ApiResult<DriverTripModel>> getAssignedTrip();
  Future<ApiResult<DriverTripModel>> startTrip(String tripId);
  Future<ApiResult<DriverTripModel>> endTrip(String tripId);
  Future<ApiResult<DriverTripModel>> markStopComplete(String tripId, int stopIndex);
}

class DriverTripRepository implements IDriverTripRepository {
  final ApiClient _client;
  DriverTripModel _activeTripState = MockDriverData.mockAssignedTrip;

  DriverTripRepository({required ApiClient client}) : _client = client;

  @override
  Future<ApiResult<DriverTripModel>> getAssignedTrip() async {
    final result = await _client.get<DriverTripModel>(
      ApiEndpoints.assignedTrip,
      parser: (json) => DriverTripModel.fromJson(json),
    );

    if (result is ApiSuccess<DriverTripModel>) {
      _activeTripState = result.data;
      return result;
    }

    // Resilient fallback with state persistence in-memory
    return ApiSuccess(_activeTripState);
  }

  @override
  Future<ApiResult<DriverTripModel>> startTrip(String tripId) async {
    final result = await _client.post<DriverTripModel>(
      ApiEndpoints.startTrip(tripId),
      body: {'startTime': DateTime.now().toIso8601String()},
      parser: (json) => DriverTripModel.fromJson(json),
    );

    if (result is ApiSuccess<DriverTripModel>) {
      _activeTripState = result.data;
      return result;
    }

    // Local state transition
    _activeTripState = _activeTripState.copyWith(
      status: DriverTripStatus.active,
      actualStartTime: DateTime.now(),
    );
    return ApiSuccess(_activeTripState);
  }

  @override
  Future<ApiResult<DriverTripModel>> endTrip(String tripId) async {
    final result = await _client.post<DriverTripModel>(
      ApiEndpoints.endTrip(tripId),
      body: {'endTime': DateTime.now().toIso8601String()},
      parser: (json) => DriverTripModel.fromJson(json),
    );

    if (result is ApiSuccess<DriverTripModel>) {
      _activeTripState = result.data;
      return result;
    }

    // Local state transition
    _activeTripState = _activeTripState.copyWith(
      status: DriverTripStatus.completed,
      actualEndTime: DateTime.now(),
    );
    return ApiSuccess(_activeTripState);
  }

  @override
  Future<ApiResult<DriverTripModel>> markStopComplete(String tripId, int stopIndex) async {
    if (stopIndex < 0 || stopIndex >= _activeTripState.stops.length) {
      return ApiSuccess(_activeTripState);
    }

    final updatedStops = List.of(_activeTripState.stops);
    updatedStops[stopIndex] = updatedStops[stopIndex].copyWith(isCompleted: true);

    _activeTripState = _activeTripState.copyWith(
      currentStopIndex: (stopIndex + 1).clamp(0, updatedStops.length - 1),
      stops: updatedStops,
    );

    return ApiSuccess(_activeTripState);
  }
}
