import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/responsive.dart';
import '../../controllers/driver_auth_controller.dart';
import '../../controllers/driver_trip_controller.dart';
import '../widgets/driver_button.dart';
import '../widgets/driver_card.dart';
import 'driver_home_screen.dart';

class DriverLoginScreen extends StatefulWidget {
  final DriverAuthController authController;
  final DriverTripController tripController;

  const DriverLoginScreen({
    super.key,
    required this.authController,
    required this.tripController,
  });

  @override
  State<DriverLoginScreen> createState() => _DriverLoginScreenState();
}

class _DriverLoginScreenState extends State<DriverLoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _fillDemoCredentials() {
    _emailController.text = AppConstants.demoEmail;
    _passwordController.text = AppConstants.demoPassword;
    widget.authController.clearError();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await widget.authController.login(
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    if (success && mounted) {
      await widget.tripController.loadAssignedTrip();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => DriverHomeScreen(
            authController: widget.authController,
            tripController: widget.tripController,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final horizontalPadding = Responsive.contentHorizontalPadding(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: ListenableBuilder(
          listenable: widget.authController,
          builder: (context, _) {
            final isLoading = widget.authController.isLoading;
            final errorMessage = widget.authController.errorMessage;

            return Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header
                      Center(
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceRaised,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppColors.primarySubtle, width: 2),
                          ),
                          child: const Icon(
                            Icons.directions_bus_rounded,
                            size: 40,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Driver Portal',
                        style: AppTypography.headlineLarge,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Sign in to access your assigned bus & trip GPS',
                        style: AppTypography.bodySmall,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 28),

                      // Demo Quick Fill Banner
                      DriverCard(
                        backgroundColor: AppColors.primarySubtle,
                        borderColor: AppColors.primary.withValues(alpha: 0.3),
                        onTap: _fillDemoCredentials,
                        child: Row(
                          children: [
                            const Icon(Icons.touch_app_outlined, color: AppColors.primary, size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Quick Demo Login',
                                    style: AppTypography.captionBold.copyWith(color: AppColors.primary),
                                  ),
                                  Text(
                                    'Tap to fill demo credentials (Ramesh Kumar • NB-01)',
                                    style: AppTypography.driverStatus.copyWith(
                                      color: AppColors.textSecondary,
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Error message if any
                      if (errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.crimsonSubtle,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.danger.withValues(alpha: 0.4)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline, color: AppColors.danger, size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  errorMessage,
                                  style: AppTypography.bodySmall.copyWith(color: AppColors.danger),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Email Field
                      Text('Driver Email / ID', style: AppTypography.captionBold),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        style: AppTypography.bodyLarge,
                        decoration: const InputDecoration(
                          hintText: 'e.g. ramesh.driver@nammabus.ai',
                          prefixIcon: Icon(Icons.badge_outlined, color: AppColors.textTertiary),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Please enter your driver email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Password Field
                      Text('PIN / Password', style: AppTypography.captionBold),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        style: AppTypography.bodyLarge,
                        decoration: InputDecoration(
                          hintText: 'Enter password',
                          prefixIcon: const Icon(Icons.lock_outline, color: AppColors.textTertiary),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off : Icons.visibility,
                              color: AppColors.textTertiary,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter your password';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 28),

                      // Submit Button
                      DriverButton(
                        label: 'SIGN IN & ACCESS BUS',
                        icon: Icons.login_rounded,
                        isLoading: isLoading,
                        onPressed: _handleLogin,
                        variant: DriverButtonVariant.primary,
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
