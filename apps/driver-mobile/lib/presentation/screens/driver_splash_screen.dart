import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../controllers/driver_auth_controller.dart';
import '../../controllers/driver_trip_controller.dart';
import 'driver_home_screen.dart';
import 'driver_login_screen.dart';

class DriverSplashScreen extends StatefulWidget {
  final DriverAuthController authController;
  final DriverTripController tripController;

  const DriverSplashScreen({
    super.key,
    required this.authController,
    required this.tripController,
  });

  @override
  State<DriverSplashScreen> createState() => _DriverSplashScreenState();
}

class _DriverSplashScreenState extends State<DriverSplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkInitialState();
  }

  Future<void> _checkInitialState() async {
    await Future.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;

    if (widget.authController.isAuthenticated) {
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
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => DriverLoginScreen(
            authController: widget.authController,
            tripController: widget.tripController,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  color: AppColors.surfaceRaised,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.primarySubtle, width: 2),
                ),
                child: const Icon(
                  Icons.directions_bus_rounded,
                  size: 46,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                AppConstants.appName,
                style: AppTypography.headlineLarge,
              ),
              const SizedBox(height: 6),
              Text(
                AppConstants.appSubtitle,
                style: AppTypography.captionBold.copyWith(
                  color: AppColors.textSecondary,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 48),
              const SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
