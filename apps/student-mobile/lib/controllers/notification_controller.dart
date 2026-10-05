import 'package:flutter/foundation.dart';
import '../data/models/notification_model.dart';
import '../data/repositories/notification_repository.dart';

class NotificationController extends ChangeNotifier {
  final NotificationRepository _notificationRepository;

  List<NotificationEntity> _notifications = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _selectedFilter = 'ALL'; // 'ALL', 'ALERTS', 'SCHEDULE'

  NotificationController({required NotificationRepository notificationRepository})
      : _notificationRepository = notificationRepository;

  List<NotificationEntity> get notifications {
    if (_selectedFilter == 'ALERTS') {
      return _notifications
          .where((n) =>
              n.type == NotificationType.eta10Min ||
              n.type == NotificationType.delay ||
              n.type == NotificationType.breakdown ||
              n.type == NotificationType.cancellation)
          .toList();
    } else if (_selectedFilter == 'SCHEDULE') {
      return _notifications
          .where((n) =>
              n.type == NotificationType.tripStarted ||
              n.type == NotificationType.stopReached ||
              n.type == NotificationType.broadcast)
          .toList();
    }
    return _notifications;
  }

  int get unreadCount => _notifications.where((n) => !n.isRead).length;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get selectedFilter => _selectedFilter;

  Future<void> loadNotifications() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _notificationRepository.getNotifications();
      if (res.isSuccess) {
        _notifications = res.dataOrNull ?? [];
      } else {
        _errorMessage = res.errorOrNull;
      }
    } catch (e) {
      _errorMessage = 'Failed to load notifications: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> markAsRead(String id) async {
    await _notificationRepository.markAsRead(id);
    _notifications = _notifications.map((n) {
      if (n.id == id) {
        return n.copyWith(isRead: true);
      }
      return n;
    }).toList();
    notifyListeners();
  }

  Future<void> markAllAsRead() async {
    for (final notif in _notifications.where((n) => !n.isRead)) {
      await _notificationRepository.markAsRead(notif.id);
    }
    _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList();
    notifyListeners();
  }

  void setFilter(String filter) {
    if (_selectedFilter != filter) {
      _selectedFilter = filter;
      notifyListeners();
    }
  }
}
