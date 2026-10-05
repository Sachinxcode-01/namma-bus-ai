import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import 'nb_button.dart';

class NbEmptyState extends StatelessWidget {
  final String iconEmoji;
  final String title;
  final String description;
  final String? actionLabel;
  final VoidCallback? onAction;

  const NbEmptyState({
    super.key,
    this.iconEmoji = '🚌',
    required this.title,
    required this.description,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Center(
                child: Text(iconEmoji, style: const TextStyle(fontSize: 32)),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: AppTypography.headlineMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              description,
              style: AppTypography.bodyMedium.copyWith(color: AppColors.textMuted),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 24),
              SizedBox(
                width: 200,
                child: NbButton(
                  label: actionLabel!,
                  onPressed: onAction,
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
