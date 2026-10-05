import '../models/bus_model.dart';
import '../models/route_model.dart';
import '../models/stop_model.dart';
import '../models/tracking_model.dart';
import '../models/notification_model.dart';
import '../models/user_model.dart';

/// Isolated mock dataset for testing, offline resilience, and preview mode
abstract final class MockTransportData {
  static const UserProfile mockStudentUser = UserProfile(
    id: 'user-std-101',
    email: 'student@nammabus.ai',
    role: UserRole.student,
    isActive: true,
    student: StudentProfile(
      id: 'std-101',
      userId: 'user-std-101',
      usn: '1MS21CS042',
      name: 'Sachin Kumar',
      phone: '+91 98765 43210',
      department: 'Computer Science & Engineering',
      semester: '6th Semester - Sec B',
    ),
  );

  static const List<StopEntity> stops = [
    StopEntity(
      id: 'stop-1',
      name: 'Hostel Gate 1',
      code: 'STP-HG1',
      latitude: 12.9716,
      longitude: 77.5946,
      geofenceRadiusMeters: 50,
      landmark: 'Near Canteen Quadrangle',
    ),
    StopEntity(
      id: 'stop-2',
      name: 'Library & Tech Block',
      code: 'STP-LIB',
      latitude: 12.9760,
      longitude: 77.6010,
      geofenceRadiusMeters: 50,
      landmark: 'Opposite Central Reading Hall',
    ),
    StopEntity(
      id: 'stop-3',
      name: 'Engineering Annex',
      code: 'STP-ENG',
      latitude: 12.9810,
      longitude: 77.6080,
      geofenceRadiusMeters: 50,
      landmark: 'Near Mech Workshop & ECE Gate',
    ),
    StopEntity(
      id: 'stop-4',
      name: 'Sports Complex Arena',
      code: 'STP-SPT',
      latitude: 12.9870,
      longitude: 77.6150,
      geofenceRadiusMeters: 50,
      landmark: 'Basketball Stadium Entrance',
    ),
    StopEntity(
      id: 'stop-5',
      name: 'Main Campus Terminal',
      code: 'STP-MCT',
      latitude: 12.9930,
      longitude: 77.6220,
      geofenceRadiusMeters: 60,
      landmark: 'Administrative Block Circle',
    ),
  ];

  static const List<BusEntity> buses = [
    BusEntity(
      id: 'bus-1',
      busNumber: 'NB-01',
      registrationNumber: 'KA-01-EQ-1024',
      capacity: 54,
      isActive: true,
      status: BusStatus.activeEnRoute,
      driverName: 'Ramesh Kumar',
      driverPhone: '+91 98450 12345',
    ),
    BusEntity(
      id: 'bus-2',
      busNumber: 'NB-02',
      registrationNumber: 'KA-01-EQ-2048',
      capacity: 48,
      isActive: true,
      status: BusStatus.scheduled,
      driverName: 'Anand Gowda',
      driverPhone: '+91 98450 67890',
    ),
    BusEntity(
      id: 'bus-3',
      busNumber: 'NB-03',
      registrationNumber: 'KA-01-EQ-3096',
      capacity: 54,
      isActive: true,
      status: BusStatus.delayed,
      driverName: 'Suresh Patil',
      driverPhone: '+91 98450 54321',
    ),
  ];

  static final List<RouteEntity> routes = [
    RouteEntity(
      id: 'route-1',
      name: 'Greenfield Campus Express',
      code: 'RT-GREEN-01',
      description: 'Direct express route connecting student hostels to Main Academic Complex',
      isActive: true,
      routeStops: [
        RouteStopEntity(
          id: 'rs-1',
          routeId: 'route-1',
          stopId: 'stop-1',
          sequenceOrder: 1,
          estimatedMinutesFromStart: 0,
          stop: stops[0],
        ),
        RouteStopEntity(
          id: 'rs-2',
          routeId: 'route-1',
          stopId: 'stop-2',
          sequenceOrder: 2,
          estimatedMinutesFromStart: 5,
          stop: stops[1],
        ),
        RouteStopEntity(
          id: 'rs-3',
          routeId: 'route-1',
          stopId: 'stop-3',
          sequenceOrder: 3,
          estimatedMinutesFromStart: 12,
          stop: stops[2],
        ),
        RouteStopEntity(
          id: 'rs-4',
          routeId: 'route-1',
          stopId: 'stop-4',
          sequenceOrder: 4,
          estimatedMinutesFromStart: 19,
          stop: stops[3],
        ),
        RouteStopEntity(
          id: 'rs-5',
          routeId: 'route-1',
          stopId: 'stop-5',
          sequenceOrder: 5,
          estimatedMinutesFromStart: 26,
          stop: stops[4],
        ),
      ],
    ),
    RouteEntity(
      id: 'route-2',
      name: 'South City Transit Loop',
      code: 'RT-SOUTH-02',
      description: 'Serves South Bengaluru pickup points to College Campus',
      isActive: true,
      routeStops: [
        RouteStopEntity(
          id: 'rs-21',
          routeId: 'route-2',
          stopId: 'stop-1',
          sequenceOrder: 1,
          estimatedMinutesFromStart: 0,
          stop: stops[0],
        ),
        RouteStopEntity(
          id: 'rs-22',
          routeId: 'route-2',
          stopId: 'stop-3',
          sequenceOrder: 2,
          estimatedMinutesFromStart: 14,
          stop: stops[2],
        ),
        RouteStopEntity(
          id: 'rs-23',
          routeId: 'route-2',
          stopId: 'stop-5',
          sequenceOrder: 3,
          estimatedMinutesFromStart: 28,
          stop: stops[4],
        ),
      ],
    ),
  ];

