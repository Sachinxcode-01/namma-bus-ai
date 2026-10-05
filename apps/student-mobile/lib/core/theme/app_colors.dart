import 'package:flutter/material.dart';

/// Central color palette for NammaBus AI Student Mobile App
abstract final class AppColors {
  // Deep Backgrounds (Dark Mode First - College Sleek)
  static const Color background = Color(0xFF0B1120);
  static const Color surface = Color(0xFF0F172A);
  static const Color surfaceCard = Color(0xFF1E293B);
  static const Color surfaceElevated = Color(0xFF26334D);
  static const Color surfaceOverlay = Color(0xCC0F172A);

  // Borders & Dividers
  static const Color borderSubtle = Color(0xFF334155);
  static const Color borderFocus = Color(0xFF3B82F6);
  static const Color divider = Color(0xFF1E293B);

  // Primary Brand Accents (Cobalt & Indigo)
  static const Color primary = Color(0xFF3B82F6);
  static const Color primaryLight = Color(0xFF60A5FA);
  static const Color primaryDark = Color(0xFF1D4ED8);
  static const Color primaryContainer = Color(0x1F3B82F6);

  // Secondary Accents
  static const Color secondary = Color(0xFF6366F1);
  static const Color secondaryLight = Color(0xFF818CF8);
  static const Color secondaryDark = Color(0xFF4338CA);

  // Status & Semantic Colors
  static const Color success = Color(0xFF10B981); // Active / On-Time / Next Stop
  static const Color successContainer = Color(0x1F10B981);

  static const Color warning = Color(0xFFF59E0B); // Delayed / Approaching
  static const Color warningContainer = Color(0x1FF59E0B);

  static const Color error = Color(0xFFEF4444); // Cancelled / Breakdown / Alert
  static const Color errorContainer = Color(0x1FEF4444);

  static const Color info = Color(0xFF06B6D4); // Cyan informational
  static const Color infoContainer = Color(0x1F06B6D4);

  // Bus State Badges
  static const Color busActive = Color(0xFF10B981);
  static const Color busDelayed = Color(0xFFF59E0B);
  static const Color busInactive = Color(0xFF64748B);
  static const Color busCancelled = Color(0xFFEF4444);

  // Text Hierarchy
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);
  static const Color textDisabled = Color(0xFF475569);

  // Map & Route Canvas Colors
  static const Color mapBackground = Color(0xFF0A0F1D);
  static const Color mapRouteLine = Color(0xFF3B82F6);
  static const Color mapRouteCovered = Color(0xFF10B981);
  static const Color mapStopInactive = Color(0xFF475569);
  static const Color mapStopActive = Color(0xFF10B981);
  static const Color mapStopSelected = Color(0xFFF59E0B);
  static const Color mapBusMarker = Color(0xFF3B82F6);
  static const Color mapRadarPulse = Color(0x403B82F6);
}
