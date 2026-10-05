import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_result.dart';
import '../../core/network/http_client.dart';
import '../mock/mock_transport_data.dart';
import '../models/notification_model.dart';

abstract class NotificationRepository {
  Future<ApiResult<List<NotificationEntity>>> getNotifications();
  Future<ApiResult<bool>> markAsRead(String notificationId);
}

class NotificationRepositoryImpl implements NotificationRepository {
  final ApiHttpClient _httpClient;
  List<NotificationEntity> _localNotifications = List.from(MockTransportData.notifications);

  NotificationRepositoryImpl({required ApiHttpClient httpClient}) : _httpClient = httpClient;

  @override
  Future<ApiResult<List<NotificationEntity>>> getNotifications() async {
    final res = await _httpClient.get<List<NotificationEntity>>(
      path: ApiEndpoints.notifications,
      parser: (json) {
        if (json is List) {
          return json.map((n) => NotificationEntity.fromJson(n as Map<String, dynamic>)).toList();
        }
        return [];
      },
    );

    if (res is ApiSuccess<List<NotificationEntity>> && res.data.isNotEmpty) {
      _localNotifications = res.data;
      return res;
    }

    return ApiSuccess(List.unmodifiable(_localNotifications));
  }

  @override
  Future<ApiResult<bool>> markAsRead(String notificationId) async {
    try {
      await _httpClient.post(
        path: ApiEndpoints.notificationRead(notificationId),
        body: {},
        parser: (_) => true,
      );
    } catch (_) {}

    // Update local cache
    _localNotifications = _localNotifications.map((n) {
      if (n.id == notificationId) {
        return n.copyWith(isRead: true);
      }
      return n;
    }).toList();

    return const ApiSuccess(true);
  }
}
