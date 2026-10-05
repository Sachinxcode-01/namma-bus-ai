import 'package:intl/intl.dart';

/// Formatting helpers for student-friendly transport displays
abstract final class Formatters {
  static final DateFormat _timeFormat = DateFormat('h:mm a');
  static final DateFormat _dateFormat = DateFormat('EEE, MMM d');

  /// Formats minutes into student-friendly ETA string ("8 mins", "< 1 min", "Arriving now")
  static String formatEtaMinutes(int minutes) {
    if (minutes <= 0) return 'Arriving now';
    if (minutes == 1) return '1 min';
    if (minutes >= 60) {
      final hours = minutes ~/ 60;
      final remainingMins = minutes % 60;
      return remainingMins > 0 ? '${hours}h ${remainingMins}m' : '${hours}h';
    }
    return '$minutes mins';
  }

  /// Formats distance in meters into human-readable km or meters ("450 m", "2.4 km")
  static String formatDistance(int distanceMeters) {
    if (distanceMeters < 1000) {
      return '$distanceMeters m';
    }
    final km = (distanceMeters / 1000).toStringAsFixed(1);
    return '$km km';
  }

  /// Formats ISO timestamp to human friendly relative time ("just now", "12s ago", "3m ago")
  static String formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inSeconds < 10) return 'just now';
    if (difference.inSeconds < 60) return '${difference.inSeconds}s ago';
    if (difference.inMinutes < 60) return '${difference.inMinutes}m ago';
    if (difference.inHours < 24) return '${difference.inHours}h ago';
    return _dateFormat.format(dateTime);
  }

  /// Formats clock time ("8:15 AM")
  static String formatClockTime(DateTime dateTime) {
    return _timeFormat.format(dateTime);
  }
}
