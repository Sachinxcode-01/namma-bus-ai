import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/stop_model.dart';
import '../../data/models/tracking_model.dart';
import 'nb_badge.dart';

class NbStopTimeline extends StatelessWidget {
  final List<StopEntity> stops;
  final String? selectedStopId;
  final TripEtaResponse? etaData;
  final void Function(String stopId)? onStopSelected;

  const NbStopTimeline({
    super.key,
    required this.stops,
    this.selectedStopId,
    this.etaData,
    this.onStopSelected,
  });

  @override
  Widget build(BuildContext context) {
    if (stops.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: List.generate(stops.length, (index) {
        final stop = stops[index];
        final isSelected = stop.id == selectedStopId;
        final isLast = index == stops.length - 1;

        final stopEta = etaData?.getStopEta(stop.id);
        final status = stopEta?.status ??
            (index == 0
                ? StopEtaStatus.passed
                : index == 1
                    ? StopEtaStatus.approaching
                    : index == 2
                        ? StopEtaStatus.next
                        : StopEtaStatus.upcoming);

        return InkWell(
          onTap: onStopSelected != null ? () => onStopSelected!(stop.id) : null,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Timeline Indicator Column
                SizedBox(
                  width: 32,
                  child: Column(
                    children: [
                      _buildIndicatorDot(status, isSelected),
                      if (!isLast)
                        Container(
                          width: 2,
                          height: 38,
                          color: status == StopEtaStatus.passed
                              ? AppColors.success.withValues(alpha: 0.5)
                              : AppColors.borderSubtle,
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),

                // Stop Name, Landmark, and ETA info
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.warning.withValues(alpha: 0.08)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      border: isSelected
                          ? Border.all(color: AppColors.warning.withValues(alpha: 0.3))
                          : null,
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      stop.name,
                                      style: AppTypography.titleMedium.copyWith(
                                        color: isSelected
                                            ? AppColors.warning
                                            : status == StopEtaStatus.passed
                                                ? AppColors.textMuted
                                                : AppColors.textPrimary,
                                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  if (isSelected) ...[
                                    const SizedBox(width: 6),
                                    const Icon(Icons.star, color: AppColors.warning, size: 14),
                                  ],
                                ],
                              ),
                              if (stop.landmark != null) ...[
                                const SizedBox(height: 2),
                                Text(
                                  stop.landmark!,
                                  style: AppTypography.bodySmall.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),

                        // Status Badge / ETA
                        _buildStatusBadge(status, stopEta),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _buildIndicatorDot(StopEtaStatus status, bool isSelected) {
    if (isSelected) {
      return Container(
        width: 18,
        height: 18,
        decoration: BoxDecoration(
          color: AppColors.warningContainer,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.warning, width: 2),
        ),
        child: const Center(
          child: Icon(Icons.star, color: AppColors.warning, size: 10),
        ),
      );
    }

    switch (status) {
      case StopEtaStatus.passed:
        return Container(
          width: 16,
          height: 16,
          decoration: const BoxDecoration(
            color: AppColors.surfaceElevated,
            shape: BoxShape.circle,
          ),
          child: const Center(
            child: Icon(Icons.check, color: AppColors.success, size: 11),
          ),
        );
      case StopEtaStatus.approaching:
        return Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            color: AppColors.warningContainer,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.warning, width: 2),
          ),
          child: Center(
            child: Container(
              width: 6,
              height: 6,
              decoration: const BoxDecoration(
                color: AppColors.warning,
                shape: BoxShape.circle,
              ),
            ),
          ),
        );
      case StopEtaStatus.next:
        return Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            color: AppColors.primaryContainer,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.primary, width: 2),
          ),
          child: Center(
            child: Container(
              width: 6,
              height: 6,
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
            ),
          ),
        );
      case StopEtaStatus.upcoming:
        return Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: AppColors.surfaceCard,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.borderSubtle, width: 2),
          ),
        );
    }
  }

  Widget _buildStatusBadge(StopEtaStatus status, StopEtaDto? eta) {
    switch (status) {
      case StopEtaStatus.passed:
        return const NbBadge(
          label: 'Passed',
          variant: NbBadgeVariant.neutral,
        );
      case StopEtaStatus.approaching:
        return const NbBadge(
          label: 'Approaching',
          variant: NbBadgeVariant.warning,
          showDot: true,
        );
      case StopEtaStatus.next:
        return NbBadge(
          label: eta != null ? Formatters.formatEtaMinutes(eta.estimatedMinutes) : 'Next Stop',
          variant: NbBadgeVariant.primary,
          showDot: true,
        );
      case StopEtaStatus.upcoming:
        if (eta != null && eta.estimatedMinutes > 0) {
          return Text(
            Formatters.formatEtaMinutes(eta.estimatedMinutes),
            style: AppTypography.labelSmall.copyWith(color: AppColors.textSecondary),
          );
        }
        return const SizedBox.shrink();
    }
  }
}
