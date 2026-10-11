enum GpsSignalQuality {
  excellent,
  good,
  poor,
  lost,
}

class LocationTelemetryModel {
  final String busId;
  final String? tripId;
  final double latitude;
  final double longitude;
  final double speedKmh;
  final double headingDegrees;
  final double accuracyMeters;
  final DateTime timestamp;
  final GpsSignalQuality signalQuality;

  const LocationTelemetryModel({
    required this.busId,
    this.tripId,
    required this.latitude,
    required this.longitude,
    required this.speedKmh,
    required this.headingDegrees,
    required this.accuracyMeters,
    required this.timestamp,
    this.signalQuality = GpsSignalQuality.good,
  });

  factory LocationTelemetryModel.fromJson(Map<String, dynamic> json) {
    return LocationTelemetryModel(
      busId: json['busId'] as String? ?? '',
      tripId: json['tripId'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      speedKmh: (json['speed'] as num?)?.toDouble() ?? (json['speedKmh'] as num?)?.toDouble() ?? 0.0,
      headingDegrees: (json['heading'] as num?)?.toDouble() ?? (json['headingDegrees'] as num?)?.toDouble() ?? 0.0,
      accuracyMeters: (json['accuracy'] as num?)?.toDouble() ?? (json['accuracyMeters'] as num?)?.toDouble() ?? 5.0,
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
      signalQuality: _parseQuality(json['signalQuality']),
    );
  }

  static GpsSignalQuality _parseQuality(dynamic quality) {
    if (quality is String) {
      return switch (quality.toUpperCase()) {
        'EXCELLENT' => GpsSignalQuality.excellent,
        'GOOD' => GpsSignalQuality.good,
        'POOR' => GpsSignalQuality.poor,
        _ => GpsSignalQuality.lost,
      };
    }
    return GpsSignalQuality.good;
  }

  LocationTelemetryModel copyWith({
    String? busId,
    String? tripId,
    double? latitude,
    double? longitude,
    double? speedKmh,
    double? headingDegrees,
    double? accuracyMeters,
    DateTime? timestamp,
    GpsSignalQuality? signalQuality,
  }) {
    return LocationTelemetryModel(
      busId: busId ?? this.busId,
      tripId: tripId ?? this.tripId,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      speedKmh: speedKmh ?? this.speedKmh,
      headingDegrees: headingDegrees ?? this.headingDegrees,
      accuracyMeters: accuracyMeters ?? this.accuracyMeters,
      timestamp: timestamp ?? this.timestamp,
      signalQuality: signalQuality ?? this.signalQuality,
    );
  }

  Map<String, dynamic> toApiPayload() => {
        'busId': busId,
        if (tripId != null) 'tripId': tripId,
        'latitude': latitude,
        'longitude': longitude,
        'speed': speedKmh,
        'heading': headingDegrees,
        'accuracy': accuracyMeters,
        'timestamp': timestamp.toIso8601String(),
      };
}
