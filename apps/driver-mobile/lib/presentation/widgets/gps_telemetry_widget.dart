import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/location_telemetry_model.dart';
import 'driver_card.dart';

class GpsTelemetryWidget extends StatelessWidget {
  final ValueNotifier<LocationTelemetryModel?> telemetryNotifier;
  final bool isTracking;

  const GpsTelemetryWidget({
    super.key,
    required this.telemetryNotifier,
    required this.isTracking,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<LocationTelemetryModel?>(
      valueListenable: telemetryNotifier,
      builder: (context, telemetry, _) {
        final speed = telemetry?.speedKmh ?? 0.0;
        final accuracy = telemetry?.accuracyMeters;
        final lat = telemetry?.latitude ?? 0.0;
        final lng = telemetry?.longitude ?? 0.0;
        final timestamp = telemetry?.timestamp;

        return DriverCard(
          backgroundColor: isTracking
              ? AppColors.surface
              : AppColors.surface.withValues(alpha: 0.6),
          borderColor: isTracking
              ? AppColors.gpsActive.withValues(alpha: 0.3)
              : AppColors.borderSubtle,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.speed_rounded,
                        size: 20,
                        color: isTracking ? AppColors.gpsActive : AppColors.textTertiary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'LIVE TELEMETRY',
                        style: AppTypography.captionBold.copyWith(
                          color: isTracking ? AppColors.textSecondary : AppColors.textTertiary,
                          letterSpacing: 1.0,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceRaised,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'Accuracy: ${AppFormatters.formatAccuracy(accuracy)}',
                      style: AppTypography.driverStatus.copyWith(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    speed.toStringAsFixed(1),
                    style: AppTypography.telemetryValue.copyWith(
                      color: isTracking ? Colors.white : AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'km/h',
                    style: AppTypography.bodyMedium.copyWith(
                      color: isTracking ? AppColors.gpsActive : AppColors.textTertiary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'COORDINATES',
                        style: AppTypography.driverStatus.copyWith(
                          fontSize: 10,
                          color: AppColors.textTertiary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        AppFormatters.formatCoordinates(lat, lng),
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                          fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Updated: ${AppFormatters.formatTimestamp(timestamp)}',
                        style: AppTypography.driverStatus.copyWith(
                          fontSize: 10,
                          color: isTracking ? AppColors.gpsActive : AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
