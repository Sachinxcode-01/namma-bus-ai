import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:driver_mobile/core/network/http_client.dart';
import 'package:driver_mobile/core/theme/app_theme.dart';
import 'package:driver_mobile/data/mock/mock_driver_data.dart';
import 'package:driver_mobile/data/repositories/driver_auth_repository.dart';
import 'package:driver_mobile/data/repositories/driver_trip_repository.dart';
import 'package:driver_mobile/data/repositories/location_service.dart';
import 'package:driver_mobile/data/repositories/incident_repository.dart';
import 'package:driver_mobile/controllers/driver_auth_controller.dart';
import 'package:driver_mobile/controllers/driver_trip_controller.dart';
import 'package:driver_mobile/controllers/location_tracking_controller.dart';
import 'package:driver_mobile/controllers/incident_controller.dart';
import 'package:driver_mobile/presentation/screens/driver_login_screen.dart';
import 'package:driver_mobile/presentation/screens/driver_home_screen.dart';
import 'package:driver_mobile/presentation/screens/incident_report_screen.dart';
import 'package:driver_mobile/presentation/screens/sos_screen.dart';
import 'package:driver_mobile/presentation/screens/driver_alerts_screen.dart';
import 'package:driver_mobile/presentation/screens/driver_profile_screen.dart';

void main() {
  late ApiClient apiClient;
  late DriverAuthRepository authRepo;
  late DriverTripRepository tripRepo;
  late LocationTrackingService locationService;
  late DriverAuthController authController;
  late LocationTrackingController trackingController;
  late DriverTripController tripController;
  late IncidentController incidentController;

  setUp(() {
    apiClient = ApiClient();
    authRepo = DriverAuthRepository(client: apiClient);
    tripRepo = DriverTripRepository(client: apiClient);
    locationService = LocationTrackingService(client: apiClient);

    authController = DriverAuthController(authRepo: authRepo);
    trackingController = LocationTrackingController(locationService: locationService);
    tripController = DriverTripController(
      tripRepo: tripRepo,
      trackingController: trackingController,
    );
    incidentController = IncidentController(
      incidentRepo: IncidentRepository(client: apiClient),
    );
  });

  tearDown(() {
    locationService.dispose();
    trackingController.dispose();
  });

  testWidgets('DriverLoginScreen renders correctly with demo quick-fill', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.darkTheme,
        home: DriverLoginScreen(
          authController: authController,
          tripController: tripController,
        ),
      ),
    );

    expect(find.text('Driver Portal'), findsOneWidget);
    expect(find.text('Quick Demo Login'), findsOneWidget);
    expect(find.text('SIGN IN & ACCESS BUS'), findsOneWidget);

    // Tap Quick Demo Login
    await tester.tap(find.text('Quick Demo Login'));
    await tester.pump();

    // Verify fields populated
    expect(find.text(MockDriverData.mockDriver.email), findsOneWidget);
  });

  testWidgets('DriverHomeScreen renders driver details and route assignment', (tester) async {
    // Authenticate and load trip
    await authController.login(
      email: MockDriverData.mockDriver.email,
      password: 'password123',
    );
    await tripController.loadAssignedTrip();

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.darkTheme,
        home: DriverHomeScreen(
          authController: authController,
          tripController: tripController,
        ),
      ),
    );

    expect(find.text(MockDriverData.mockDriver.name), findsOneWidget);
    expect(find.text('START ASSIGNED TRIP'), findsOneWidget);
    expect(find.text('LIVE TELEMETRY'), findsOneWidget);
    expect(find.text('REPORT BREAKDOWN'), findsOneWidget);
    expect(find.text('EMERGENCY SOS'), findsOneWidget);
    expect(find.text('Majestic to Campus Express'), findsOneWidget);
  });

  testWidgets('IncidentReportScreen allows selecting incident type and submitting', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.darkTheme,
        home: IncidentReportScreen(
          tripId: 'trip-morning-101',
          busId: 'bus-01',
          controller: incidentController,
        ),
      ),
    );

    expect(find.text('Report Incident / Breakdown'), findsOneWidget);
    expect(find.text('Engine / Mechanical Breakdown'), findsOneWidget);
    expect(find.text('SUBMIT INCIDENT REPORT'), findsOneWidget);
  });

  testWidgets('SosScreen requires confirmation before triggering emergency broadcast', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.darkTheme,
        home: SosScreen(
          tripId: 'trip-morning-101',
          busId: 'bus-01',
          driverName: MockDriverData.mockDriver.name,
          controller: incidentController,
        ),
      ),
    );

    expect(find.text('Emergency SOS'), findsOneWidget);
    expect(find.text('CAMPUS DISPATCH EMERGENCY'), findsOneWidget);
    expect(find.text('TRIGGER EMERGENCY SOS'), findsOneWidget);
  });

  testWidgets('DriverAlertsScreen renders dispatch notifications', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.darkTheme,
        home: const DriverAlertsScreen(),
      ),
    );

    expect(find.text('Driver Alerts'), findsOneWidget);
    expect(find.text('Morning Route Assigned'), findsOneWidget);
  });

  testWidgets('DriverProfileScreen shows driver vehicle and license info', (tester) async {
    await authController.login(
      email: MockDriverData.mockDriver.email,
      password: 'password123',
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.darkTheme,
        home: DriverProfileScreen(
          authController: authController,
          onLogout: () {},
        ),
      ),
    );

    expect(find.text('Driver Profile'), findsOneWidget);
    expect(find.text('ASSIGNED VEHICLE'), findsOneWidget);
    expect(find.text('LOG OUT OF DRIVER CONSOLE'), findsOneWidget);
  });
}
