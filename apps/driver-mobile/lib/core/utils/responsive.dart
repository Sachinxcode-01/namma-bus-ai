import 'package:flutter/material.dart';

abstract final class Responsive {
  static bool isSmallScreen(BuildContext context) =>
      MediaQuery.sizeOf(context).width < 360;

  static bool isMediumScreen(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return width >= 360 && width < 600;
  }

  static bool isLargeScreen(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= 600;

  static double contentHorizontalPadding(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < 360) return 12.0;
    if (width < 600) return 16.0;
    return 24.0;
  }

  static double driverButtonHeight(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < 360) return 56.0;
    return 64.0;
  }
}
