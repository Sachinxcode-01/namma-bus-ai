abstract final class ApiEndpoints {
  static const String defaultBaseUrl = 'http://localhost:4000/api/v1';

  // Auth
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';

  // Driver & Trip
  static const String assignedTrip = '/driver/assigned-trip';
  static String tripDetails(String tripId) => '/trips/$tripId';
  static String startTrip(String tripId) => '/trips/$tripId/start';
  static String endTrip(String tripId) => '/trips/$tripId/end';

  // Telemetry & GPS Ingestion
  static const String ingestLocation = '/locations';

  // Incidents & SOS
  static const String reportIncident = '/incidents';
  static const String emergencySos = '/incidents/sos';

  // Notifications
  static const String driverAlerts = '/driver/alerts';
}
