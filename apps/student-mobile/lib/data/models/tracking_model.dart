enum StopEtaStatus {
  passed,
  approaching,
  next,
  upcoming;

  static StopEtaStatus fromString(String? val) {
    return switch (val?.toUpperCase()) {
      'PASSED' => StopEtaStatus.passed,
      'APPROACHING' => StopEtaStatus.approaching,
      'NEXT' => StopEtaStatus.next,
      _ => StopEtaStatus.upcoming,
    };
  }

  String get label => switch (this) {
        StopEtaStatus.passed => 'Passed',
        StopEtaStatus.approaching => 'Approaching',
        StopEtaStatus.next => 'Next Stop',
        StopEtaStatus.upcoming => 'Upcoming',
      };
}

class LiveLocationEntity {
  final String busId;
  final String tripId;
  final double latitude;
  final double longitude;
  final double speed; // km/h
  final double heading;
  final double accuracy;
  final DateTime timestamp;

  const LiveLocationEntity({
    required this.busId,
    required this.tripId,
    required this.latitude,
    required this.longitude,
    this.speed = 32.0,
    this.heading = 45.0,
    this.accuracy = 8.0,
    required this.timestamp,
  });

  factory LiveLocationEntity.fromJson(Map<String, dynamic> json) {
    return LiveLocationEntity(
      busId: json['busId'] as String? ?? '',
      tripId: json['tripId'] as String? ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 12.9716,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 77.5946,
      speed: (json['speed'] as num?)?.toDouble() ?? 0.0,
      heading: (json['heading'] as num?)?.toDouble() ?? 0.0,
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 10.0,
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'busId': busId,
        'tripId': tripId,
        'latitude': latitude,
        'longitude': longitude,
        'speed': speed,
        'heading': heading,
        'accuracy': accuracy,
        'timestamp': timestamp.toIso8601String(),
      };
}

class StopEtaDto {
  final String stopId;
  final String stopName;
  final String stopCode;
  final int sequenceOrder;
  final double latitude;
  final double longitude;
  final int estimatedMinutes;
  final DateTime estimatedArrivalTime;
  final int distanceRemainingMeters;
  final StopEtaStatus status;

  const StopEtaDto({
    required this.stopId,
    required this.stopName,
    required this.stopCode,
    required this.sequenceOrder,
    required this.latitude,
    required this.longitude,
    required this.estimatedMinutes,
    required this.estimatedArrivalTime,
    required this.distanceRemainingMeters,
    required this.status,
  });

  factory StopEtaDto.fromJson(Map<String, dynamic> json) {
    return StopEtaDto(
      stopId: json['stopId'] as String? ?? '',
      stopName: json['stopName'] as String? ?? '',
      stopCode: json['stopCode'] as String? ?? '',
      sequenceOrder: json['sequenceOrder'] as int? ?? 1,
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      estimatedMinutes: json['estimatedMinutes'] as int? ?? 0,
      estimatedArrivalTime: json['estimatedArrivalTime'] != null
          ? DateTime.tryParse(json['estimatedArrivalTime'] as String) ?? DateTime.now()
          : DateTime.now(),
      distanceRemainingMeters: json['distanceRemainingMeters'] as int? ?? 0,
      status: StopEtaStatus.fromString(json['status'] as String?),
    );
  }

  Map<String, dynamic> toJson() => {
        'stopId': stopId,
        'stopName': stopName,
        'stopCode': stopCode,
        'sequenceOrder': sequenceOrder,
        'latitude': latitude,
        'longitude': longitude,
        'estimatedMinutes': estimatedMinutes,
        'estimatedArrivalTime': estimatedArrivalTime.toIso8601String(),
        'distanceRemainingMeters': distanceRemainingMeters,
        'status': status.name.toUpperCase(),
      };
}

class TripEtaResponse {
  final String tripId;
  final String busId;
  final String routeId;
  final DateTime lastUpdated;
  final int currentDelayMinutes;
  final List<StopEtaDto> stops;

  const TripEtaResponse({
    required this.tripId,
    required this.busId,
    required this.routeId,
    required this.lastUpdated,
    required this.currentDelayMinutes,
    required this.stops,
  });

  factory TripEtaResponse.fromJson(Map<String, dynamic> json) {
    final rawStops = json['stops'] as List<dynamic>? ?? [];
    return TripEtaResponse(
      tripId: json['tripId'] as String? ?? '',
      busId: json['busId'] as String? ?? '',
      routeId: json['routeId'] as String? ?? '',
      lastUpdated: json['lastUpdated'] != null
          ? DateTime.tryParse(json['lastUpdated'] as String) ?? DateTime.now()
          : DateTime.now(),
      currentDelayMinutes: json['currentDelayMinutes'] as int? ?? 0,
      stops: rawStops
          .map((s) => StopEtaDto.fromJson(s as Map<String, dynamic>))
          .toList(),
    );
  }

  StopEtaDto? getStopEta(String stopId) {
    try {
      return stops.firstWhere((s) => s.stopId == stopId);
    } catch (_) {
      return null;
    }
  }
}
