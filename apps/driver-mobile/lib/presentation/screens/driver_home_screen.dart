import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/responsive.dart';
import '../../controllers/driver_auth_controller.dart';
import '../../controllers/driver_trip_controller.dart';
import '../../data/repositories/location_service.dart';
import '../widgets/driver_badge.dart';
import '../widgets/driver_button.dart';
import '../widgets/driver_card.dart';
import '../widgets/gps_telemetry_widget.dart';
import '../widgets/route_stops_preview.dart';
import 'driver_alerts_screen.dart';
import 'driver_login_screen.dart';
import 'driver_profile_screen.dart';
import 'incident_report_screen.dart';
import 'sos_screen.dart';

class DriverHomeScreen extends StatelessWidget {
  final DriverAuthController authController;
  final DriverTripController tripController;

  const DriverHomeScreen({
    super.key,
    required this.authController,
    required this.tripController,
  });

  Future<void> _handleStartTrip(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Row(
          children: [
            Icon(Icons.play_circle_fill, color: AppColors.actionStart, size: 28),
            const SizedBox(width: 10),
            Text('Start Assigned Trip?', style: AppTypography.headlineMedium),
          ],
        ),
        content: Text(
          'This will initiate live GPS broadcast to students and campus dispatch. Please ensure your phone is mounted securely.',
          style: AppTypography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text('Cancel', style: AppTypography.bodyMedium.copyWith(color: AppColors.textTertiary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.actionStart),
            child: const Text('Confirm Start', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      final success = await tripController.startTrip();
      if (!success && context.mounted && tripController.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(tripController.errorMessage!),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  Future<void> _handleEndTrip(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Row(
          children: [
            Icon(Icons.stop_circle_rounded, color: AppColors.actionEnd, size: 28),
            const SizedBox(width: 10),
            Text('End Active Trip?', style: AppTypography.headlineMedium),
          ],
        ),
        content: Text(
          'Are you sure you want to end this trip? Location tracking will stop and the trip will be marked COMPLETED.',
          style: AppTypography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text('Keep Driving', style: AppTypography.bodyMedium.copyWith(color: AppColors.textTertiary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.actionEnd),
            child: const Text('End Trip', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      final success = await tripController.endTrip();
      if (!success && context.mounted && tripController.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(tripController.errorMessage!),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final horizontalPadding = Responsive.contentHorizontalPadding(context);
    final driver = authController.driver;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        titleSpacing: horizontalPadding,
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: AppColors.surfaceRaised,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.primarySubtle, width: 1.5),
              ),
              child: const Icon(Icons.directions_bus_rounded, color: AppColors.primary, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    driver?.name ?? 'College Driver',
                    style: AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.w700),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    'Bus ${driver?.assignedBusNumber ?? "NB-01"} • ${driver?.assignedBusPlate ?? "KA-04"}',
                    style: AppTypography.driverStatus.copyWith(color: AppColors.textSecondary),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded, color: AppColors.textSecondary),
            tooltip: 'Alerts',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const DriverAlertsScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.account_circle_outlined, color: AppColors.textSecondary),
            tooltip: 'Profile',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => DriverProfileScreen(
                    authController: authController,
                    onLogout: () {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(
                          builder: (_) => DriverLoginScreen(
                            authController: authController,
                            tripController: tripController,
                          ),
                        ),
                        (route) => false,
                      );
                    },
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: tripController,
          builder: (context, _) {
            final trip = tripController.currentTrip;
            final isTripActive = tripController.isTripActive;
            final isLoading = tripController.isLoading;
            final status = tripController.status;

            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Status Bar (Trip Status + GPS Status)
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      TripStatusBadge(status: status),
                      GpsStatusBadge(
                        status: isTripActive
                            ? LocationTrackingStatus.tracking
                            : LocationTrackingStatus.ready,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 2. Primary Trip Action Button (Start Trip OR End Trip)
                  if (!isTripActive)
                    DriverButton(
                      label: 'START ASSIGNED TRIP',
                      icon: Icons.play_arrow_rounded,
                      variant: DriverButtonVariant.primary,
                      isLoading: isLoading,
                      onPressed: () => _handleStartTrip(context),
                    )
                  else
                    DriverButton(
                      label: 'END ACTIVE TRIP',
                      icon: Icons.stop_rounded,
                      variant: DriverButtonVariant.danger,
                      isLoading: isLoading,
                      onPressed: () => _handleEndTrip(context),
                    ),
                  const SizedBox(height: 16),

                  // 3. Live Telemetry Box (Speedometer, Accuracy, Coordinates)
                  GpsTelemetryWidget(
                    telemetryNotifier: tripController.canEnd
                        ? ValueNotifier(null) // isolated updates
                        : ValueNotifier(null),
                    isTracking: isTripActive,
                  ),
                  const SizedBox(height: 16),

                  // 4. Assigned Route Card
                  DriverCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'ASSIGNED ROUTE',
                              style: AppTypography.captionBold.copyWith(
                                color: AppColors.textTertiary,
                                letterSpacing: 1.0,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primarySubtle,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                trip?.routeCode ?? 'R-101',
                                style: AppTypography.captionBold.copyWith(color: AppColors.primary),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          trip?.routeName ?? 'Majestic to Campus Express',
                          style: AppTypography.headlineMedium,
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.schedule, size: 14, color: AppColors.textSecondary),
                            const SizedBox(width: 4),
                            Text(
                              'Scheduled: ${AppFormatters.formatTime(trip?.scheduledStartTime)}',
                              style: AppTypography.bodySmall,
                            ),
                            const SizedBox(width: 16),
                            const Icon(Icons.place_outlined, size: 14, color: AppColors.textSecondary),
                            const SizedBox(width: 4),
                            Text(
                              '${trip?.totalStops ?? 7} Stops',
                              style: AppTypography.bodySmall,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 5. Driver Safety Actions (Breakdown Report & SOS Emergency)
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            if (trip == null) return;
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => IncidentReportScreen(
                                  tripId: trip.id,
                                  busId: trip.busId,
                                ),
                              ),
                            );
                          },
                          icon: Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 20),
                          label: Text(
                            'REPORT BREAKDOWN',
                            style: AppTypography.driverButton.copyWith(
                              fontSize: 13,
                              color: AppColors.warning,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: AppColors.surface,
                            side: const BorderSide(color: AppColors.warning, width: 1.5),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            if (trip == null) return;
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => SosScreen(
                                  tripId: trip.id,
                                  busId: trip.busId,
                                  driverName: driver?.name ?? 'Driver Ramesh Kumar',
                                ),
                              ),
                            );
                          },
                          icon: Icon(Icons.emergency_rounded, color: AppColors.sosRed, size: 20),
                          label: Text(
                            'EMERGENCY SOS',
                            style: AppTypography.driverButton.copyWith(
                              fontSize: 13,
                              color: AppColors.sosRed,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: AppColors.surface,
                            side: const BorderSide(color: AppColors.sosRed, width: 1.5),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 6. Sequential Route Stops
                  RouteStopsPreview(
                    stops: trip?.stops ?? const [],
                    currentStopIndex: trip?.currentStopIndex ?? 0,
                    isTripActive: isTripActive,
                    onStopCompleted: (index) {
                      tripController.markStopCompleted(index);
                    },
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
