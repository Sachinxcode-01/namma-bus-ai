import 'package:flutter/material.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/notification_controller.dart';
import '../../controllers/tracking_controller.dart';
import '../../controllers/transport_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/responsive.dart';
import '../../data/models/bus_model.dart';
import '../../data/models/notification_model.dart';
import '../../data/models/route_model.dart';
import '../widgets/nb_badge.dart';
import '../widgets/nb_button.dart';
import '../widgets/nb_card.dart';
import '../widgets/nb_eta_ticker.dart';
import '../widgets/nb_interactive_map.dart';
import '../widgets/nb_stop_timeline.dart';
import 'bus_selection_screen.dart';

class HomeDashboardScreen extends StatelessWidget {
  final AuthController authController;
  final TransportController transportController;
  final TrackingController trackingController;
  final NotificationController notificationController;
  final VoidCallback onNavigateToTracking;

  const HomeDashboardScreen({
    super.key,
    required this.authController,
    required this.transportController,
    required this.trackingController,
    required this.notificationController,
    required this.onNavigateToTracking,
  });

  void _openBusSelection(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => BusSelectionScreen(
          transportController: transportController,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: ResponsiveMaxConstraint(
          child: RefreshIndicator(
            color: AppColors.primary,
            backgroundColor: AppColors.surfaceCard,
            onRefresh: () async {
              await Future.wait([
                transportController.loadTransportData(),
                trackingController.refreshNow(),
                notificationController.loadNotifications(),
              ]);
            },
            child: ListenableBuilder(
              listenable: Listenable.merge([
                authController,
                transportController,
                trackingController,
                notificationController,
              ]),
              builder: (context, _) {
                final student = authController.user?.student;
                final bus = transportController.selectedBus;
                final route = transportController.selectedRoute;
                final stop = transportController.selectedStop;
                final eta = trackingController.getEtaForStop(stop?.id);
                final liveLoc = trackingController.liveLocation;
                final isGpsStale = trackingController.isGpsStale;
                final isInactive = bus?.status == BusStatus.inactive ||
                    bus?.status == BusStatus.completed;

                // Check for high-priority alerts
                final urgentAlert = notificationController.notifications.where((n) =>
                    n.type == NotificationType.delay ||
                    n.type == NotificationType.breakdown ||
                    n.type == NotificationType.cancellation).firstOrNull;

                return SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: EdgeInsets.symmetric(
                    horizontal: context.horizontalPadding,
                    vertical: 16,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header: Student Greeting & Bus Selector
                      _buildHeader(context, student?.name ?? 'Student', student?.usn ?? '1MS21CS042', bus?.busNumber ?? 'NB-01'),
                      const SizedBox(height: 16),

                      // Urgent Transport Alert if active
                      if (urgentAlert != null) ...[
                        _buildUrgentAlert(urgentAlert),
                        const SizedBox(height: 16),
                      ],

                      // Bus Status Banner & Route Info
                      _buildBusHeroCard(context, bus, route, stop),
                      const SizedBox(height: 16),

                      // Primary Arrival ETA Ticker
                      NbEtaTicker(
                        stopEta: eta,
                        stopName: stop?.name ?? 'Selected Stop',
                        isGpsStale: isGpsStale,
                        isInactive: isInactive,
                      ),
                      const SizedBox(height: 16),

                      // 10-Minute Stop Alert Toggle
                      _buildAlertToggleCard(stop?.name ?? 'your stop'),
                      const SizedBox(height: 16),

                      // Live Map Quick View & Entry Point
                      _buildMapPreviewCard(context, bus, liveLoc, isGpsStale, isInactive),
                      const SizedBox(height: 20),

                      // Route Stop Progression Timeline
                      _buildStopProgressionSection(),
                      const SizedBox(height: 20),

                      // Driver Support Card
                      if (bus != null) _buildDriverCard(bus),
                      const SizedBox(height: 24),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, String name, String usn, String busNumber) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      'Namaste, $name',
                      style: AppTypography.headlineMedium.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text('👋', style: TextStyle(fontSize: 16)),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                'USN: $usn • College Transport',
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        InkWell(
          onTap: () => _openBusSelection(context),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.directions_bus_rounded, color: AppColors.primaryLight, size: 16),
                const SizedBox(width: 6),
                Text(
                  busNumber,
                  style: AppTypography.labelLarge.copyWith(color: AppColors.textPrimary),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_drop_down, color: AppColors.textMuted, size: 18),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildUrgentAlert(NotificationEntity alert) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.warningContainer,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert.title,
                  style: AppTypography.titleMedium.copyWith(
                    color: AppColors.warning,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  alert.body,
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBusHeroCard(
    BuildContext context,
    BusEntity? bus,
    RouteEntity? route,
    dynamic stop,
  ) {
    final status = bus?.status ?? BusStatus.activeEnRoute;
    final NbBadgeVariant badgeVariant = switch (status) {
      BusStatus.activeEnRoute => NbBadgeVariant.success,
      BusStatus.delayed => NbBadgeVariant.warning,
      BusStatus.breakdown => NbBadgeVariant.error,
      BusStatus.scheduled => NbBadgeVariant.primary,
      _ => NbBadgeVariant.neutral,
    };

    return NbCard(
      variant: NbCardVariant.standard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        bus?.busNumber ?? 'NB-01',
                        style: AppTypography.titleMedium.copyWith(
                          color: AppColors.primaryLight,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        bus?.registrationNumber ?? 'KA-01-EQ-1024',
                        style: AppTypography.bodySmall,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              NbBadge(
                label: status.label,
                variant: badgeVariant,
                showDot: true,
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(),
          const SizedBox(height: 12),

          // Route & Boarding Stop Details
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('ASSIGNED ROUTE', style: AppTypography.labelSmall),
                    const SizedBox(height: 2),
                    Text(
                      route?.name ?? 'Greenfield Campus Express',
                      style: AppTypography.titleMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('YOUR STOP', style: AppTypography.labelSmall),
                  const SizedBox(height: 2),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        stop?.name ?? 'Engineering Annex',
                        style: AppTypography.titleMedium.copyWith(
                          color: AppColors.warning,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.star, color: AppColors.warning, size: 14),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAlertToggleCard(String stopName) {
    return NbCard(
      variant: NbCardVariant.standard,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.primaryContainer,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.notifications_active_outlined,
                color: AppColors.primaryLight, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '10-Minute Arrival Alert',
                  style: AppTypography.titleMedium,
                ),
                Text(
                  'Notify me before bus reaches $stopName',
                  style: AppTypography.bodySmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Switch(
            value: transportController.is10MinAlertEnabled,
            onChanged: (val) {
              transportController.toggle10MinAlert(val);
            },
            activeThumbColor: AppColors.primary,
            activeTrackColor: AppColors.primaryLight.withValues(alpha: 0.3),
          ),
        ],
      ),
    );
  }

  Widget _buildMapPreviewCard(
    BuildContext context,
    BusEntity? bus,
    dynamic liveLoc,
    bool isGpsStale,
    bool isInactive,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                'Live Bus Tracking',
                style: AppTypography.headlineMedium,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            TextButton(
              onPressed: onNavigateToTracking,
              child: Row(
                children: [
                  Text(
                    'Full Map',
                    style: AppTypography.labelLarge.copyWith(color: AppColors.primaryLight),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.arrow_forward, color: AppColors.primaryLight, size: 16),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: onNavigateToTracking,
          borderRadius: BorderRadius.circular(20),
          child: NbInteractiveMap(
            height: 200,
            stops: transportController.stops,
            selectedStopId: transportController.selectedStopId,
            liveLocation: liveLoc,
            busNumber: bus?.busNumber ?? 'NB-01',
            isGpsStale: isGpsStale,
            isInactive: isInactive,
          ),
        ),
      ],
    );
  }

  Widget _buildStopProgressionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Stop Progression', style: AppTypography.headlineMedium),
        const SizedBox(height: 4),
        Text(
          'Live sequence along ${transportController.selectedRoute?.name ?? 'current route'}',
          style: AppTypography.bodySmall,
        ),
        const SizedBox(height: 12),
        NbCard(
          variant: NbCardVariant.standard,
          child: NbStopTimeline(
            stops: transportController.stops,
            selectedStopId: transportController.selectedStopId,
            etaData: trackingController.etaData,
          ),
        ),
      ],
    );
  }

  Widget _buildDriverCard(BusEntity bus) {
    return NbCard(
      variant: NbCardVariant.standard,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: AppColors.surfaceElevated,
            radius: 22,
            child: const Icon(Icons.person, color: AppColors.textPrimary, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  bus.driverName ?? 'Assigned Driver',
                  style: AppTypography.titleMedium,
                ),
                Text(
                  'Driver • Bus ${bus.busNumber}',
                  style: AppTypography.bodySmall,
                ),
              ],
            ),
          ),
          NbButton(
            label: 'Call Driver',
            onPressed: () {
              // Action prompt
            },
            variant: NbButtonVariant.secondary,
            isFullWidth: false,
            height: 38,
            icon: const Icon(Icons.phone_outlined, size: 16),
          ),
        ],
      ),
    );
  }
}
