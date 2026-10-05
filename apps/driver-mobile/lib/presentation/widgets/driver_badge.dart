import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../data/models/trip_model.dart';
import '../../data/repositories/location_service.dart';

class TripStatusBadge extends StatelessWidget {
  final DriverTripStatus status;

  const TripStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (bgColor, fgColor, icon) = switch (status) {
      DriverTripStatus.notStarted => (AppColors.surfaceRaised, AppColors.textSecondary, Icons.schedule),
      DriverTripStatus.starting => (AppColors.primarySubtle, AppColors.primary, Icons.sync),
      DriverTripStatus.active => (AppColors.emeraldSubtle, AppColors.gpsActive, Icons.directions_bus),
      DriverTripStatus.ending => (AppColors.amberSubtle, AppColors.warning, Icons.timelapse),
      DriverTripStatus.completed => (AppColors.surfaceRaised, AppColors.textTertiary, Icons.check_circle_outline),
      DriverTripStatus.cancelled => (AppColors.crimsonSubtle, AppColors.danger, Icons.cancel_outlined),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: fgColor.withValues(alpha: 0.3), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: fgColor),
          const SizedBox(width: 6),
          Text(
            status.label,
            style: AppTypography.driverStatus.copyWith(color: fgColor),
          ),
        ],
      ),
    );
  }
}

class GpsStatusBadge extends StatelessWidget {
  final LocationTrackingStatus status;

  const GpsStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (bgColor, fgColor, icon) = switch (status) {
      LocationTrackingStatus.tracking => (AppColors.emeraldSubtle, AppColors.gpsActive, Icons.gps_fixed),
      LocationTrackingStatus.ready => (AppColors.primarySubtle, AppColors.primary, Icons.gps_not_fixed),
      LocationTrackingStatus.requestingPermission => (AppColors.amberSubtle, AppColors.warning, Icons.security),
      LocationTrackingStatus.stale => (AppColors.amberSubtle, AppColors.warning, Icons.signal_cellular_connected_no_internet_4_bar),
      LocationTrackingStatus.permissionDenied => (AppColors.crimsonSubtle, AppColors.gpsDenied, Icons.location_off),
      LocationTrackingStatus.gpsDisabled => (AppColors.crimsonSubtle, AppColors.gpsDisabled, Icons.gps_off),
      LocationTrackingStatus.error => (AppColors.crimsonSubtle, AppColors.danger, Icons.error_outline),
      LocationTrackingStatus.unknown => (AppColors.surfaceRaised, AppColors.textTertiary, Icons.help_outline),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: fgColor.withValues(alpha: 0.4), width: 1.2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: fgColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Icon(icon, size: 16, color: fgColor),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              status.displayLabel,
              style: AppTypography.driverStatus.copyWith(
                color: fgColor,
                fontWeight: FontWeight.w700,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
