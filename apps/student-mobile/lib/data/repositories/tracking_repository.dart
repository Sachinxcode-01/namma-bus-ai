import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_result.dart';
import '../../core/network/http_client.dart';
import '../mock/mock_transport_data.dart';
import '../models/tracking_model.dart';

abstract class TrackingRepository {
  Future<ApiResult<LiveLocationEntity>> getLiveLocation(String busId);
  Future<ApiResult<TripEtaResponse>> getTripEta(String tripId);
}

class TrackingRepositoryImpl implements TrackingRepository {
  final ApiHttpClient _httpClient;
  int _mockTick = 0;

  TrackingRepositoryImpl({required ApiHttpClient httpClient}) : _httpClient = httpClient;

  @override
  Future<ApiResult<LiveLocationEntity>> getLiveLocation(String busId) async {
    final res = await _httpClient.get<LiveLocationEntity>(
      path: ApiEndpoints.busLiveLocation(busId),
      parser: (json) => LiveLocationEntity.fromJson(json as Map<String, dynamic>),
    );

    if (res is ApiSuccess<LiveLocationEntity>) {
      return res;
    }

    // Mock live progression simulation: gently nudges coordinates along Bangalore college corridor
    _mockTick = (_mockTick + 1) % 60;
    final base = MockTransportData.getLiveLocation(busId);
    final delta = (_mockTick * 0.0001);

    return ApiSuccess(
      LiveLocationEntity(
        busId: busId,
        tripId: 'trip-1',
        latitude: base.latitude + delta,
        longitude: base.longitude + (delta * 0.8),
        speed: 34.0 + (_mockTick % 5) * 1.5,
        heading: 48.0,
        accuracy: 5.0,
        timestamp: DateTime.now(),
      ),
    );
  }

  @override
  Future<ApiResult<TripEtaResponse>> getTripEta(String tripId) async {
    final res = await _httpClient.get<TripEtaResponse>(
      path: ApiEndpoints.tripEta(tripId),
      parser: (json) => TripEtaResponse.fromJson(json as Map<String, dynamic>),
    );

    if (res is ApiSuccess<TripEtaResponse>) {
      return res;
    }

    return ApiSuccess(MockTransportData.getTripEta(tripId));
  }
}
