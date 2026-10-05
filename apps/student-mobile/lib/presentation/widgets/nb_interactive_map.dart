import 'dart:math';
import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../data/models/stop_model.dart';
import '../../data/models/tracking_model.dart';

class NbInteractiveMap extends StatefulWidget {
  final List<StopEntity> stops;
  final String? selectedStopId;
  final LiveLocationEntity? liveLocation;
  final String busNumber;
  final bool isGpsStale;
  final bool isInactive;
  final double height;
  final VoidCallback? onCenterTap;

  const NbInteractiveMap({
    super.key,
    required this.stops,
    this.selectedStopId,
    this.liveLocation,
    required this.busNumber,
    this.isGpsStale = false,
    this.isInactive = false,
    this.height = 280,
    this.onCenterTap,
  });

  @override
  State<NbInteractiveMap> createState() => _NbInteractiveMapState();
}

class _NbInteractiveMapState extends State<NbInteractiveMap> with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: widget.height,
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.mapBackground,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.borderSubtle, width: 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Custom Canvas Map Painter
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              return CustomPaint(
                size: Size(double.infinity, widget.height),
                painter: _MapCanvasPainter(
                  stops: widget.stops,
                  selectedStopId: widget.selectedStopId,
                  liveLocation: widget.liveLocation,
                  busNumber: widget.busNumber,
                  pulseValue: _pulseController.value,
                  isInactive: widget.isInactive,
                  isGpsStale: widget.isGpsStale,
                ),
              );
            },
          ),

          // Top Info Banner: Live Speed & Updates
          Positioned(
            top: 12,
            left: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppColors.surfaceOverlay,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: widget.isInactive
                          ? AppColors.textMuted
                          : widget.isGpsStale
                              ? AppColors.warning
                              : AppColors.success,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    widget.isInactive
                        ? 'BUS INACTIVE'
                        : widget.isGpsStale
                            ? 'GPS DELAYED'
                            : 'LIVE: ${widget.liveLocation?.speed.toStringAsFixed(0) ?? '35'} KM/H',
                    style: AppTypography.labelSmall.copyWith(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Map Control Buttons (Center Bus, Refresh)
          Positioned(
            bottom: 12,
            right: 12,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Material(
                  color: AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(10),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: widget.onCenterTap,
                    child: const Padding(
                      padding: EdgeInsets.all(8.0),
                      child: Icon(Icons.my_location, color: AppColors.primaryLight, size: 20),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Selected Boarding Stop Badge
          if (widget.selectedStopId != null)
            Positioned(
              bottom: 12,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.surfaceOverlay,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.warning.withValues(alpha: 0.5)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.star, color: AppColors.warning, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      'YOUR BOARDING STOP',
                      style: AppTypography.labelSmall.copyWith(
                        color: AppColors.warning,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _MapCanvasPainter extends CustomPainter {
  final List<StopEntity> stops;
  final String? selectedStopId;
  final LiveLocationEntity? liveLocation;
  final String busNumber;
  final double pulseValue;
  final bool isInactive;
  final bool isGpsStale;

  _MapCanvasPainter({
    required this.stops,
    required this.selectedStopId,
    required this.liveLocation,
    required this.busNumber,
    required this.pulseValue,
    required this.isInactive,
    required this.isGpsStale,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Draw subtle grid lines simulating a modern digital city map
    final gridPaint = Paint()
      ..color = const Color(0xFF131B2E)
      ..strokeWidth = 1.0;

    for (double x = 0; x < w; x += 40) {
      canvas.drawLine(Offset(x, 0), Offset(x, h), gridPaint);
    }
    for (double y = 0; y < h; y += 40) {
      canvas.drawLine(Offset(0, y), Offset(w, y), gridPaint);
    }

    if (stops.isEmpty) return;

    // Compute route path coordinates projected along a smooth diagonal curve
    final routePoints = <Offset>[];
    final paddingX = 40.0;
    final paddingY = 45.0;
    final usableW = w - (paddingX * 2);
    final usableH = h - (paddingY * 2);

    for (int i = 0; i < stops.length; i++) {
      final t = stops.length > 1 ? i / (stops.length - 1) : 0.5;
      final px = paddingX + (t * usableW);
      // Gentle S-curve path
      final py = paddingY + (t * usableH) + (sin(t * pi) * 25);
      routePoints.add(Offset(px, py));
    }

    // Draw Route Polyline
    final path = Path();
    path.moveTo(routePoints.first.dx, routePoints.first.dy);
    for (int i = 1; i < routePoints.length; i++) {
      final prev = routePoints[i - 1];
      final curr = routePoints[i];
      final mid = Offset((prev.dx + curr.dx) / 2, (prev.dy + curr.dy) / 2);
      path.quadraticBezierTo(prev.dx, prev.dy, mid.dx, mid.dy);
    }
    path.lineTo(routePoints.last.dx, routePoints.last.dy);

    // Route Outer Glow
    final routeGlowPaint = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.25)
      ..strokeWidth = 10.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(path, routeGlowPaint);

    // Route Center Line
    final routePaint = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 4.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(path, routePaint);

    // Draw Stop Markers
    for (int i = 0; i < stops.length; i++) {
      final pt = routePoints[i];
      final stop = stops[i];
      final isSelected = stop.id == selectedStopId;

      // Stop Outer Ring
      final stopBgPaint = Paint()
        ..color = isSelected ? AppColors.warning : AppColors.surfaceElevated
        ..style = PaintingStyle.fill;
      canvas.drawCircle(pt, isSelected ? 8.0 : 6.0, stopBgPaint);

      // Stop Inner Dot
      final stopDotPaint = Paint()
        ..color = isSelected ? Colors.black : Colors.white
        ..style = PaintingStyle.fill;
      canvas.drawCircle(pt, isSelected ? 4.0 : 3.0, stopDotPaint);

      // Stop Label Text
      final textSpan = TextSpan(
        text: stop.name,
        style: TextStyle(
          color: isSelected ? AppColors.warning : AppColors.textSecondary,
          fontSize: isSelected ? 10 : 9,
          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        ),
      );
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      )..layout(maxWidth: 100);

      // Offset text slightly above or below
      final labelY = (i % 2 == 0) ? pt.dy - 22 : pt.dy + 10;
      textPainter.paint(canvas, Offset(pt.dx - (textPainter.width / 2), labelY));
    }

    // Draw Live Bus Marker if active
    if (!isInactive && routePoints.length >= 3) {
      // Place bus between Stop 2 and Stop 3
      final busPt = Offset(
        (routePoints[1].dx + routePoints[2].dx) / 2 + (sin(pulseValue * 2 * pi) * 3),
        (routePoints[1].dy + routePoints[2].dy) / 2,
      );

      // Pulsing Radar Effect around bus
      final radarRadius = 14.0 + (pulseValue * 18.0);
      final radarPaint = Paint()
        ..color = (isGpsStale ? AppColors.warning : AppColors.primary)
            .withValues(alpha: (1.0 - pulseValue).clamp(0.0, 0.6))
        ..style = PaintingStyle.fill;
      canvas.drawCircle(busPt, radarRadius, radarPaint);

      // Bus Pin Background Circle
      final busCirclePaint = Paint()
        ..color = isGpsStale ? AppColors.warning : AppColors.primary
        ..style = PaintingStyle.fill;
      canvas.drawCircle(busPt, 14.0, busCirclePaint);

      // White Inner Border
      final busBorderPaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.0;
      canvas.drawCircle(busPt, 14.0, busBorderPaint);

      // Draw Bus Icon text 🚌 or NB-01 Tag
      final busTagSpan = TextSpan(
        text: busNumber,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 8,
          fontWeight: FontWeight.w900,
        ),
      );
      final busTagPainter = TextPainter(
        text: busTagSpan,
        textDirection: TextDirection.ltr,
      )..layout();

      // Bus Badge Label
      final tagRect = RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(busPt.dx, busPt.dy - 22), width: 38, height: 16),
        const Radius.circular(4),
      );
      final tagPaint = Paint()..color = const Color(0xFF0F172A);
      canvas.drawRRect(tagRect, tagPaint);
      canvas.drawRRect(
        tagRect,
        Paint()
          ..color = isGpsStale ? AppColors.warning : AppColors.primary
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1,
      );
      busTagPainter.paint(
        canvas,
        Offset(busPt.dx - (busTagPainter.width / 2), busPt.dy - 22 - (busTagPainter.height / 2)),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _MapCanvasPainter oldDelegate) {
    return oldDelegate.pulseValue != pulseValue ||
        oldDelegate.selectedStopId != selectedStopId ||
        oldDelegate.isInactive != isInactive ||
        oldDelegate.isGpsStale != isGpsStale;
  }
}
