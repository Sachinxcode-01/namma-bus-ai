import 'package:flutter/material.dart';

/// Central high-contrast color palette optimized for Driver Safety UX
abstract final class AppColors {
  // Cabin Dark Backgrounds (High legibility, low eye fatigue)
  static const Color background = Color(0xFF090D16);
  static const Color surface = Color(0xFF0F172A);
  static const Color surfaceCard = Color(0xFF1E293B);
  static const Color surfaceElevated = Color(0xFF27354F);
  static const Color surfaceRaised = Color(0xFF27354F); // Alias

  // Borders
  static const Color borderSubtle = Color(0xFF334155);
  static const Color borderHighContrast = Color(0xFF475569);

  // Primary Brand & Action Colors
  static const Color primary = Color(0xFF2563EB); // Electric Cobalt
  static const Color primaryLight = Color(0xFF60A5FA);
  static const Color primaryContainer = Color(0x2E3B82F6);
  static const Color primarySubtle = Color(0x2E3B82F6); // Alias

  // Live GPS Tracking & Trip Active Status
  static const Color gpsActive = Color(0xFF10B981); // Bright Emerald
  static const Color gpsActiveGlow = Color(0x4010B981);
  static const Color gpsInactive = Color(0xFF64748B);
  static const Color gpsWarning = Color(0xFFF59E0B);
  static const Color gpsError = Color(0xFFEF4444);
  static const Color gpsDenied = Color(0xFFEF4444);
  static const Color gpsDisabled = Color(0xFFF97316);

  // Subtles / Container tints
  static const Color emeraldSubtle = Color(0x2E10B981);
  static const Color amberSubtle = Color(0x2EF59E0B);
  static const Color crimsonSubtle = Color(0x2EEF4444);

  // Action Buttons
  static const Color startTripGreen = Color(0xFF059669);
  static const Color actionStart = Color(0xFF059669); // Alias
  static const Color endTripRed = Color(0xFFDC2626);
  static const Color actionEnd = Color(0xFFDC2626); // Alias
  static const Color incidentAmber = Color(0xFFD97706);
  static const Color warning = Color(0xFFF59E0B); // Alias
  static const Color danger = Color(0xFFEF4444); // Alias
  static const Color sosCritical = Color(0xFFB91C1C);
  static const Color sosRed = Color(0xFFDC2626); // Alias

  // High-Legibility Typography
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFFCBD5E1);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textTertiary = Color(0xFF94A3B8); // Alias
  static const Color textDisabled = Color(0xFF64748B);
}
