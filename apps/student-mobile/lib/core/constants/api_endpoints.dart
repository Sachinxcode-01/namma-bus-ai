/// Centralized REST API endpoints aligned with /api/v1 backend contract
abstract final class ApiEndpoints {
  static const String defaultBaseUrl = 'http://localhost:4000/api/v1';

  // Auth endpoints
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String profile = '/students/me';

  // Transport endpoints
  static const String buses = '/buses';
  static String busById(String id) => '/buses/$id';
  static String busLiveLocation(String busId) => '/buses/$busId/live-location';

  static const String routes = '/routes';
  static String routeById(String id) => '/routes/$id';
  static String routeStops(String routeId) => '/routes/$routeId/stops';

  static const String stops = '/stops';
  static String stopById(String id) => '/stops/$id';

  // Trips & Live Tracking
  static const String trips = '/trips';
  static String tripById(String id) => '/trips/$id';
  static String tripEta(String tripId) => '/trips/$tripId/eta';

  // Subscriptions & Notifications
  static const String subscriptions = '/subscriptions';
  static const String notifications = '/notifications';
  static String notificationRead(String id) => '/notifications/$id/read';
}
