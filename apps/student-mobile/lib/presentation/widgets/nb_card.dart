import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

enum NbCardVariant { standard, elevated, glass, highlight }

class NbCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final NbCardVariant variant;
  final Color? borderColor;

  const NbCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16.0),
    this.onTap,
    this.variant = NbCardVariant.standard,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    Color bgColor = switch (variant) {
      NbCardVariant.standard => AppColors.surfaceCard,
      NbCardVariant.elevated => AppColors.surfaceElevated,
      NbCardVariant.glass => const Color(0xCC1E293B),
      NbCardVariant.highlight => const Color(0x1F3B82F6),
    };

    Color effectiveBorder = borderColor ??
        switch (variant) {
          NbCardVariant.highlight => AppColors.primaryLight.withValues(alpha: 0.4),
          _ => AppColors.borderSubtle,
        };

    Widget content = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: effectiveBorder, width: 1),
        boxShadow: variant == NbCardVariant.elevated
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.25),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                )
              ]
            : null,
      ),
      child: child,
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: content,
        ),
      );
    }

    return content;
  }
}
