import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/tracking_model.dart';
import 'nb_card.dart';

class NbEtaTicker extends StatelessWidget {
  final StopEtaDto? stopEta;
  final String stopName;
  final bool isGpsStale;
  final bool isInactive;

  const NbEtaTicker({
    super.key,
    required this.stopEta,
    required this.stopName,
    this.isGpsStale = false,
    this.isInactive = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isInactive) {
      return NbCard(
        variant: NbCardVariant.standard,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.schedule, color: AppColors.textMuted, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Service Inactive', style: AppTypography.titleMedium),
                  const SizedBox(height: 2),
                  Text(
                    'No active trip in progress for $stopName',
                    style: AppTypography.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final int minutes = stopEta?.estimatedMinutes ?? 0;
    final String etaText = Formatters.formatEtaMinutes(minutes);
    final String distText = Formatters.formatDistance(stopEta?.distanceRemainingMeters ?? 0);
    final String timeText = stopEta != null
        ? Formatters.formatClockTime(stopEta!.estimatedArrivalTime)
        : '--:--';

    final Color accentColor = minutes <= 3
        ? AppColors.warning
        : minutes <= 10
            ? AppColors.primary
            : AppColors.success;

    return NbCard(
      variant: NbCardVariant.elevated,
      borderColor: accentColor.withValues(alpha: 0.35),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: isGpsStale ? AppColors.warning : AppColors.success,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: (isGpsStale ? AppColors.warning : AppColors.success)
                              .withValues(alpha: 0.6),
                          blurRadius: 6,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isGpsStale ? 'STALE GPS (2M+)' : 'LIVE ARRIVAL ETA',
                    style: AppTypography.labelSmall.copyWith(
                      color: isGpsStale ? AppColors.warning : AppColors.primaryLight,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'AT $timeText',
                  style: AppTypography.labelSmall.copyWith(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Flexible(
                child: Text(
                  etaText.toUpperCase(),
                  style: AppTypography.etaTime.copyWith(color: AppColors.textPrimary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.location_on, color: AppColors.primaryLight, size: 16),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Arriving at $stopName • $distText away',
                  style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
