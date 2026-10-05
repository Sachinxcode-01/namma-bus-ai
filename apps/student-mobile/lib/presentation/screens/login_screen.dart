import 'package:flutter/material.dart';
import '../../controllers/auth_controller.dart';
import '../../controllers/transport_controller.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/utils/responsive.dart';
import '../widgets/nb_button.dart';
import '../widgets/nb_card.dart';
import '../widgets/nb_text_field.dart';
import 'main_shell_screen.dart';

class LoginScreen extends StatefulWidget {
  final AuthController authController;
  final TransportController transportController;

  const LoginScreen({
    super.key,
    required this.authController,
    required this.transportController,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: AppConstants.demoEmail);
  final _passwordController = TextEditingController(text: AppConstants.demoPassword);

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final success = await widget.authController.login(
      email: _emailController.text,
      password: _passwordController.text,
    );

    if (success && mounted) {
      await widget.transportController.loadTransportData();
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => MainShellScreen(
              authController: widget.authController,
              transportController: widget.transportController,
            ),
          ),
        );
      }
    }
  }

  void _handleDemoLogin() {
    _emailController.text = AppConstants.demoEmail;
    _passwordController.text = AppConstants.demoPassword;
    _handleLogin();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: ResponsiveMaxConstraint(
          child: ListenableBuilder(
            listenable: widget.authController,
            builder: (context, _) {
              final isLoading = widget.authController.isLoading;
              final errorMsg = widget.authController.errorMessage;

              return Center(
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(
                    horizontal: context.horizontalPadding,
                    vertical: 24,
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // App Brand Header
                        Center(
                          child: Container(
                            width: 68,
                            height: 68,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF3B82F6), Color(0xFF6366F1)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withValues(alpha: 0.4),
                                  blurRadius: 18,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: const Center(
                              child: Text('🚌', style: TextStyle(fontSize: 34)),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        Center(
                          child: Text(
                            AppConstants.appName,
                            style: AppTypography.displayMedium.copyWith(
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),

                        Center(
                          child: Text(
                            'College Student Transport Portal',
                            style: AppTypography.bodyMedium.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Login Card
                        NbCard(
                          variant: NbCardVariant.elevated,
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'Student Sign In',
                                style: AppTypography.headlineMedium,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Enter your college email or USN to track your bus',
                                style: AppTypography.bodySmall,
                              ),
                              const SizedBox(height: 20),

                              // Error Banner
                              if (errorMsg != null) ...[
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppColors.errorContainer,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: AppColors.error.withValues(alpha: 0.3),
                                    ),
                                  ),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Icon(Icons.error_outline,
                                          color: AppColors.error, size: 18),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          errorMsg,
                                          style: AppTypography.bodySmall.copyWith(
                                            color: AppColors.error,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 16),
                              ],

                              // Email or USN Field
                              NbTextField(
                                label: 'College Email or USN',
                                hintText: 'e.g. 1MS21CS042 or student@college.edu',
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                                prefixIcon: const Icon(Icons.school_outlined,
                                    color: AppColors.textMuted, size: 20),
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) {
                                    return 'Please enter your email or USN';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),

                              // Password Field
                              NbTextField(
                                label: 'Password',
                                hintText: '••••••••',
                                controller: _passwordController,
                                isPassword: true,
                                prefixIcon: const Icon(Icons.lock_outline,
                                    color: AppColors.textMuted, size: 20),
                                validator: (val) {
                                  if (val == null || val.isEmpty) {
                                    return 'Please enter your password';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 24),

                              // Sign In Button
                              NbButton(
                                label: 'Sign In to Track Bus',
                                onPressed: _handleLogin,
                                isLoading: isLoading,
                                variant: NbButtonVariant.primary,
                              ),
                              const SizedBox(height: 16),

                              // Divider OR
                              Row(
                                children: [
                                  const Expanded(child: Divider()),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 12),
                                    child: Text(
                                      'QUICK ACCESS',
                                      style: AppTypography.labelSmall.copyWith(
                                        color: AppColors.textMuted,
                                        letterSpacing: 0.8,
                                      ),
                                    ),
                                  ),
                                  const Expanded(child: Divider()),
                                ],
                              ),
                              const SizedBox(height: 16),

                              // Demo Access Button
                              NbButton(
                                label: '⚡ One-Tap Demo Student Login',
                                onPressed: isLoading ? null : _handleDemoLogin,
                                variant: NbButtonVariant.secondary,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        Center(
                          child: Text(
                            'NammaBus AI • Version ${AppConstants.appVersion}',
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.textDisabled,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
