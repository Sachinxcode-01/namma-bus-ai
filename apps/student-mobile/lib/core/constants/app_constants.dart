/// App-wide constants for NammaBus AI Student Mobile App
abstract final class AppConstants {
  static const String appName = 'NammaBus AI';
  static const String appTagline = 'Smart Student Bus Tracking & Arrival Alerts';
  static const String appVersion = '1.0.0';

  // Polling intervals & network timeouts
  static const Duration liveTrackingPollInterval = Duration(seconds: 4);
  static const Duration networkTimeout = Duration(seconds: 10);
  static const Duration staleGpsThreshold = Duration(minutes: 2);

  // Storage keys (for session persistence)
  static const String tokenKey = 'nb_student_token';
  static const String userKey = 'nb_student_user';
  static const String selectedBusKey = 'nb_selected_bus';
  static const String selectedRouteKey = 'nb_selected_route';
  static const String selectedStopKey = 'nb_selected_stop';
  static const String alertPrefKey = 'nb_alert_enabled';

  // Demo user credentials for testing
  static const String demoEmail = 'student@nammabus.ai';
  static const String demoPassword = 'password123';
  static const String demoUsn = '1MS21CS042';
}
