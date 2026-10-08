import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/responsive.dart';
import '../../controllers/driver_auth_controller.dart';
import '../widgets/driver_button.dart';
import '../widgets/driver_card.dart';

class DriverProfileScreen extends StatelessWidget {
  final DriverAuthController authController;
  final VoidCallback onLogout;

  const DriverProfileScreen({
    super.key,
    required this.authController,
    required this.onLogout,
  });

  Future<void> _handleLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Sign Out?', style: AppTypography.headlineMedium),
        content: Text(
          'Are you sure you want to log out from this vehicle console?',
          style: AppTypography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text('Cancel', style: AppTypography.bodyMedium.copyWith(color: AppColors.textTertiary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Sign Out', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      await authController.logout();
      onLogout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final horizontalPadding = Responsive.contentHorizontalPadding(context);
    final driver = authController.driver;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Driver Profile', style: AppTypography.headlineMedium),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Driver Card
              DriverCard(
                child: Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceRaised,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.primarySubtle, width: 2),
                      ),
                      child: const Icon(Icons.person, color: AppColors.primary, size: 32),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            driver?.name ?? 'Ramesh Kumar',
                            style: AppTypography.headlineMedium,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            driver?.email ?? AppConstants.demoEmail,
                            style: AppTypography.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Vehicle Assignment
              DriverCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('ASSIGNED VEHICLE', style: AppTypography.captionBold),
                    const SizedBox(height: 12),
                    _buildInfoRow('Bus Number', driver?.assignedBusNumber ?? 'NB-01'),
                    const Divider(color: AppColors.borderSubtle, height: 20),
                    _buildInfoRow('License Plate', driver?.assignedBusPlate ?? 'KA-04-MB-1024'),
                    const Divider(color: AppColors.borderSubtle, height: 20),
                    _buildInfoRow('Driving License', driver?.licenseNumber ?? 'KA-04-2015-008912'),
                    const Divider(color: AppColors.borderSubtle, height: 20),
                    _buildInfoRow('Contact Phone', driver?.phone ?? '+91 98450 12345'),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // System Details
              DriverCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('SYSTEM STATUS', style: AppTypography.captionBold),
                    const SizedBox(height: 12),
                    _buildInfoRow('App Version', 'v${AppConstants.appVersion} (Production)'),
                    const Divider(color: AppColors.borderSubtle, height: 20),
                    _buildInfoRow('Telemetry Interval', '2.5 seconds'),
                    const Divider(color: AppColors.borderSubtle, height: 20),
                    _buildInfoRow('GPS Engine', 'NammaBus GeoStream V1'),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Sign Out Button
              DriverButton(
                label: 'LOG OUT OF DRIVER CONSOLE',
                icon: Icons.logout_rounded,
                variant: DriverButtonVariant.secondary,
                onPressed: () => _handleLogout(context),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary)),
        Text(value, style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
      ],
    );
  }
}
