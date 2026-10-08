class DriverUserModel {
  final String id;
  final String email;
  final String name;
  final String phone;
  final String licenseNumber;
  final String assignedBusId;
  final String assignedBusNumber;
  final String assignedBusPlate;
  final String? avatarUrl;

  const DriverUserModel({
    required this.id,
    required this.email,
    required this.name,
    required this.phone,
    required this.licenseNumber,
    required this.assignedBusId,
    required this.assignedBusNumber,
    required this.assignedBusPlate,
    this.avatarUrl,
  });

  factory DriverUserModel.fromJson(Map<String, dynamic> json) {
    return DriverUserModel(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      name: json['name'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      licenseNumber: json['licenseNumber'] as String? ?? '',
      assignedBusId: json['assignedBusId'] as String? ?? '',
      assignedBusNumber: json['assignedBusNumber'] as String? ?? '',
      assignedBusPlate: json['assignedBusPlate'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'phone': phone,
        'licenseNumber': licenseNumber,
        'assignedBusId': assignedBusId,
        'assignedBusNumber': assignedBusNumber,
        'assignedBusPlate': assignedBusPlate,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
      };

  DriverUserModel copyWith({
    String? id,
    String? email,
    String? name,
    String? phone,
    String? licenseNumber,
    String? assignedBusId,
    String? assignedBusNumber,
    String? assignedBusPlate,
    String? avatarUrl,
  }) {
    return DriverUserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      licenseNumber: licenseNumber ?? this.licenseNumber,
      assignedBusId: assignedBusId ?? this.assignedBusId,
      assignedBusNumber: assignedBusNumber ?? this.assignedBusNumber,
      assignedBusPlate: assignedBusPlate ?? this.assignedBusPlate,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }
}
