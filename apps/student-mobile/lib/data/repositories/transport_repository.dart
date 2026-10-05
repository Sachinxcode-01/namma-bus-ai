import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_result.dart';
import '../../core/network/http_client.dart';
import '../mock/mock_transport_data.dart';
import '../models/bus_model.dart';
import '../models/route_model.dart';
import '../models/stop_model.dart';

abstract class TransportRepository {
  Future<ApiResult<List<BusEntity>>> getBuses();
  Future<ApiResult<List<RouteEntity>>> getRoutes();
  Future<ApiResult<List<StopEntity>>> getStops();
  Future<ApiResult<List<RouteStopEntity>>> getRouteStops(String routeId);
}

class TransportRepositoryImpl implements TransportRepository {
  final ApiHttpClient _httpClient;

  TransportRepositoryImpl({required ApiHttpClient httpClient}) : _httpClient = httpClient;

  @override
  Future<ApiResult<List<BusEntity>>> getBuses() async {
    final res = await _httpClient.get<List<BusEntity>>(
      path: ApiEndpoints.buses,
      parser: (json) {
        if (json is List) {
          return json.map((b) => BusEntity.fromJson(b as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );

    if (res is ApiSuccess<List<BusEntity>> && res.data.isNotEmpty) {
      return res;
    }
    // Isolated Mock fallback for offline/development resilience
    return const ApiSuccess(MockTransportData.buses);
  }

  @override
  Future<ApiResult<List<RouteEntity>>> getRoutes() async {
    final res = await _httpClient.get<List<RouteEntity>>(
      path: ApiEndpoints.routes,
      parser: (json) {
        if (json is List) {
          return json.map((r) => RouteEntity.fromJson(r as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );

    if (res is ApiSuccess<List<RouteEntity>> && res.data.isNotEmpty) {
      return res;
    }
    return ApiSuccess(MockTransportData.routes);
  }

  @override
  Future<ApiResult<List<StopEntity>>> getStops() async {
    final res = await _httpClient.get<List<StopEntity>>(
      path: ApiEndpoints.stops,
      parser: (json) {
        if (json is List) {
          return json.map((s) => StopEntity.fromJson(s as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );

    if (res is ApiSuccess<List<StopEntity>> && res.data.isNotEmpty) {
      return res;
    }
    return const ApiSuccess(MockTransportData.stops);
  }

  @override
  Future<ApiResult<List<RouteStopEntity>>> getRouteStops(String routeId) async {
    final res = await _httpClient.get<List<RouteStopEntity>>(
      path: ApiEndpoints.routeStops(routeId),
      parser: (json) {
        if (json is List) {
          return json.map((s) => RouteStopEntity.fromJson(s as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );

    if (res is ApiSuccess<List<RouteStopEntity>> && res.data.isNotEmpty) {
      return res;
    }

    final route = MockTransportData.routes.firstWhere(
      (r) => r.id == routeId,
      orElse: () => MockTransportData.routes.first,
    );
    return ApiSuccess(route.routeStops);
  }
}
