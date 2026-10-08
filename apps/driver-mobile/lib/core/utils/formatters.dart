import 'package:intl/intl.dart';

abstract final class AppFormatters {
  static final DateFormat _timeFormat = DateFormat('h:mm a');
  static final DateFormat _dateFormat = DateFormat('EEE, MMM d, yyyy');
  static final DateFormat _shortTimeFormat = DateFormat('HH:mm:ss');

  static String formatTime(DateTime? dateTime) {
    if (dateTime == null) return '--:--';
    return _timeFormat.format(dateTime.toLocal());
  }

  static String formatDate(DateTime? dateTime) {
    if (dateTime == null) return '--';
    return _dateFormat.format(dateTime.toLocal());
  }

  static String formatTimestamp(DateTime? dateTime) {
    if (dateTime == null) return '--:--:--';
    return _shortTimeFormat.format(dateTime.toLocal());
  }

  static String formatSpeed(double? speedKmh) {
    if (speedKmh == null || speedKmh.isNaN) return '0.0 km/h';
    return '${speedKmh.toStringAsFixed(1)} km/h';
  }

  static String formatCoordinates(double lat, double lng) {
    return '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
  }

  static String formatAccuracy(double? accuracyMeters) {
    if (accuracyMeters == null || accuracyMeters.isNaN) return '±-- m';
    return '±${accuracyMeters.toStringAsFixed(1)} m';
  }
}
