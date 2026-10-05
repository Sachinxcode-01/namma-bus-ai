import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import 'nb_button.dart';

class NbErrorState extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback? onRetry;
  final String retryLabel;

  const NbErrorState({
    super.key,
    this.title = 'Unable to Load Telemetry',
    required this.message,
    this.onRetry,
    this.retryLabel = 'Retry Connection',
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.errorContainer,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
              ),
              child: const Icon(Icons.wifi_off_rounded, color: AppColors.error, size: 30),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: AppTypography.headlineMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: AppTypography.bodyMedium.copyWith(color: AppColors.textMuted),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 20),
              SizedBox(
                width: 180,
                child: NbButton(
                  label: retryLabel,
                  onPressed: onRetry,
                  variant: NbButtonVariant.secondary,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
