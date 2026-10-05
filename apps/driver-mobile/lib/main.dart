import 'package:flutter/material.dart';
import 'core/constants/app_constants.dart';
import 'core/network/http_client.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/driver_auth_repository.dart';
import 'data/repositories/driver_trip_repository.dart';
import 'data/repositories/location_service.dart';
import 'controllers/driver_auth_controller.dart';
import 'controllers/driver_trip_controller.dart';
import 'controllers/location_tracking_controller.dart';
import 'presentation/screens/driver_splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Core Networking & Repositories
  final apiClient = ApiClient();
  final authRepository = DriverAuthRepository(client: apiClient);
  final tripRepository = DriverTripRepository(client: apiClient);
  final locationService = LocationTrackingService(client: apiClient);

  // Controllers
  final authController = DriverAuthController(authRepo: authRepository);
  final trackingController = LocationTrackingController(locationService: locationService);
  final tripController = DriverTripController(
    tripRepo: tripRepository,
    trackingController: trackingController,
  );

  runApp(NammaBusDriverApp(
    authController: authController,
    tripController: tripController,
  ));
}

class NammaBusDriverApp extends StatelessWidget {
  final DriverAuthController authController;
  final DriverTripController tripController;

  const NammaBusDriverApp({
    super.key,
    required this.authController,
    required this.tripController,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: DriverSplashScreen(
        authController: authController,
        tripController: tripController,
      ),
    );
  }
}
