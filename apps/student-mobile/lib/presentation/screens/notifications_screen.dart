import 'package:flutter/material.dart';
import '../../controllers/notification_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/responsive.dart';
import '../../data/models/notification_model.dart';
import '../widgets/nb_card.dart';
import '../widgets/nb_empty_state.dart';

class NotificationsScreen extends StatelessWidget {
  final NotificationController notificationController;

  const NotificationsScreen({
    super.key,
    required this.notificationController,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Bus & Route Alerts'),
        actions: [
          TextButton(
            onPressed: () => notificationController.markAllAsRead(),
            child: Text(
              'Mark all read',
              style: AppTypography.labelMedium.copyWith(color: AppColors.primaryLight),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: ResponsiveMaxConstraint(
          child: ListenableBuilder(
            listenable: notificationController,
            builder: (context, _) {
              final notifications = notificationController.notifications;
              final isLoading = notificationController.isLoading;
              final selectedFilter = notificationController.selectedFilter;

              return Column(
                children: [
                  // Filter Chips Header
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: context.horizontalPadding,
                      vertical: 10,
                    ),
                    decoration: const BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: AppColors.borderSubtle),
                      ),
                    ),
                    child: Row(
                      children: [
                        _buildFilterChip('ALL', 'All Alerts', selectedFilter),
                        const SizedBox(width: 8),
                        _buildFilterChip('ALERTS', 'Bus & Delays', selectedFilter),
                        const SizedBox(width: 8),
                        _buildFilterChip('SCHEDULE', 'Schedule & College', selectedFilter),
                      ],
                    ),
                  ),

                  // Notification List / Empty State
                  Expanded(
                    child: RefreshIndicator(
                      color: AppColors.primary,
                      backgroundColor: AppColors.surfaceCard,
                      onRefresh: () => notificationController.loadNotifications(),
                      child: isLoading && notifications.isEmpty
                          ? const Center(
                              child: CircularProgressIndicator(
                                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                              ),
                            )
                          : notifications.isEmpty
                              ? const NbEmptyState(
                                  iconEmoji: '🔔',
                                  title: 'No Notifications',
                                  description:
                                      'You have no pending bus alerts. Realtime 10-minute arrival warnings and route updates will appear here.',
                                )
                              : ListView.separated(
                                  physics: const AlwaysScrollableScrollPhysics(),
                                  padding: EdgeInsets.symmetric(
                                    horizontal: context.horizontalPadding,
                                    vertical: 14,
                                  ),
                                  itemCount: notifications.length,
                                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                                  itemBuilder: (context, index) {
                                    final notif = notifications[index];
                                    return _buildNotificationCard(context, notif);
                                  },
                                ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(String filterKey, String label, String currentFilter) {
    final isSelected = filterKey == currentFilter;

    return InkWell(
      onTap: () => notificationController.setFilter(filterKey),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryContainer : AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.borderSubtle,
          ),
        ),
        child: Text(
          label,
          style: AppTypography.labelSmall.copyWith(
            color: isSelected ? AppColors.primaryLight : AppColors.textSecondary,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationCard(BuildContext context, NotificationEntity notif) {
    Color iconBg = switch (notif.type) {
      NotificationType.eta10Min => AppColors.primaryContainer,
      NotificationType.delay || NotificationType.breakdown => AppColors.warningContainer,
      NotificationType.cancellation => AppColors.errorContainer,
      _ => AppColors.surfaceElevated,
    };

    return NbCard(
      variant: notif.isRead ? NbCardVariant.standard : NbCardVariant.highlight,
      padding: const EdgeInsets.all(14),
      onTap: () {
        if (!notif.isRead) {
          notificationController.markAsRead(notif.id);
        }
      },
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: Text(
                notif.type.iconLabel,
                style: const TextStyle(fontSize: 20),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        notif.title,
                        style: AppTypography.titleMedium.copyWith(
                          fontWeight: notif.isRead ? FontWeight.w600 : FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      Formatters.formatTimeAgo(notif.createdAt),
                      style: AppTypography.bodySmall,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  notif.body,
                  style: AppTypography.bodySmall.copyWith(
                    color: notif.isRead ? AppColors.textMuted : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          if (!notif.isRead) ...[
            const SizedBox(width: 8),
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
