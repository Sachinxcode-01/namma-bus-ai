class StopEntity {
  final String id;
  final String name;
  final String code;
  final double latitude;
  final double longitude;
  final int geofenceRadiusMeters;
  final String? landmark;

  const StopEntity({
    required this.id,
    required this.name,
    required this.code,
    required this.latitude,
    required this.longitude,
    this.geofenceRadiusMeters = 50,
    this.landmark,
  });

  factory StopEntity.fromJson(Map<String, dynamic> json) {
    return StopEntity(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      code: json['code'] as String? ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      geofenceRadiusMeters: json['geofenceRadiusMeters'] as int? ?? 50,
      landmark: json['landmark'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'code': code,
        'latitude': latitude,
        'longitude': longitude,
        'geofenceRadiusMeters': geofenceRadiusMeters,
        'landmark': landmark,
      };
}
