import 'package:flutter/material.dart';

/// Responsive helper utilities ensuring layout stability across
/// small (<360px), standard (360-420px), and large/tablet (>420px) screens.
extension ResponsiveContext on BuildContext {
  double get screenWidth => MediaQuery.sizeOf(this).width;
  double get screenHeight => MediaQuery.sizeOf(this).height;
  EdgeInsets get padding => MediaQuery.paddingOf(this);
  EdgeInsets get viewInsets => MediaQuery.viewInsetsOf(this);
  Orientation get orientation => MediaQuery.orientationOf(this);

  bool get isSmallPhone => screenWidth < 360;
  bool get isNormalPhone => screenWidth >= 360 && screenWidth < 430;
  bool get isLargePhoneOrTablet => screenWidth >= 430;
  bool get isLandscape => orientation == Orientation.landscape;

  /// Dynamic scale factor clamped to prevent extreme scaling issues
  double get textScaleFactor => MediaQuery.textScalerOf(this).scale(1.0).clamp(0.85, 1.25);

  /// Safe horizontal padding for content containers
  double get horizontalPadding {
    if (isSmallPhone) return 12.0;
    if (isLargePhoneOrTablet) return 24.0;
    return 16.0;
  }

  /// Safe card spacing
  double get cardGap {
    if (isSmallPhone) return 10.0;
    return 16.0;
  }
}

/// A responsive constraint wrapper that limits maximum width on wide displays (tablets/foldables)
class ResponsiveMaxConstraint extends StatelessWidget {
  final Widget child;
  final double maxWidth;

  const ResponsiveMaxConstraint({
    super.key,
    required this.child,
    this.maxWidth = 500,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: child,
      ),
    );
  }
}
