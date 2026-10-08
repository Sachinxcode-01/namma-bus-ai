import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/responsive.dart';

enum DriverButtonVariant {
  primary, // Emerald for Start Trip
  danger,  // Crimson for End Trip / SOS
  warning, // Amber for Incident / Breakdown
  secondary, // Slate / Outline
}

class DriverButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final DriverButtonVariant variant;
  final bool isLoading;
  final double? height;

  const DriverButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.variant = DriverButtonVariant.primary,
    this.isLoading = false,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveHeight = height ?? Responsive.driverButtonHeight(context);

    final (bgColor, fgColor) = switch (variant) {
      DriverButtonVariant.primary => (AppColors.actionStart, Colors.white),
      DriverButtonVariant.danger => (AppColors.actionEnd, Colors.white),
      DriverButtonVariant.warning => (AppColors.warning, Colors.black),
      DriverButtonVariant.secondary => (AppColors.surfaceRaised, AppColors.textPrimary),
    };

    return SizedBox(
      height: effectiveHeight,
      width: double.infinity,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: bgColor,
          foregroundColor: fgColor,
          disabledBackgroundColor: AppColors.surfaceRaised.withValues(alpha: 0.5),
          disabledForegroundColor: AppColors.textTertiary,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: variant == DriverButtonVariant.secondary
                ? const BorderSide(color: AppColors.borderSubtle, width: 1.5)
                : BorderSide.none,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20),
        ),
        child: isLoading
            ? SizedBox(
                height: 24,
                width: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation<Color>(fgColor),
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 24, color: fgColor),
                    const SizedBox(width: 12),
                  ],
                  Flexible(
                    child: Text(
                      label,
                      style: AppTypography.driverButton.copyWith(color: fgColor),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
