import 'package:flutter/material.dart';
import '../../core/network/http_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/responsive.dart';
import '../../data/models/incident_model.dart';
import '../../data/repositories/incident_repository.dart';
import '../../controllers/incident_controller.dart';
import '../widgets/driver_button.dart';
import '../widgets/driver_card.dart';

class IncidentReportScreen extends StatefulWidget {
  final String tripId;
  final String busId;
  final IncidentController? controller;

  const IncidentReportScreen({
    super.key,
    required this.tripId,
    required this.busId,
    this.controller,
  });

  @override
  State<IncidentReportScreen> createState() => _IncidentReportScreenState();
}

class _IncidentReportScreenState extends State<IncidentReportScreen> {
  late final IncidentController _controller;
  IncidentType _selectedType = IncidentType.breakdown;
  IncidentSeverity _selectedSeverity = IncidentSeverity.high;
  final _descriptionController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ??
        IncidentController(
          incidentRepo: IncidentRepository(client: ApiClient()),
        );
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final note = _descriptionController.text.trim();
    final description = note.isEmpty ? _selectedType.label : note;

    final success = await _controller.reportIncident(
      tripId: widget.tripId,
      busId: widget.busId,
      type: _selectedType,
      severity: _selectedSeverity,
      description: description,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Incident reported to campus dispatch center'),
          backgroundColor: AppColors.actionStart,
        ),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final horizontalPadding = Responsive.contentHorizontalPadding(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Report Incident / Breakdown', style: AppTypography.headlineMedium),
      ),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: _controller,
          builder: (context, _) {
            final isSubmitting = _controller.isSubmitting;
            final errorMessage = _controller.errorMessage;

            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.crimsonSubtle,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.danger.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        errorMessage,
                        style: AppTypography.bodySmall.copyWith(color: AppColors.danger),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  Text('SELECT INCIDENT TYPE', style: AppTypography.captionBold),
                  const SizedBox(height: 12),
                  ...IncidentType.values.map((type) {
                    final isSelected = type == _selectedType;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: DriverCard(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        backgroundColor: isSelected ? AppColors.surfaceRaised : AppColors.surface,
                        borderColor: isSelected ? AppColors.warning : AppColors.borderSubtle,
                        onTap: () {
                          setState(() {
                            _selectedType = type;
                          });
                        },
                        child: Row(
                          children: [
                            Icon(
                              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                              color: isSelected ? AppColors.warning : AppColors.textTertiary,
                              size: 20,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                type.label,
                                style: AppTypography.bodyMedium.copyWith(
                                  color: isSelected ? Colors.white : AppColors.textSecondary,
                                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 16),

                  Text('SEVERITY LEVEL', style: AppTypography.captionBold),
                  const SizedBox(height: 10),
                  Row(
                    children: IncidentSeverity.values.map((sev) {
                      final isSelected = sev == _selectedSeverity;
                      final chipColor = switch (sev) {
                        IncidentSeverity.low => AppColors.textSecondary,
                        IncidentSeverity.medium => AppColors.primary,
                        IncidentSeverity.high => AppColors.warning,
                        IncidentSeverity.critical => AppColors.danger,
                      };

                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: InkWell(
                            onTap: () => setState(() => _selectedSeverity = sev),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: isSelected ? chipColor.withValues(alpha: 0.2) : AppColors.surface,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSelected ? chipColor : AppColors.borderSubtle,
                                  width: isSelected ? 1.5 : 1.0,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                sev.label.split(' ').first,
                                style: AppTypography.driverStatus.copyWith(
                                  color: isSelected ? chipColor : AppColors.textTertiary,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),

                  Text('ADDITIONAL DETAILS (OPTIONAL)', style: AppTypography.captionBold),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _descriptionController,
                    maxLines: 3,
                    style: AppTypography.bodyMedium,
                    decoration: const InputDecoration(
                      hintText: 'e.g. Engine overheating near Silk Board junction',
                    ),
                  ),
                  const SizedBox(height: 28),

                  DriverButton(
                    label: 'SUBMIT INCIDENT REPORT',
                    icon: Icons.send_rounded,
                    variant: DriverButtonVariant.warning,
                    isLoading: isSubmitting,
                    onPressed: _handleSubmit,
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
