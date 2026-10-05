enum UserRole {
  student,
  driver,
  admin;

  static UserRole fromString(String? val) {
    return switch (val?.toUpperCase()) {
      'DRIVER' => UserRole.driver,
      'ADMIN' => UserRole.admin,
      _ => UserRole.student,
    };
  }

  String toApiString() => name.toUpperCase();
}

class StudentProfile {
  final String id;
  final String userId;
  final String usn;
  final String name;
  final String? phone;
  final String? department;
  final String? semester;

  const StudentProfile({
    required this.id,
    required this.userId,
    required this.usn,
    required this.name,
    this.phone,
    this.department,
    this.semester,
  });

  factory StudentProfile.fromJson(Map<String, dynamic> json) {
    return StudentProfile(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      usn: json['usn'] as String? ?? '1MS21CS042',
      name: json['name'] as String? ?? 'Student',
      phone: json['phone'] as String?,
      department: json['department'] as String? ?? 'Computer Science & Eng.',
      semester: json['semester'] as String? ?? '6th Sem',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'usn': usn,
        'name': name,
        'phone': phone,
        'department': department,
        'semester': semester,
      };
}

class UserProfile {
  final String id;
  final String email;
  final UserRole role;
  final bool isActive;
  final StudentProfile? student;

  const UserProfile({
    required this.id,
    required this.email,
    required this.role,
    this.isActive = true,
    this.student,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: UserRole.fromString(json['role'] as String?),
      isActive: json['isActive'] as bool? ?? true,
      student: json['student'] != null
          ? StudentProfile.fromJson(json['student'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'role': role.toApiString(),
        'isActive': isActive,
        'student': student?.toJson(),
      };
}

class LoginResponseData {
  final String accessToken;
  final String refreshToken;
  final int expiresIn;
  final UserProfile user;

  const LoginResponseData({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
    required this.user,
  });

  factory LoginResponseData.fromJson(Map<String, dynamic> json) {
    return LoginResponseData(
      accessToken: json['accessToken'] as String? ?? '',
      refreshToken: json['refreshToken'] as String? ?? '',
      expiresIn: json['expiresIn'] as int? ?? 3600,
      user: UserProfile.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}
