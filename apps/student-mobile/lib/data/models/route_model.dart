import 'stop_model.dart';

class RouteStopEntity {
  final String id;
  final String routeId;
  final String stopId;
  final int sequenceOrder;
  final int? estimatedMinutesFromStart;
  final StopEntity? stop;

  const RouteStopEntity({
    required this.id,
    required this.routeId,
    required this.stopId,
    required this.sequenceOrder,
    this.estimatedMinutesFromStart,
    this.stop,
  });

  factory RouteStopEntity.fromJson(Map<String, dynamic> json) {
    return RouteStopEntity(
      id: json['id'] as String? ?? '',
      routeId: json['routeId'] as String? ?? '',
      stopId: json['stopId'] as String? ?? '',
      sequenceOrder: json['sequenceOrder'] as int? ?? 1,
      estimatedMinutesFromStart: json['estimatedMinutesFromStart'] as int?,
      stop: json['stop'] != null ? StopEntity.fromJson(json['stop'] as Map<String, dynamic>) : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'routeId': routeId,
        'stopId': stopId,
        'sequenceOrder': sequenceOrder,
        'estimatedMinutesFromStart': estimatedMinutesFromStart,
        'stop': stop?.toJson(),
      };
}

class RouteEntity {
  final String id;
  final String name;
  final String code;
  final String? description;
  final bool isActive;
  final List<RouteStopEntity> routeStops;

  const RouteEntity({
    required this.id,
    required this.name,
    required this.code,
    this.description,
    this.isActive = true,
    this.routeStops = const [],
  });

  factory RouteEntity.fromJson(Map<String, dynamic> json) {
    final rawStops = json['routeStops'] as List<dynamic>? ?? [];
    return RouteEntity(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      code: json['code'] as String? ?? '',
      description: json['description'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      routeStops: rawStops
          .map((s) => RouteStopEntity.fromJson(s as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'code': code,
        'description': description,
        'isActive': isActive,
        'routeStops': routeStops.map((s) => s.toJson()).toList(),
      };
}
