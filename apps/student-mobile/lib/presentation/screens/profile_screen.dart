import 'package:flutter/material.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/transport_controller.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/responsive.dart';
import '../widgets/nb_button.dart';
import '../widgets/nb_card.dart';
import 'bus_selection_screen.dart';
import 'login_screen.dart';

class ProfileScreen extends StatelessWidget {
  final AuthController authController;
  final TransportController transportController;

  const ProfileScreen({
    super.key,
    required this.authController,
    required this.transportController,
  });

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: AppColors.surfaceCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.borderSubtle),
        ),
        title: Text('Sign Out', style: AppTypography.headlineMedium),
        content: Text(
          'Are you sure you want to log out of your student account?',
          style: AppTypography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: Text(
              'Cancel',
              style: AppTypography.labelLarge.copyWith(color: AppColors.textMuted),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              await authController.logout();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(
                    builder: (_) => LoginScreen(
                      authController: authController,
                      transportController: transportController,
                    ),
                  ),
                  (route) => false,
                );
              }
            },
            child: const Text('Log Out'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = authController.user;
    final student = user?.student;
    final bus = transportController.selectedBus;
    final route = transportController.selectedRoute;
    final stop = transportController.selectedStop;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Student Profile & Settings'),
      ),
      body: SafeArea(
        child: ResponsiveMaxConstraint(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: context.horizontalPadding,
              vertical: 16,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Student Profile Card / Digital ID
                NbCard(
                  variant: NbCardVariant.elevated,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF3B82F6), Color(0xFF6366F1)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Center(
                              child: Text(
                                (student?.name.isNotEmpty ?? false)
                                    ? student!.name[0].toUpperCase()
                                    : 'S',
                                style: AppTypography.headlineLarge.copyWith(color: Colors.white),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  student?.name ?? 'Student Name',
                                  style: AppTypography.headlineMedium,
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  user?.email ?? AppConstants.demoEmail,
                                  style: AppTypography.bodySmall,
                                ),
                                const SizedBox(height: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryContainer,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    'USN: ${student?.usn ?? "1MS21CS042"}',
                                    style: AppTypography.labelSmall.copyWith(
                                      color: AppColors.primaryLight,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildIdItem('DEPARTMENT', student?.department ?? 'Computer Science'),
                          _buildIdItem('SEMESTER', student?.semester ?? '6th Semester'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Assigned Bus & Route Summary
                Text('College Transport Setup', style: AppTypography.headlineMedium),
                const SizedBox(height: 4),
                Text('Your daily registered route and boarding stop', style: AppTypography.bodySmall),
                const SizedBox(height: 10),

                NbCard(
                  variant: NbCardVariant.standard,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildSetupRow(
                        icon: Icons.directions_bus_outlined,
                        title: 'Assigned Bus',
                        value: '${bus?.busNumber ?? "NB-01"} (${bus?.registrationNumber ?? "KA-01-EQ-1024"})',
                      ),
                      const Divider(height: 20),
                      _buildSetupRow(
                        icon: Icons.alt_route_outlined,
                        title: 'Active Route',
                        value: route?.name ?? 'Greenfield Campus Express',
                      ),
                      const Divider(height: 20),
                      _buildSetupRow(
                        icon: Icons.location_on_outlined,
                        title: 'Boarding Stop',
                        value: stop?.name ?? 'Engineering Annex',
                        isHighlight: true,
                      ),
                      const SizedBox(height: 16),
                      NbButton(
                        label: 'Change Bus, Route or Stop',
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => BusSelectionScreen(
                                transportController: transportController,
                              ),
                            ),
                          );
                        },
                        variant: NbButtonVariant.outline,
                        height: 42,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Notification Preferences
                Text('Notification Preferences', style: AppTypography.headlineMedium),
                const SizedBox(height: 10),

                NbCard(
                  variant: NbCardVariant.standard,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    children: [
                      ListenableBuilder(
                        listenable: transportController,
                        builder: (context, _) {
                          return SwitchListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text('10-Minute Stop Alert', style: AppTypography.titleMedium),
                            subtitle: Text('Receive arrival reminder before bus reaches your stop',
                                style: AppTypography.bodySmall),
                            value: transportController.is10MinAlertEnabled,
                            activeThumbColor: AppColors.primary,
                            onChanged: (val) {
                              transportController.toggle10MinAlert(val);
                            },
                          );
                        },
                      ),
                      const Divider(),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text('Delay & Road Alerts', style: AppTypography.titleMedium),
                        subtitle: Text('Get notified of road blockages and route diversions',
                            style: AppTypography.bodySmall),
                        value: true,
                        activeThumbColor: AppColors.primary,
                        onChanged: (val) {},
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // System & Backend Status
                NbCard(
                  variant: NbCardVariant.standard,
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: const BoxDecoration(
                          color: AppColors.success,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Backend Telemetry: Online',
                              style: AppTypography.titleMedium,
                            ),
                            Text(
                              'API Version 1.0 • Connected to /api/v1',
                              style: AppTypography.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Logout Button
                NbButton(
                  label: 'Log Out of Account',
                  onPressed: () => _showLogoutDialog(context),
                  variant: NbButtonVariant.danger,
                  icon: const Icon(Icons.logout, size: 18),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildIdItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTypography.labelSmall),
        const SizedBox(height: 2),
        Text(value, style: AppTypography.bodyMedium.copyWith(color: AppColors.textPrimary)),
      ],
    );
  }

  Widget _buildSetupRow({
    required IconData icon,
    required String title,
    required String value,
    bool isHighlight = false,
  }) {
    return Row(
      children: [
        Icon(icon, color: isHighlight ? AppColors.warning : AppColors.primaryLight, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTypography.labelSmall),
              const SizedBox(height: 2),
              Text(
                value,
                style: AppTypography.titleMedium.copyWith(
                  color: isHighlight ? AppColors.warning : AppColors.textPrimary,
                  fontWeight: isHighlight ? FontWeight.w700 : FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
