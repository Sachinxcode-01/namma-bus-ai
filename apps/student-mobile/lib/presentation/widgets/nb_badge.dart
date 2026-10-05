import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';

enum NbBadgeVariant {
  success,
  warning,
  error,
  info,
  neutral,
  primary,
}

class NbBadge extends StatelessWidget {
  final String label;
  final NbBadgeVariant variant;
  final Widget? icon;
  final bool showDot;

  const NbBadge({
    super.key,
    required this.label,
    this.variant = NbBadgeVariant.neutral,
    this.icon,
    this.showDot = false,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    Color dotColor;

    switch (variant) {
      case NbBadgeVariant.success:
        bg = AppColors.successContainer;
        fg = AppColors.success;
        dotColor = AppColors.success;
        break;
      case NbBadgeVariant.warning:
        bg = AppColors.warningContainer;
        fg = AppColors.warning;
        dotColor = AppColors.warning;
        break;
      case NbBadgeVariant.error:
        bg = AppColors.errorContainer;
        fg = AppColors.error;
        dotColor = AppColors.error;
        break;
      case NbBadgeVariant.info:
        bg = AppColors.infoContainer;
        fg = AppColors.info;
        dotColor = AppColors.info;
        break;
      case NbBadgeVariant.primary:
        bg = AppColors.primaryContainer;
        fg = AppColors.primaryLight;
        dotColor = AppColors.primaryLight;
        break;
      case NbBadgeVariant.neutral:
        bg = AppColors.surfaceElevated;
        fg = AppColors.textSecondary;
        dotColor = AppColors.textMuted;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: fg.withValues(alpha: 0.3), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showDot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
          ] else if (icon != null) ...[
            icon!,
            const SizedBox(width: 4),
          ],
          Text(
            label.toUpperCase(),
            style: AppTypography.labelSmall.copyWith(
              color: fg,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }
}
