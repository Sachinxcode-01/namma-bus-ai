import 'package:flutter/material.dart';
import '../../controllers/tracking_controller.dart';
import '../../controllers/transport_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/responsive.dart';
import '../../data/models/bus_model.dart';
import '../widgets/nb_badge.dart';
import '../widgets/nb_card.dart';
import '../widgets/nb_error_state.dart';
import '../widgets/nb_interactive_map.dart';
import '../widgets/nb_stop_timeline.dart';

class LiveTrackingScreen extends StatelessWidget {
  final TransportController transportController;
  final TrackingController trackingController;

  const LiveTrackingScreen({
    super.key,
    required this.transportController,
    required this.trackingController,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Live Bus Tracking'),
            Text(
              transportController.selectedRoute?.name ?? 'Campus Express',
              style: AppTypography.bodySmall,
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => trackingController.refreshNow(),
            tooltip: 'Refresh Telemetry',
          ),
        ],
      ),
      body: SafeArea(
        child: ResponsiveMaxConstraint(
          child: ListenableBuilder(
            listenable: Listenable.merge([transportController, trackingController]),
            builder: (context, _) {
              final bus = transportController.selectedBus;
              final stop = transportController.selectedStop;
              final liveLoc = trackingController.liveLocation;
              final etaData = trackingController.etaData;
              final isGpsStale = trackingController.isGpsStale;
              final isInitialLoading = trackingController.isInitialLoading;
              final errorMsg = trackingController.errorMessage;

              final isInactive = bus?.status == BusStatus.inactive ||
                  bus?.status == BusStatus.completed;

              // Error state if no connection and no cached location
              if (errorMsg != null && liveLoc == null) {
                return NbErrorState(
                  message: errorMsg,
                  onRetry: () => trackingController.refreshNow(),
                );
              }

              if (isInitialLoading && liveLoc == null) {
                return const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                      ),
                      SizedBox(height: 16),
                      Text('Connecting to Bus GPS telemetry...'),
                    ],
                  ),
                );
              }

              final stopEta = trackingController.getEtaForStop(stop?.id);

              return RefreshIndicator(
                color: AppColors.primary,
                backgroundColor: AppColors.surfaceCard,
                onRefresh: () => trackingController.refreshNow(),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: EdgeInsets.symmetric(
                    horizontal: context.horizontalPadding,
                    vertical: 14,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Floating Telemetry & Bus Status Bar
                      _buildTelemetryBar(bus, liveLoc, isGpsStale, isInactive),
                      const SizedBox(height: 12),

                      // Stale Location Warning Banner (if GPS > 2 min old)
                      if (isGpsStale && !isInactive) ...[
                        _buildStaleGpsBanner(liveLoc?.timestamp),
                        const SizedBox(height: 12),
                      ],

                      // Bus Inactive State Notice
                      if (isInactive) ...[
                        _buildInactiveNotice(),
                        const SizedBox(height: 12),
                      ],

                      // Interactive Vector Route Map Canvas
                      NbInteractiveMap(
                        height: 280,
                        stops: transportController.stops,
                        selectedStopId: transportController.selectedStopId,
                        liveLocation: liveLoc,
                        busNumber: bus?.busNumber ?? 'NB-01',
                        isGpsStale: isGpsStale,
                        isInactive: isInactive,
                        onCenterTap: () => trackingController.refreshNow(),
                      ),
                      const SizedBox(height: 16),

                      // Student Arrival Highlight Card
                      _buildArrivalBanner(stop?.name ?? 'Your Stop', stopEta, isInactive),
                      const SizedBox(height: 20),

                      // Complete Stop Progression Timeline
                      Text('Route Sequence & ETAs', style: AppTypography.headlineMedium),
                      const SizedBox(height: 4),
                      Text(
                        'Live progression towards college campus',
                        style: AppTypography.bodySmall,
                      ),
                      const SizedBox(height: 12),

                      NbCard(
                        variant: NbCardVariant.standard,
                        child: NbStopTimeline(
                          stops: transportController.stops,
                          selectedStopId: transportController.selectedStopId,
                          etaData: etaData,
                          onStopSelected: (stopId) {
                            transportController.selectStop(stopId);
                          },
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildTelemetryBar(
    BusEntity? bus,
    dynamic liveLoc,
    bool isGpsStale,
    bool isInactive,
  ) {
    final status = bus?.status ?? BusStatus.activeEnRoute;
    final updatedText = liveLoc != null
        ? Formatters.formatTimeAgo(liveLoc.timestamp)
        : 'telemetry pending';

    return NbCard(
      variant: NbCardVariant.standard,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  bus?.busNumber ?? 'NB-01',
                  style: AppTypography.labelLarge.copyWith(
                    color: AppColors.primaryLight,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              NbBadge(
                label: status.label,
                variant: status == BusStatus.activeEnRoute
                    ? NbBadgeVariant.success
                    : status == BusStatus.delayed
                        ? NbBadgeVariant.warning
                        : NbBadgeVariant.neutral,
                showDot: true,
              ),
            ],
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'Speed: ${liveLoc?.speed.toStringAsFixed(0) ?? "0"} km/h',
                style: AppTypography.labelMedium.copyWith(color: AppColors.textPrimary),
              ),
              Text(
                'GPS: $updatedText',
                style: AppTypography.bodySmall.copyWith(
                  color: isGpsStale ? AppColors.warning : AppColors.textMuted,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStaleGpsBanner(DateTime? lastSeen) {
    final timeStr = lastSeen != null ? Formatters.formatTimeAgo(lastSeen) : '2+ mins';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.warningContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.signal_cellular_connected_no_internet_0_bar,
              color: AppColors.warning, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Driver GPS signal delayed ($timeStr). Showing last reported telemetry.',
              style: AppTypography.bodySmall.copyWith(
                color: AppColors.warning,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInactiveNotice() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, color: AppColors.textMuted, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Trip has not started or has concluded. Live coordinates will stream when driver starts the run.',
              style: AppTypography.bodySmall,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildArrivalBanner(String stopName, dynamic stopEta, bool isInactive) {
    if (isInactive) {
      return const SizedBox.shrink();
    }

    final int minutes = stopEta?.estimatedMinutes ?? 0;
    final String dist = Formatters.formatDistance(stopEta?.distanceRemainingMeters ?? 0);
    final String time = stopEta != null
        ? Formatters.formatClockTime(stopEta.estimatedArrivalTime)
        : '--:--';

    return NbCard(
      variant: NbCardVariant.elevated,
      borderColor: AppColors.primary.withValues(alpha: 0.4),
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.star, color: AppColors.warning, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      'YOUR BOARDING STOP',
                      style: AppTypography.labelSmall.copyWith(
                        color: AppColors.warning,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(stopName, style: AppTypography.headlineMedium),
                const SizedBox(height: 2),
                Text(
                  'Expected at $time • $dist remaining',
                  style: AppTypography.bodySmall,
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
            ),
            child: Column(
              children: [
                Text(
                  minutes > 0 ? '$minutes' : 'NOW',
                  style: AppTypography.headlineLarge.copyWith(
                    color: AppColors.primaryLight,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  minutes > 0 ? 'MINS' : '',
                  style: AppTypography.labelSmall.copyWith(
                    color: AppColors.primaryLight,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
