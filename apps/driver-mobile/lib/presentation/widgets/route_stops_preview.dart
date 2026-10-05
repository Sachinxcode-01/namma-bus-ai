import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../data/models/bus_route_model.dart';
import 'driver_card.dart';

class RouteStopsPreview extends StatelessWidget {
  final List<RouteStopModel> stops;
  final int currentStopIndex;
  final ValueChanged<int>? onStopCompleted;
  final bool isTripActive;

  const RouteStopsPreview({
    super.key,
    required this.stops,
    required this.currentStopIndex,
    this.onStopCompleted,
    this.isTripActive = false,
  });

  @override
  Widget build(BuildContext context) {
    if (stops.isEmpty) {
      return const SizedBox.shrink();
    }

    return DriverCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'ROUTE STOPS (${stops.length})',
                style: AppTypography.captionBold.copyWith(
                  color: AppColors.textTertiary,
                  letterSpacing: 1.0,
                ),
              ),
              Text(
                'Next: Stop #${currentStopIndex + 1}',
                style: AppTypography.driverStatus.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: stops.length,
            separatorBuilder: (_, _) => const Divider(
              color: AppColors.borderSubtle,
              height: 16,
            ),
            itemBuilder: (context, index) {
              final stop = stops[index];
              final isCurrent = index == currentStopIndex && isTripActive;
              final isCompleted = stop.isCompleted || index < currentStopIndex;

              return Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isCompleted
                          ? AppColors.emeraldSubtle
                          : isCurrent
                              ? AppColors.primarySubtle
                              : AppColors.surfaceRaised,
                      border: Border.all(
                        color: isCompleted
                            ? AppColors.gpsActive
                            : isCurrent
                                ? AppColors.primary
                                : AppColors.borderSubtle,
                        width: 1.5,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: isCompleted
                        ? const Icon(Icons.check, size: 16, color: AppColors.gpsActive)
                        : Text(
                            '${stop.sequence}',
                            style: AppTypography.driverStatus.copyWith(
                              color: isCurrent ? AppColors.primary : AppColors.textSecondary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stop.name,
                          style: AppTypography.bodyMedium.copyWith(
                            color: isCurrent
                                ? Colors.white
                                : isCompleted
                                    ? AppColors.textTertiary
                                    : AppColors.textPrimary,
                            fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (stop.scheduledTime != null)
                          Text(
                            stop.scheduledTime!,
                            style: AppTypography.driverStatus.copyWith(
                              color: isCurrent ? AppColors.primary : AppColors.textTertiary,
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (isTripActive && !isCompleted)
                    TextButton(
                      onPressed: onStopCompleted != null
                          ? () => onStopCompleted!(index)
                          : null,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        minimumSize: const Size(50, 30),
                        backgroundColor: AppColors.surfaceRaised,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: Text(
                        'Reached',
                        style: AppTypography.driverStatus.copyWith(
                          color: AppColors.textPrimary,
                          fontSize: 12,
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}
