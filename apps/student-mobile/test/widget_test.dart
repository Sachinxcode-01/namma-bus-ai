import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:student_mobile/controllers/auth_controller.dart';
import 'package:student_mobile/controllers/notification_controller.dart';
import 'package:student_mobile/controllers/tracking_controller.dart';
import 'package:student_mobile/controllers/transport_controller.dart';
import 'package:student_mobile/core/constants/app_constants.dart';
import 'package:student_mobile/core/network/http_client.dart';
import 'package:student_mobile/data/mock/mock_transport_data.dart';
import 'package:student_mobile/data/repositories/auth_repository.dart';
import 'package:student_mobile/data/repositories/notification_repository.dart';
import 'package:student_mobile/data/repositories/tracking_repository.dart';
import 'package:student_mobile/data/repositories/transport_repository.dart';
import 'package:student_mobile/presentation/screens/home_dashboard_screen.dart';
import 'package:student_mobile/presentation/screens/login_screen.dart';
import 'package:student_mobile/presentation/widgets/nb_eta_ticker.dart';

void main() {
  group('NammaBus AI Student App Tests', () {
    late ApiHttpClient httpClient;
    late AuthRepository authRepository;
    late TransportRepository transportRepository;
    late TrackingRepository trackingRepository;
    late NotificationRepository notificationRepository;

    late AuthController authController;
    late TransportController transportController;
    late TrackingController trackingController;
    late NotificationController notificationController;

    setUp(() {
      httpClient = ApiHttpClient();
      authRepository = AuthRepositoryImpl(httpClient: httpClient);
      transportRepository = TransportRepositoryImpl(httpClient: httpClient);
      trackingRepository = TrackingRepositoryImpl(httpClient: httpClient);
      notificationRepository = NotificationRepositoryImpl(httpClient: httpClient);

      authController = AuthController(authRepository: authRepository);
      transportController = TransportController(transportRepository: transportRepository);
      trackingController = TrackingController(trackingRepository: trackingRepository);
      notificationController = NotificationController(notificationRepository: notificationRepository);
    });

    tearDown(() {
      trackingController.stopPolling();
    });

    test('AuthController logs in student with valid demo credentials', () async {
      expect(authController.isAuthenticated, isFalse);

      final success = await authController.login(
        email: AppConstants.demoEmail,
        password: AppConstants.demoPassword,
      );

      expect(success, isTrue);
      expect(authController.isAuthenticated, isTrue);
      expect(authController.user?.student?.usn, equals('1MS21CS042'));
    });

    test('TransportController loads buses and routes correctly', () async {
      await transportController.loadTransportData();

      expect(transportController.buses.isNotEmpty, isTrue);
      expect(transportController.routes.isNotEmpty, isTrue);
      expect(transportController.stops.isNotEmpty, isTrue);
      expect(transportController.selectedBus?.busNumber, equals('NB-01'));
      expect(transportController.selectedStop?.name, contains('Annex'));
    });

    test('TrackingController calculates arrival ETA for selected stop', () async {
      trackingController.startPolling(busId: 'bus-1');
      await Future.delayed(const Duration(milliseconds: 50));

      final eta = trackingController.getEtaForStop('stop-3');
      expect(eta, isNotNull);
      expect(eta?.estimatedMinutes, equals(8));
      expect(eta?.stopName, equals('Engineering Annex'));
      trackingController.stopPolling();
    });

    testWidgets('LoginScreen renders fields and demo access button', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: LoginScreen(
            authController: authController,
            transportController: transportController,
          ),
        ),
      );

      expect(find.text('NammaBus AI'), findsOneWidget);
      expect(find.text('Student Sign In'), findsOneWidget);
      expect(find.text('College Email or USN'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Sign In to Track Bus'), findsOneWidget);
      expect(find.text('⚡ One-Tap Demo Student Login'), findsOneWidget);
    });

    testWidgets('NbEtaTicker renders prominent arrival ETA display', (tester) async {
      final tripEta = MockTransportData.getTripEta('trip-1');
      final stopEta = tripEta.getStopEta('stop-3');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NbEtaTicker(
              stopEta: stopEta,
              stopName: 'Engineering Annex',
            ),
          ),
        ),
      );

      expect(find.text('LIVE ARRIVAL ETA'), findsOneWidget);
      expect(find.text('8 MINS'), findsOneWidget);
      expect(find.textContaining('Engineering Annex'), findsOneWidget);
    });

    testWidgets('HomeDashboardScreen renders hero bus and student greeting', (tester) async {
      await authController.login(
        email: AppConstants.demoEmail,
        password: AppConstants.demoPassword,
      );
      await transportController.loadTransportData();
      await notificationController.loadNotifications();

      await tester.pumpWidget(
        MaterialApp(
          home: HomeDashboardScreen(
            authController: authController,
            transportController: transportController,
            trackingController: trackingController,
            notificationController: notificationController,
            onNavigateToTracking: () {},
          ),
        ),
      );

      expect(find.textContaining('Namaste, Sachin Kumar'), findsOneWidget);
      expect(find.text('NB-01'), findsWidgets);
      expect(find.text('Live Bus Tracking'), findsOneWidget);
      expect(find.text('Stop Progression'), findsOneWidget);
      trackingController.stopPolling();
    });
  });
}
