enum IncidentType {
  breakdown,
  busIssue,
  routeIssue,
  heavyTraffic,
  medicalEmergency,
  other;

  String get label => switch (this) {
        IncidentType.breakdown => 'Engine / Mechanical Breakdown',
        IncidentType.busIssue => 'Bus Issue (Tire / A/C / Door)',
        IncidentType.routeIssue => 'Route Blocked / Road Closure',
        IncidentType.heavyTraffic => 'Severe Traffic Delay (>20 min)',
        IncidentType.medicalEmergency => 'Medical / Passenger Emergency',
        IncidentType.other => 'Other Incident',
      };

  String get shortCode => switch (this) {
        IncidentType.breakdown => 'BREAKDOWN',
        IncidentType.busIssue => 'BUS_ISSUE',
        IncidentType.routeIssue => 'ROUTE_ISSUE',
        IncidentType.heavyTraffic => 'TRAFFIC',
        IncidentType.medicalEmergency => 'MEDICAL',
        IncidentType.other => 'OTHER',
      };
}

enum IncidentSeverity {
  low,
  medium,
  high,
  critical;

  String get label => switch (this) {
        IncidentSeverity.low => 'Low',
        IncidentSeverity.medium => 'Medium',
        IncidentSeverity.high => 'High',
        IncidentSeverity.critical => 'Critical / Urgent',
      };
}

class IncidentReportModel {
  final String id;
  final String tripId;
  final String busId;
  final IncidentType type;
  final IncidentSeverity severity;
  final String description;
  final double? latitude;
  final double? longitude;
  final DateTime createdAt;
  final bool isResolved;

  const IncidentReportModel({
    required this.id,
    required this.tripId,
    required this.busId,
    required this.type,
    required this.severity,
    required this.description,
    this.latitude,
    this.longitude,
    required this.createdAt,
    this.isResolved = false,
  });

  factory IncidentReportModel.fromJson(Map<String, dynamic> json) {
    return IncidentReportModel(
      id: json['id'] as String? ?? '',
      tripId: json['tripId'] as String? ?? '',
      busId: json['busId'] as String? ?? '',
      type: _parseType(json['type']),
      severity: _parseSeverity(json['severity']),
      description: json['description'] as String? ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      isResolved: json['isResolved'] as bool? ?? false,
    );
  }

  static IncidentType _parseType(dynamic val) {
    final str = val?.toString().toUpperCase() ?? '';
    return switch (str) {
      'BREAKDOWN' => IncidentType.breakdown,
      'BUS_ISSUE' => IncidentType.busIssue,
      'ROUTE_ISSUE' => IncidentType.routeIssue,
      'TRAFFIC' => IncidentType.heavyTraffic,
      'MEDICAL' => IncidentType.medicalEmergency,
      _ => IncidentType.other,
    };
  }

  static IncidentSeverity _parseSeverity(dynamic val) {
    final str = val?.toString().toUpperCase() ?? '';
    return switch (str) {
      'LOW' => IncidentSeverity.low,
      'MEDIUM' => IncidentSeverity.medium,
      'HIGH' => IncidentSeverity.high,
      'CRITICAL' => IncidentSeverity.critical,
      _ => IncidentSeverity.medium,
    };
  }

  Map<String, dynamic> toApiPayload() => {
        'tripId': tripId,
        'busId': busId,
        'type': type.shortCode,
        'severity': severity.name.toUpperCase(),
        'description': description,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        'timestamp': createdAt.toIso8601String(),
      };
}
