import 'package:flutter/material.dart';
import '../../core/network/http_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/responsive.dart';
import '../../data/repositories/incident_repository.dart';
import '../../controllers/incident_controller.dart';
import '../widgets/driver_button.dart';
import '../widgets/driver_card.dart';

class SosScreen extends StatefulWidget {
  final String tripId;
  final String busId;
  final String driverName;
  final IncidentController? controller;

  const SosScreen({
    super.key,
    required this.tripId,
    required this.busId,
    required this.driverName,
    this.controller,
  });

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> {
  late final IncidentController _controller;
  bool _confirmedNotice = false;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ??
        IncidentController(
          incidentRepo: IncidentRepository(client: ApiClient()),
        );
  }

  Future<void> _handleTriggerSos() async {
    final success = await _controller.triggerEmergencySos(
      tripId: widget.tripId,
      busId: widget.busId,
      latitude: 12.9716,
      longitude: 77.5946,
      driverName: widget.driverName,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('EMERGENCY BROADCAST TRANSMITTED TO CAMPUS SECURITY'),
          backgroundColor: AppColors.sosRed,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final horizontalPadding = Responsive.contentHorizontalPadding(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Emergency SOS', style: AppTypography.headlineMedium),
      ),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: _controller,
          builder: (context, _) {
            final isSosActive = _controller.isSosActive;
            final isSubmitting = _controller.isSubmitting;
            final errorMessage = _controller.errorMessage;

            if (isSosActive) {
              return Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.crimsonSubtle,
                          border: Border.all(color: AppColors.sosRed, width: 3),
                        ),
                        child: const Icon(Icons.emergency_rounded, size: 56, color: AppColors.sosRed),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'EMERGENCY SOS ACTIVE',
                        style: AppTypography.headlineLarge.copyWith(color: AppColors.sosRed),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Dispatch and Campus Security have been alerted with your bus location, driver details, and passenger manifest.',
                        style: AppTypography.bodyMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 36),
                      DriverButton(
                        label: 'CANCEL / RESOLVE SOS',
                        icon: Icons.check_circle_outline,
                        variant: DriverButtonVariant.secondary,
                        onPressed: () {
                          _controller.resetSos();
                          Navigator.of(context).pop();
                        },
                      ),
                    ],
                  ),
                ),
              );
            }

            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Warning Banner
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.crimsonSubtle,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.sosRed.withValues(alpha: 0.5), width: 1.5),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_rounded, color: AppColors.sosRed, size: 32),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'CAMPUS DISPATCH EMERGENCY',
                                style: AppTypography.captionBold.copyWith(color: AppColors.sosRed),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Use ONLY in life-threatening, severe accident, or immediate security situations.',
                                style: AppTypography.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  if (errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.crimsonSubtle,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.danger),
                      ),
                      child: Text(errorMessage, style: AppTypography.bodySmall.copyWith(color: AppColors.danger)),
                    ),
                    const SizedBox(height: 16),
                  ],

                  DriverCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('BUS & DRIVER DETAILS', style: AppTypography.captionBold),
                        const SizedBox(height: 10),
                        Text('Bus ID: ${widget.busId}', style: AppTypography.bodyMedium),
                        const SizedBox(height: 4),
                        Text('Driver: ${widget.driverName}', style: AppTypography.bodyMedium),
                        const SizedBox(height: 4),
                        Text('Trip: ${widget.tripId}', style: AppTypography.bodyMedium),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Accidental Prevention Checkbox
                  InkWell(
                    onTap: () {
                      setState(() {
                        _confirmedNotice = !_confirmedNotice;
                      });
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Checkbox(
                            value: _confirmedNotice,
                            activeColor: AppColors.sosRed,
                            onChanged: (val) {
                              setState(() {
                                _confirmedNotice = val ?? false;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'I confirm this is an authentic emergency requiring immediate response.',
                              style: AppTypography.bodySmall,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Giant Red Emergency SOS Action
                  DriverButton(
                    label: 'TRIGGER EMERGENCY SOS',
                    icon: Icons.emergency_rounded,
                    variant: DriverButtonVariant.danger,
                    isLoading: isSubmitting,
                    onPressed: _confirmedNotice ? _handleTriggerSos : null,
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
