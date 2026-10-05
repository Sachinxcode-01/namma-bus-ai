enum NotificationType {
  tripStarted,
  eta10Min,
  stopReached,
  delay,
  cancellation,
  breakdown,
  routeAnomaly,
  broadcast;

  static NotificationType fromString(String? val) {
    return switch (val?.toUpperCase()) {
      'TRIP_STARTED' => NotificationType.tripStarted,
      'ETA_10_MIN' => NotificationType.eta10Min,
      'STOP_REACHED' => NotificationType.stopReached,
      'DELAY' => NotificationType.delay,
      'CANCELLATION' => NotificationType.cancellation,
      'BREAKDOWN' => NotificationType.breakdown,
      'ROUTE_ANOMALY' => NotificationType.routeAnomaly,
      _ => NotificationType.broadcast,
    };
  }

  String get iconLabel => switch (this) {
        NotificationType.tripStarted => '🚌',
        NotificationType.eta10Min => '⏰',
        NotificationType.stopReached => '📍',
        NotificationType.delay => '⚠️',
        NotificationType.cancellation => '❌',
        NotificationType.breakdown => '🚨',
        NotificationType.routeAnomaly => '🔄',
        NotificationType.broadcast => '📢',
      };
}

class NotificationEntity {
  final String id;
  final String recipientId;
  final String? tripId;
  final NotificationType type;
  final String title;
  final String body;
  final bool isRead;
  final DateTime createdAt;

  const NotificationEntity({
    required this.id,
    required this.recipientId,
    this.tripId,
    required this.type,
    required this.title,
    required this.body,
    this.isRead = false,
    required this.createdAt,
  });

  NotificationEntity copyWith({bool? isRead}) {
    return NotificationEntity(
      id: id,
      recipientId: recipientId,
      tripId: tripId,
      type: type,
      title: title,
      body: body,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
    );
  }

  factory NotificationEntity.fromJson(Map<String, dynamic> json) {
    return NotificationEntity(
      id: json['id'] as String? ?? '',
      recipientId: json['recipientId'] as String? ?? '',
      tripId: json['tripId'] as String?,
      type: NotificationType.fromString(json['type'] as String?),
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      isRead: json['isRead'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'recipientId': recipientId,
        'tripId': tripId,
        'type': type.name.toUpperCase(),
        'title': title,
        'body': body,
        'isRead': isRead,
        'createdAt': createdAt.toIso8601String(),
      };
}