  static LiveLocationEntity getLiveLocation(String busId) {
    // Current active bus is between Stop 2 and Stop 3
    return LiveLocationEntity(
      busId: busId,
      tripId: 'trip-1',
      latitude: 12.9785,
      longitude: 77.6045,
      speed: 36.5,
      heading: 52.0,
      accuracy: 6.5,
      timestamp: DateTime.now().subtract(const Duration(seconds: 4)),
    );
  }

  static TripEtaResponse getTripEta(String tripId) {
    final now = DateTime.now();
    return TripEtaResponse(
      tripId: tripId,
      busId: 'bus-1',
      routeId: 'route-1',
      lastUpdated: now,
      currentDelayMinutes: 0,
      stops: [
        StopEtaDto(
          stopId: 'stop-1',
          stopName: 'Hostel Gate 1',
          stopCode: 'STP-HG1',
          sequenceOrder: 1,
          latitude: 12.9716,
          longitude: 77.5946,
          estimatedMinutes: 0,
          estimatedArrivalTime: now.subtract(const Duration(minutes: 6)),
          distanceRemainingMeters: 0,
          status: StopEtaStatus.passed,
        ),
        StopEtaDto(
          stopId: 'stop-2',
          stopName: 'Library & Tech Block',
          stopCode: 'STP-LIB',
          sequenceOrder: 2,
          latitude: 12.9760,
          longitude: 77.6010,
          estimatedMinutes: 2,
          estimatedArrivalTime: now.add(const Duration(minutes: 2)),
          distanceRemainingMeters: 450,
          status: StopEtaStatus.approaching,
        ),
        StopEtaDto(
          stopId: 'stop-3',
          stopName: 'Engineering Annex',
          stopCode: 'STP-ENG',
          sequenceOrder: 3,
          latitude: 12.9810,
          longitude: 77.6080,
          estimatedMinutes: 8,
          estimatedArrivalTime: now.add(const Duration(minutes: 8)),
          distanceRemainingMeters: 1800,
          status: StopEtaStatus.next,
        ),
        StopEtaDto(
          stopId: 'stop-4',
          stopName: 'Sports Complex Arena',
          stopCode: 'STP-SPT',
          sequenceOrder: 4,
          latitude: 12.9870,
          longitude: 77.6150,
          estimatedMinutes: 15,
          estimatedArrivalTime: now.add(const Duration(minutes: 15)),
          distanceRemainingMeters: 3400,
          status: StopEtaStatus.upcoming,
        ),
        StopEtaDto(
          stopId: 'stop-5',
          stopName: 'Main Campus Terminal',
          stopCode: 'STP-MCT',
          sequenceOrder: 5,
          latitude: 12.9930,
          longitude: 77.6220,
          estimatedMinutes: 22,
          estimatedArrivalTime: now.add(const Duration(minutes: 22)),
          distanceRemainingMeters: 5100,
          status: StopEtaStatus.upcoming,
        ),
      ],
    );
  }

  static List<NotificationEntity> get notifications => [
        NotificationEntity(
          id: 'notif-1',
          recipientId: 'user-std-101',
          tripId: 'trip-1',
          type: NotificationType.eta10Min,
          title: 'Bus Approaching: Engineering Annex',
          body: 'Bus NB-01 is 8 minutes away from your stop (Engineering Annex). Please be ready at the gate.',
          isRead: false,
          createdAt: DateTime.now().subtract(const Duration(minutes: 3)),
        ),
        NotificationEntity(
          id: 'notif-2',
          recipientId: 'user-std-101',
          tripId: 'trip-1',
          type: NotificationType.tripStarted,
          title: 'Trip Started: Route Greenfield Express',
          body: 'Driver Ramesh Kumar has started morning trip from Hostel Gate 1.',
          isRead: true,
          createdAt: DateTime.now().subtract(const Duration(minutes: 14)),
        ),
        NotificationEntity(
          id: 'notif-3',
          recipientId: 'user-std-101',
          type: NotificationType.broadcast,
          title: 'College Transportation Advisory',
          body: 'Due to road maintenance on Outer Ring Road, Bus NB-03 may experience a 10 min delay today.',
          isRead: true,
          createdAt: DateTime.now().subtract(const Duration(hours: 2)),
        ),
      ];
}
