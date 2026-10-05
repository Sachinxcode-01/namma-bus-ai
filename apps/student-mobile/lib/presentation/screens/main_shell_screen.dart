import 'package:flutter/material.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/notification_controller.dart';
import '../../controllers/tracking_controller.dart';
import '../../controllers/transport_controller.dart';
import '../../core/network/http_client.dart';
import '../../core/theme/app_colors.dart';
import '../../data/repositories/notification_repository.dart';
import '../../data/repositories/tracking_repository.dart';
import 'home_dashboard_screen.dart';
import 'live_tracking_screen.dart';
import 'notifications_screen.dart';
import 'profile_screen.dart';

class MainShellScreen extends StatefulWidget {
  final AuthController authController;
  final TransportController transportController;

  const MainShellScreen({
    super.key,
    required this.authController,
    required this.transportController,
  });

  @override
  State<MainShellScreen> createState() => MainShellScreenState();
}

class MainShellScreenState extends State<MainShellScreen> {
  int _currentIndex = 0;
  late final TrackingController _trackingController;
  late final NotificationController _notificationController;

  @override
  void initState() {
    super.initState();
    final httpClient = ApiHttpClient();

    _trackingController = TrackingController(
      trackingRepository: TrackingRepositoryImpl(httpClient: httpClient),
    );

    _notificationController = NotificationController(
      notificationRepository: NotificationRepositoryImpl(httpClient: httpClient),
    );

    // Initial data loading
    _notificationController.loadNotifications();

    // Start live tracking for selected bus
    final bus = widget.transportController.selectedBus;
    if (bus != null) {
      _trackingController.startPolling(busId: bus.id);
    }

    // Listen for bus changes in TransportController
    widget.transportController.addListener(_onTransportChanged);
  }

  void _onTransportChanged() {
    final bus = widget.transportController.selectedBus;
    if (bus != null) {
      _trackingController.startPolling(busId: bus.id);
    }
  }

  void switchTab(int index) {
    if (index >= 0 && index < 4 && _currentIndex != index) {
      setState(() {
        _currentIndex = index;
      });
    }
  }

  @override
  void dispose() {
    widget.transportController.removeListener(_onTransportChanged);
    _trackingController.dispose();
    _notificationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          HomeDashboardScreen(
            authController: widget.authController,
            transportController: widget.transportController,
            trackingController: _trackingController,
            notificationController: _notificationController,
            onNavigateToTracking: () => switchTab(1),
          ),
          LiveTrackingScreen(
            transportController: widget.transportController,
            trackingController: _trackingController,
          ),
          NotificationsScreen(
            notificationController: _notificationController,
          ),
          ProfileScreen(
            authController: widget.authController,
            transportController: widget.transportController,
          ),
        ],
      ),
      bottomNavigationBar: ListenableBuilder(
        listenable: _notificationController,
        builder: (context, _) {
          final unreadCount = _notificationController.unreadCount;

          return Container(
            decoration: const BoxDecoration(
              border: Border(
                top: BorderSide(color: AppColors.borderSubtle, width: 1),
              ),
            ),
            child: BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: (index) {
                setState(() {
                  _currentIndex = index;
                });
              },
              backgroundColor: AppColors.surface,
              selectedItemColor: AppColors.primary,
              unselectedItemColor: AppColors.textMuted,
              selectedFontSize: 12,
              unselectedFontSize: 12,
              type: BottomNavigationBarType.fixed,
              items: [
                const BottomNavigationBarItem(
                  icon: Icon(Icons.home_outlined),
                  activeIcon: Icon(Icons.home_filled),
                  label: 'Home',
                ),
                const BottomNavigationBarItem(
                  icon: Icon(Icons.navigation_outlined),
                  activeIcon: Icon(Icons.navigation_rounded),
                  label: 'Live Track',
                ),
                BottomNavigationBarItem(
                  icon: Badge(
                    isLabelVisible: unreadCount > 0,
                    label: Text(
                      unreadCount.toString(),
                      style: const TextStyle(fontSize: 10, color: Colors.white),
                    ),
                    backgroundColor: AppColors.primary,
                    child: const Icon(Icons.notifications_outlined),
                  ),
                  activeIcon: Badge(
                    isLabelVisible: unreadCount > 0,
                    label: Text(
                      unreadCount.toString(),
                      style: const TextStyle(fontSize: 10, color: Colors.white),
                    ),
                    backgroundColor: AppColors.primary,
                    child: const Icon(Icons.notifications_rounded),
                  ),
                  label: 'Alerts',
                ),
                const BottomNavigationBarItem(
                  icon: Icon(Icons.person_outline),
                  activeIcon: Icon(Icons.person_rounded),
                  label: 'Profile',
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
