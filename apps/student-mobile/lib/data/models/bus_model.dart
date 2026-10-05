enum BusStatus {
  activeEnRoute,
  delayed,
  scheduled,
  completed,
  inactive,
  breakdown;

  String get label => switch (this) {
        BusStatus.activeEnRoute => 'Active En Route',
        BusStatus.delayed => 'Delayed',
        BusStatus.scheduled => 'Scheduled',
        BusStatus.completed => 'Trip Completed',
        BusStatus.inactive => 'Service Inactive',
        BusStatus.breakdown => 'Bus Breakdown / Alert',
      };

  static BusStatus fromString(String? val, {int delayMinutes = 0}) {
    if (val == null) return BusStatus.inactive;
    final normalized = val.toUpperCase();
    if (normalized == 'BREAKDOWN') return BusStatus.breakdown;
    if (normalized == 'COMPLETED') return BusStatus.completed;
    if (normalized == 'SCHEDULED') return BusStatus.scheduled;
    if (normalized == 'ACTIVE') {
      return delayMinutes > 5 ? BusStatus.delayed : BusStatus.activeEnRoute;
    }
    return BusStatus.inactive;
  }
}

class BusEntity {
  final String id;
  final String busNumber;
  final String registrationNumber;
  final int capacity;
  final bool isActive;
  final BusStatus status;
  final String? driverName;
  final String? driverPhone;

  const BusEntity({
    required this.id,
    required this.busNumber,
    required this.registrationNumber,
    this.capacity = 50,
    this.isActive = true,
    this.status = BusStatus.activeEnRoute,
    this.driverName,
    this.driverPhone,
  });

  factory BusEntity.fromJson(Map<String, dynamic> json) {
    return BusEntity(
      id: json['id'] as String? ?? '',
      busNumber: json['busNumber'] as String? ?? 'NB-01',
      registrationNumber: json['registrationNumber'] as String? ?? 'KA-01-EQ-1024',
      capacity: json['capacity'] as int? ?? 50,
      isActive: json['isActive'] as bool? ?? true,
      status: BusStatus.fromString(json['status'] as String?),
      driverName: json['driverName'] as String? ?? 'Ramesh Kumar',
      driverPhone: json['driverPhone'] as String? ?? '+91 98450 12345',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'busNumber': busNumber,
        'registrationNumber': registrationNumber,
        'capacity': capacity,
        'isActive': isActive,
        'status': status.name,
        'driverName': driverName,
        'driverPhone': driverPhone,
      };
}
