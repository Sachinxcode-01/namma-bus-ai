import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/responsive.dart';
import '../widgets/driver_card.dart';

class DriverAlertItem {
  final String title;
  final String message;
  final String time;
  final IconData icon;
  final Color iconColor;

  const DriverAlertItem({
    required this.title,
    required this.message,
    required this.time,
    required this.icon,
    required this.iconColor,
  });
}

class DriverAlertsScreen extends StatelessWidget {
  const DriverAlertsScreen({super.key});

  static const List<DriverAlertItem> _alerts = [
    DriverAlertItem(
      title: 'Morning Route Assigned',
      message: 'You are assigned to Route 101 (Majestic to Campus Express) on Bus NB-01. Scheduled departure: 07:30 AM.',
      time: '07:00 AM',
      icon: Icons.directions_bus,
      iconColor: AppColors.primary,
    ),
    DriverAlertItem(
      title: 'Road Closure / Detour Alert',
      message: 'St. John\'s Hospital flyover maintenance work underway. Use ground level service lane.',
      time: '06:45 AM',
      icon: Icons.alt_route,
      iconColor: AppColors.warning,
    ),
    DriverAlertItem(
      title: 'Safety Reminder',
      message: 'Keep headlights on and ensure phone is mounted securely on vehicle dock before departure.',
      time: 'Yesterday',
      icon: Icons.health_and_safety,
      iconColor: AppColors.gpsActive,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final horizontalPadding = Responsive.contentHorizontalPadding(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Driver Alerts', style: AppTypography.headlineMedium),
      ),
      body: SafeArea(
        child: ListView.separated(
          padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 16),
          itemCount: _alerts.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final alert = _alerts[index];
            return DriverCard(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: alert.iconColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(alert.icon, color: alert.iconColor, size: 20),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(alert.title, style: AppTypography.headlineSmall),
                            Text(alert.time, style: AppTypography.bodySmall),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(alert.message, style: AppTypography.bodyMedium),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
