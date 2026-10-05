import '../models/bus_route_model.dart';
import '../models/driver_user_model.dart';
import '../models/location_telemetry_model.dart';
import '../models/trip_model.dart';

abstract final class MockDriverData {
  static const DriverUserModel mockDriver = DriverUserModel(
    id: 'driver-001',
    email: 'ramesh.driver@nammabus.ai',
    name: 'Ramesh Kumar',
    phone: '+91 98450 12345',
    licenseNumber: 'KA-04-2015-008912',
    assignedBusId: 'bus-01',
    assignedBusNumber: 'NB-01',
    assignedBusPlate: 'KA-04-MB-1024',
    avatarUrl: null,
  );

  static const List<RouteStopModel> mockRouteStops = [
    RouteStopModel(
      id: 'stop-01',
      name: 'Majestic Bus Station (Platform 19)',
      sequence: 1,
      latitude: 12.9772,
      longitude: 77.5713,
      scheduledTime: '07:30 AM',
      isCompleted: false,
    ),
    RouteStopModel(
      id: 'stop-02',
      name: 'Corporation Circle (Hudson Circle)',
      sequence: 2,
      latitude: 12.9698,
      longitude: 77.5898,
      scheduledTime: '07:42 AM',
      isCompleted: false,
    ),
    RouteStopModel(
      id: 'stop-03',
      name: 'Shantinagar Bus Stand',
      sequence: 3,
      latitude: 12.9554,
      longitude: 77.5960,
      scheduledTime: '07:55 AM',
      isCompleted: false,
    ),
    RouteStopModel(
      id: 'stop-04',
      name: 'Dairy Circle (NIMHANS Gate)',
      sequence: 4,
      latitude: 12.9372,
      longitude: 77.5997,
      scheduledTime: '08:08 AM',
      isCompleted: false,
    ),
    RouteStopModel(
      id: 'stop-05',
      name: 'St. John\'s Hospital Junction',
      sequence: 5,
      latitude: 12.9288,
      longitude: 77.6190,
      scheduledTime: '08:20 AM',
      isCompleted: false,
    ),
    RouteStopModel(
      id: 'stop-06',
      name: 'Koramangala Sony World Signal',
      sequence: 6,
      latitude: 12.9352,
      longitude: 77.6358,
      scheduledTime: '08:32 AM',
      isCompleted: false,
    ),
    RouteStopModel(
      id: 'stop-07',
      name: 'Greenfield College Engineering Campus',
      sequence: 7,
      latitude: 12.9124,
      longitude: 77.6498,
      scheduledTime: '08:45 AM',
      isCompleted: false,
    ),
  ];

  static const BusRouteModel mockRoute = BusRouteModel(
    id: 'route-101',
    routeCode: 'R-101',
    routeName: 'Majestic to Campus Express',
    origin: 'Majestic Bus Station',
    destination: 'Greenfield College Engineering Campus',
    totalDistanceKm: 18.4,
    estimatedDurationMinutes: 75,
    stops: mockRouteStops,
  );

  static DriverTripModel mockAssignedTrip = DriverTripModel(
    id: 'trip-morning-101',
    busId: 'bus-01',
    busNumber: 'NB-01',
    routeId: 'route-101',
    routeCode: 'R-101',
    routeName: 'Majestic to Campus Express',
    status: DriverTripStatus.notStarted,
    scheduledStartTime: DateTime.now().copyWith(hour: 7, minute: 30),
    currentStopIndex: 0,
    totalStops: mockRouteStops.length,
    stops: mockRouteStops,
  );

  // Realistic GPS trajectory waypoints for telemetry simulation along route
  static const List<Map<String, double>> gpsWaypoints = [
    {'lat': 12.9772, 'lng': 77.5713, 'speed': 0.0, 'heading': 135.0},
    {'lat': 12.9750, 'lng': 77.5760, 'speed': 24.5, 'heading': 120.0},
    {'lat': 12.9720, 'lng': 77.5820, 'speed': 32.0, 'heading': 125.0},
    {'lat': 12.9698, 'lng': 77.5898, 'speed': 18.0, 'heading': 140.0},
    {'lat': 12.9630, 'lng': 77.5925, 'speed': 38.5, 'heading': 175.0},
    {'lat': 12.9554, 'lng': 77.5960, 'speed': 12.0, 'heading': 168.0},
    {'lat': 12.9460, 'lng': 77.5980, 'speed': 42.0, 'heading': 170.0},
    {'lat': 12.9372, 'lng': 77.5997, 'speed': 28.0, 'heading': 165.0},
    {'lat': 12.9320, 'lng': 77.6080, 'speed': 35.0, 'heading': 110.0},
    {'lat': 12.9288, 'lng': 77.6190, 'speed': 20.0, 'heading': 105.0},
    {'lat': 12.9315, 'lng': 77.6270, 'speed': 30.5, 'heading': 70.0},
    {'lat': 12.9352, 'lng': 77.6358, 'speed': 15.0, 'heading': 65.0},
    {'lat': 12.9240, 'lng': 77.6420, 'speed': 36.0, 'heading': 150.0},
    {'lat': 12.9124, 'lng': 77.6498, 'speed': 0.0, 'heading': 160.0},
  ];

  static LocationTelemetryModel initialTelemetry = LocationTelemetryModel(
    busId: 'bus-01',
    tripId: 'trip-morning-101',
    latitude: 12.9772,
    longitude: 77.5713,
    speedKmh: 0.0,
    headingDegrees: 135.0,
    accuracyMeters: 4.2,
    timestamp: DateTime.now(),
    signalQuality: GpsSignalQuality.excellent,
  );
}
