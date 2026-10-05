abstract final class AppConstants {
  static const String appName = 'NammaBus Driver';
  static const String appSubtitle = 'Vehicle Operation & Realtime GPS Telemetry';
  static const String appVersion = '1.0.0';

  // Driver telemetry broadcast rate (every 2.5 seconds during active trip)
  static const Duration locationBroadcastInterval = Duration(milliseconds: 2500);
  static const Duration staleGpsWarningThreshold = Duration(seconds: 15);
  static const Duration networkTimeout = Duration(seconds: 10);

  // Storage Keys
  static const String driverTokenKey = 'nb_driver_token';
  static const String driverProfileKey = 'nb_driver_profile';
  static const String activeTripKey = 'nb_active_trip';

  // Demo Credentials for College Driver
  static const String demoEmail = 'ramesh.driver@nammabus.ai';
  static const String demoPassword = 'password123';
  static const String demoDriverName = 'Ramesh Kumar';
  static const String demoBusNumber = 'NB-01';
}
