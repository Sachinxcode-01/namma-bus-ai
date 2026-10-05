class RouteStopModel {
  final String id;
  final String name;
  final int sequence;
  final double latitude;
  final double longitude;
  final String? scheduledTime;
  final bool isCompleted;

  const RouteStopModel({
    required this.id,
    required this.name,
    required this.sequence,
    required this.latitude,
    required this.longitude,
    this.scheduledTime,
    this.isCompleted = false,
  });

  factory RouteStopModel.fromJson(Map<String, dynamic> json) {
    return RouteStopModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      sequence: (json['sequence'] as num?)?.toInt() ?? 0,
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      scheduledTime: json['scheduledTime'] as String?,
      isCompleted: json['isCompleted'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'sequence': sequence,
        'latitude': latitude,
        'longitude': longitude,
        if (scheduledTime != null) 'scheduledTime': scheduledTime,
        'isCompleted': isCompleted,
      };

  RouteStopModel copyWith({
    String? id,
    String? name,
    int? sequence,
    double? latitude,
    double? longitude,
    String? scheduledTime,
    bool? isCompleted,
  }) {
    return RouteStopModel(
      id: id ?? this.id,
      name: name ?? this.name,
      sequence: sequence ?? this.sequence,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      scheduledTime: scheduledTime ?? this.scheduledTime,
      isCompleted: isCompleted ?? this.isCompleted,
    );
  }
}

class BusRouteModel {
  final String id;
  final String routeCode;
  final String routeName;
  final String origin;
  final String destination;
  final double totalDistanceKm;
  final int estimatedDurationMinutes;
  final List<RouteStopModel> stops;

  const BusRouteModel({
    required this.id,
    required this.routeCode,
    required this.routeName,
    required this.origin,
    required this.destination,
    required this.totalDistanceKm,
    required this.estimatedDurationMinutes,
    required this.stops,
  });

  factory BusRouteModel.fromJson(Map<String, dynamic> json) {
    final rawStops = json['stops'] as List<dynamic>? ?? [];
    return BusRouteModel(
      id: json['id'] as String? ?? '',
      routeCode: json['routeCode'] as String? ?? '',
      routeName: json['routeName'] as String? ?? '',
      origin: json['origin'] as String? ?? '',
      destination: json['destination'] as String? ?? '',
      totalDistanceKm: (json['totalDistanceKm'] as num?)?.toDouble() ?? 0.0,
      estimatedDurationMinutes: (json['estimatedDurationMinutes'] as num?)?.toInt() ?? 0,
      stops: rawStops.map((e) => RouteStopModel.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'routeCode': routeCode,
        'routeName': routeName,
        'origin': origin,
        'destination': destination,
        'totalDistanceKm': totalDistanceKm,
        'estimatedDurationMinutes': estimatedDurationMinutes,
        'stops': stops.map((e) => e.toJson()).toList(),
      };
}
