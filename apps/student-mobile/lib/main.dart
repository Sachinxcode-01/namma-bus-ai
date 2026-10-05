import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'controllers/auth_controller.dart';
import 'controllers/transport_controller.dart';
import 'core/constants/app_constants.dart';
import 'core/network/http_client.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/transport_repository.dart';
import 'presentation/screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system UI overlay style for seamless modern look
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppColors.surface,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  final httpClient = ApiHttpClient();
  final authRepository = AuthRepositoryImpl(httpClient: httpClient);
  final transportRepository = TransportRepositoryImpl(httpClient: httpClient);

  final authController = AuthController(authRepository: authRepository);
  final transportController = TransportController(transportRepository: transportRepository);

  runApp(
    NammaBusStudentApp(
      authController: authController,
      transportController: transportController,
    ),
  );
}

class NammaBusStudentApp extends StatelessWidget {
  final AuthController authController;
  final TransportController transportController;

  const NammaBusStudentApp({
    super.key,
    required this.authController,
    required this.transportController,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: SplashScreen(
        authController: authController,
        transportController: transportController,
      ),
    );
  }
}
