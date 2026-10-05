import 'package:flutter/material.dart';
import '../../controllers/transport_controller.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/responsive.dart';
import '../../data/models/bus_model.dart';
import '../widgets/nb_badge.dart';
import '../widgets/nb_button.dart';
import '../widgets/nb_card.dart';

class BusSelectionScreen extends StatefulWidget {
  final TransportController transportController;

  const BusSelectionScreen({
    super.key,
    required this.transportController,
  });

  @override
  State<BusSelectionScreen> createState() => _BusSelectionScreenState();
}

class _BusSelectionScreenState extends State<BusSelectionScreen> {
  late String _tempBusId;
  late String _tempRouteId;
  late String _tempStopId;

  @override
  void initState() {
    super.initState();
    _tempBusId = widget.transportController.selectedBusId ??
        widget.transportController.buses.firstOrNull?.id ??
        'bus-1';
    _tempRouteId = widget.transportController.selectedRouteId ??
        widget.transportController.routes.firstOrNull?.id ??
        'route-1';
    _tempStopId = widget.transportController.selectedStopId ??
        widget.transportController.stops.firstOrNull?.id ??
        'stop-3';
  }

  void _saveSelection() {
    widget.transportController.selectBus(_tempBusId);
    widget.transportController.selectRoute(_tempRouteId);
    widget.transportController.selectStop(_tempStopId);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.surfaceElevated,
        content: Text(
          'Updated to Bus ${widget.transportController.selectedBus?.busNumber} • ${widget.transportController.selectedStop?.name}',
          style: AppTypography.bodyMedium.copyWith(color: AppColors.textPrimary),
        ),
        duration: const Duration(seconds: 2),
      ),
    );

    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Select Bus & Route'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: ResponsiveMaxConstraint(
          child: ListenableBuilder(
            listenable: widget.transportController,
            builder: (context, _) {
              final buses = widget.transportController.buses;
              final routes = widget.transportController.routes;
              final stops = widget.transportController.stops;

              return Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: EdgeInsets.symmetric(
                        horizontal: context.horizontalPadding,
                        vertical: 16,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 1. Bus Selection
                          Text('1. Choose Assigned Bus', style: AppTypography.headlineMedium),
                          const SizedBox(height: 4),
                          Text('Select your college bus number', style: AppTypography.bodySmall),
                          const SizedBox(height: 12),
                          ...buses.map((bus) => _buildBusItem(bus)),
                          const SizedBox(height: 24),

                          // 2. Route Selection
                          Text('2. Choose Route', style: AppTypography.headlineMedium),
                          const SizedBox(height: 4),
                          Text('Route followed by college transport', style: AppTypography.bodySmall),
                          const SizedBox(height: 12),
                          ...routes.map((route) => _buildRouteItem(route)),
                          const SizedBox(height: 24),

                          // 3. Pickup/Drop Stop Selection
                          Text('3. Choose Boarding Stop', style: AppTypography.headlineMedium),
                          const SizedBox(height: 4),
                          Text('Your daily pickup and drop location', style: AppTypography.bodySmall),
                          const SizedBox(height: 12),
                          ...stops.map((stop) => _buildStopItem(stop)),
                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Save Action Bar
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: context.horizontalPadding,
                      vertical: 14,
                    ),
                    decoration: const BoxDecoration(
                      color: AppColors.surface,
                      border: Border(
                        top: BorderSide(color: AppColors.borderSubtle),
                      ),
                    ),
                    child: NbButton(
                      label: 'Save Transport Preferences',
                      onPressed: _saveSelection,
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildBusItem(BusEntity bus) {
    final isSelected = bus.id == _tempBusId;
    final status = bus.status;
    final badgeVariant = switch (status) {
      BusStatus.activeEnRoute => NbBadgeVariant.success,
      BusStatus.delayed => NbBadgeVariant.warning,
      _ => NbBadgeVariant.neutral,
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: NbCard(
        variant: isSelected ? NbCardVariant.highlight : NbCardVariant.standard,
        onTap: () {
          setState(() {
            _tempBusId = bus.id;
          });
        },
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? AppColors.primary : AppColors.textMuted,
                  width: 2,
                ),
                color: isSelected ? AppColors.primary : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        bus.busNumber,
                        style: AppTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        bus.registrationNumber,
                        style: AppTypography.bodySmall,
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Driver: ${bus.driverName ?? "College Staff"} • Capacity: ${bus.capacity}',
                    style: AppTypography.bodySmall,
                  ),
                ],
              ),
            ),
            NbBadge(
              label: status.label,
              variant: badgeVariant,
              showDot: true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRouteItem(dynamic route) {
    final isSelected = route.id == _tempRouteId;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: NbCard(
        variant: isSelected ? NbCardVariant.highlight : NbCardVariant.standard,
        onTap: () {
          setState(() {
            _tempRouteId = route.id;
          });
        },
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? AppColors.primary : AppColors.textMuted,
                  width: 2,
                ),
                color: isSelected ? AppColors.primary : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    route.name,
                    style: AppTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${route.code} • ${route.description ?? ""}',
                    style: AppTypography.bodySmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStopItem(dynamic stop) {
    final isSelected = stop.id == _tempStopId;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: NbCard(
        variant: isSelected ? NbCardVariant.highlight : NbCardVariant.standard,
        onTap: () {
          setState(() {
            _tempStopId = stop.id;
          });
        },
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? AppColors.primary : AppColors.textMuted,
                  width: 2,
                ),
                color: isSelected ? AppColors.primary : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    stop.name,
                    style: AppTypography.titleMedium.copyWith(
                      fontWeight: FontWeight.w700,
                      color: isSelected ? AppColors.warning : AppColors.textPrimary,
                    ),
                  ),
                  if (stop.landmark != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      stop.landmark!,
                      style: AppTypography.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
            if (isSelected)
              const Icon(Icons.star, color: AppColors.warning, size: 18),
          ],
        ),
      ),
    );
  }
}
