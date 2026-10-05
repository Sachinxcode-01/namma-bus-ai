import 'bus_route_model.dart';

enum DriverTripStatus {
  notStarted,
  starting,
  active,
  ending,
  completed,
  cancelled;

  String get label => switch (this) {
        DriverTripStatus.notStarted => 'NOT STARTED',
        DriverTripStatus.starting => 'STARTING...',
        DriverTripStatus.active => 'TRIP IN PROGRESS',
        DriverTripStatus.ending => 'ENDING...',
        DriverTripStatus.completed => 'TRIP COMPLETED',
        DriverTripStatus.cancelled => 'CANCELLED',
      };

  bool get isActive => this == DriverTripStatus.active;
  bool get isCompleted => this == DriverTripStatus.completed;
  bool get canStart => this == DriverTripStatus.notStarted;
  bool get canEnd => this == DriverTripStatus.active;
}

class DriverTripModel {
  final String id;
  final String busId;
  final String busNumber;
  final String routeId;
  final String routeCode;
  final String routeName;
  final DriverTripStatus status;
  final DateTime? scheduledStartTime;
  final DateTime? actualStartTime;
  final DateTime? actualEndTime;
  final int currentStopIndex;
  final int totalStops;
  final List<RouteStopModel> stops;

  const DriverTripModel({
    required this.id,
    required this.busId,
    required this.busNumber,
    required this.routeId,
    required this.routeCode,
    required this.routeName,
    this.status = DriverTripStatus.notStarted,
    this.scheduledStartTime,
    this.actualStartTime,
    this.actualEndTime,
    this.currentStopIndex = 0,
    this.totalStops = 0,
    this.stops = const [],
  });

  factory DriverTripModel.fromJson(Map<String, dynamic> json) {
    final rawStops = json['stops'] as List<dynamic>? ?? [];
    return DriverTripModel(
      id: json['id'] as String? ?? '',
      busId: json['busId'] as String? ?? '',
      busNumber: json['busNumber'] as String? ?? '',
      routeId: json['routeId'] as String? ?? '',
      routeCode: json['routeCode'] as String? ?? '',
      routeName: json['routeName'] as String? ?? '',
      status: _parseStatus(json['status']),
      scheduledStartTime: json['scheduledStartTime'] != null
          ? DateTime.tryParse(json['scheduledStartTime'].toString())
          : null,
      actualStartTime: json['actualStartTime'] != null
          ? DateTime.tryParse(json['actualStartTime'].toString())
          : null,
      actualEndTime: json['actualEndTime'] != null
          ? DateTime.tryParse(json['actualEndTime'].toString())
          : null,
      currentStopIndex: (json['currentStopIndex'] as num?)?.toInt() ?? 0,
      totalStops: (json['totalStops'] as num?)?.toInt() ?? rawStops.length,
      stops: rawStops.map((e) => RouteStopModel.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  static DriverTripStatus _parseStatus(dynamic status) {
    if (status is String) {
      return switch (status.toUpperCase()) {
        'NOT_STARTED' || 'SCHEDULED' => DriverTripStatus.notStarted,
        'STARTING' => DriverTripStatus.starting,
        'IN_PROGRESS' || 'ACTIVE' => DriverTripStatus.active,
        'ENDING' => DriverTripStatus.ending,
        'COMPLETED' => DriverTripStatus.completed,
        'CANCELLED' => DriverTripStatus.cancelled,
        _ => DriverTripStatus.notStarted,
      };
    }
    return DriverTripStatus.notStarted;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'busId': busId,
        'busNumber': busNumber,
        'routeId': routeId,
        'routeCode': routeCode,
        'routeName': routeName,
        'status': status.name.toUpperCase(),
        if (scheduledStartTime != null) 'scheduledStartTime': scheduledStartTime!.toIso8601String(),
        if (actualStartTime != null) 'actualStartTime': actualStartTime!.toIso8601String(),
        if (actualEndTime != null) 'actualEndTime': actualEndTime!.toIso8601String(),
        'currentStopIndex': currentStopIndex,
        'totalStops': totalStops,
        'stops': stops.map((e) => e.toJson()).toList(),
      };

  DriverTripModel copyWith({
    String? id,
    String? busId,
    String? busNumber,
    String? routeId,
    String? routeCode,
    String? routeName,
    DriverTripStatus? status,
    DateTime? scheduledStartTime,
    DateTime? actualStartTime,
    DateTime? actualEndTime,
    int? currentStopIndex,
    int? totalStops,
    List<RouteStopModel>? stops,
  }) {
    return DriverTripModel(
      id: id ?? this.id,
      busId: busId ?? this.busId,
      busNumber: busNumber ?? this.busNumber,
      routeId: routeId ?? this.routeId,
      routeCode: routeCode ?? this.routeCode,
      routeName: routeName ?? this.routeName,
      status: status ?? this.status,
      scheduledStartTime: scheduledStartTime ?? this.scheduledStartTime,
      actualStartTime: actualStartTime ?? this.actualStartTime,
      actualEndTime: actualEndTime ?? this.actualEndTime,
      currentStopIndex: currentStopIndex ?? this.currentStopIndex,
      totalStops: totalStops ?? this.totalStops,
      stops: stops ?? this.stops,
    );
  }
}
