# NammaBus AI — GPS Ingestion & Real-Time Tracking Frontend/API Contract

This document provides the canonical API specifications and contracts for **Prem's** frontend applications:
1. **Driver Mobile App** (Flutter Android / iOS)
2. **Student Mobile & Web App** (Flutter / React)
3. **Admin Transit Dashboard** (React Vite)

---

## 1. Driver Mobile Application Contract

### 1.1 Ingest Single Real-Time GPS Telemetry Ping
* **Endpoint:** `POST /api/v1/locations` or `POST /api/v1/locations/ingest` or `POST /api/v1/trips/:tripId/locations`
* **Auth:** Bearer JWT token (`ROLE_DRIVER` or `ROLE_ADMIN`)
* **Frequency:** Broadcast every 2.5 seconds while operating an `ACTIVE` trip.
* **Rate Limit:** Up to 20 pings per second.

#### Request Body (`IngestLocationDto`)
```json
{
  "tripId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
  "busId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "speed": 32.5,
  "heading": 85.0,
  "accuracy": 4.5,
  "timestamp": "2026-10-08T14:30:15.000Z"
}
```
* `tripId` is optional if the driver is currently operating an `ACTIVE` trip (inferred automatically from the JWT driver identity).
* `speed` is in km/h (must be >= 0 and <= 120 km/h).
* `heading` is in compass degrees (0 to 360).
* `accuracy` is in meters radius (must be >= 0 and <= 200m).
* `timestamp` is the phone's GPS capture time (ISO 8601).

#### Success Response (`HTTP 201 Created`)
```json
{
  "id": "loc-uuid-1",
  "busId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "tripId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "speed": 32.5,
  "heading": 85.0,
  "accuracy": 4.5,
  "timestamp": "2026-10-08T14:30:15.000Z",
  "createdAt": "2026-10-08T14:30:15.820Z"
}
```

#### Rejection Status Codes
* `HTTP 400 Bad Request` (`VALIDATION_ERROR`): Malformed coordinates, excessive clock skew (> 60s future), stale timestamp (> 10m past), accuracy > 200m, or teleportation jump anomaly (> 160 km/h).
* `HTTP 400 Bad Request` (`INVALID_TRIP_STATE`): Trip is not in `ACTIVE` status (e.g. `SCHEDULED`, `COMPLETED`, `CANCELLED`).
* `HTTP 403 Forbidden` (`FORBIDDEN`): Driver is not assigned to the specified trip.

---

### 1.2 Batch Ingestion of Offline Buffered GPS Breadcrumbs
Used when the driver phone reconnects to cellular data after traversing an underpass, basement, or signal blindspot.

* **Endpoint:** `POST /api/v1/locations/batch`
* **Auth:** Bearer JWT (`ROLE_DRIVER` or `ROLE_ADMIN`)

#### Request Body (`BatchIngestLocationDto`)
```json
{
  "locations": [
    {
      "tripId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      "latitude": 12.9710,
      "longitude": 77.5940,
      "speed": 28.0,
      "heading": 80.0,
      "accuracy": 6.0,
      "timestamp": "2026-10-08T14:28:10.000Z"
    },
    {
      "tripId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "speed": 32.5,
      "heading": 85.0,
      "accuracy": 4.5,
      "timestamp": "2026-10-08T14:28:15.000Z"
    }
  ]
}
```

#### Success Response (`HTTP 201 Created`)
```json
{
  "totalReceived": 2,
  "acceptedCount": 2,
  "ingestedCount": 2,
  "rejectedCount": 0,
  "latestStatus": "LIVE",
  "latestLocation": {
    "id": "loc-uuid-2",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "speed": 32.5,
    "timestamp": "2026-10-08T14:28:15.000Z"
  }
}
```

---

## 2. Student Application Contract

### 2.1 Fetch Live Bus Status
* **Endpoints:**
  - `GET /api/v1/buses/:busId/live`
  - `GET /api/v1/buses/:busId/live-location`
  - `GET /api/v1/trips/:tripId/live`
* **Auth:** Bearer JWT (`ROLE_STUDENT`, `ROLE_DRIVER`, `ROLE_ADMIN`)

#### Success Response (`HTTP 200 OK`)
```json
{
  "busId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "busNumber": "KA-01-F-1001",
  "tripId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
  "routeId": "r1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  "routeCode": "R-01",
  "routeName": "Hebbal to Majestic Campus Express",
  "driverId": "d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
  "driverName": "Suresh Kumar",
  "status": "LIVE",
  "isStale": false,
  "latitude": 12.9716,
  "longitude": 77.5946,
  "speed": 32.5,
  "heading": 85.0,
  "accuracy": 4.5,
  "accuracyQuality": "EXCELLENT",
  "recordedAt": "2026-10-08T14:30:15.000Z",
  "receivedAt": "2026-10-08T14:30:15.820Z",
  "ageSeconds": 3
}
```

### 2.2 Operational Status Classification
| Status | Condition | UI Behavior |
| :--- | :--- | :--- |
| `TRIP_NOT_STARTED` | Trip scheduled but not yet started by driver | Display scheduled start time; map shows route polyline without moving bus |
| `LIVE` | Valid GPS reading received within <= 45 seconds | Green indicator; live bus icon moves smoothly along polyline |
| `STALE` | 45 seconds < age <= 180 seconds | Amber warning badge: *"Weak GPS / Stale signal"* |
| `OFFLINE` | age > 180 seconds | Gray indicator: *"Bus offline / Reconnecting"* |
| `COMPLETED` | Trip ended by driver | *"Trip concluded"* |
| `CANCELLED` | Trip cancelled | Alert notification |

---

### 2.3 Server-Sent Events (SSE) Real-Time Stream
* **Endpoints:**
  - `GET /api/v1/locations/trips/:tripId/stream`
  - `GET /api/v1/locations/buses/:busId/stream`
  - `GET /api/v1/locations/routes/:routeCode/stream`
* **Auth:** Bearer JWT in request header
* **Protocol:** HTTP SSE (`text/event-stream`)

#### Event Stream Contract
```text
event: bus.location.updated
id: loc-uuid-1
data: {"tripId":"d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44","busId":"b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11","routeId":"r1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22","busNumber":"KA-01-F-1001","routeCode":"R-01","latitude":12.9716,"longitude":77.5946,"accuracy":4.5,"speed":32.5,"heading":85.0,"recordedAt":"2026-10-08T14:30:15.000Z","receivedAt":"2026-10-08T14:30:15.820Z","status":"LIVE"}

:ping (Heartbeat keep-alive every 20 seconds)
```

---

## 3. Admin Dashboard Contract

### 3.1 Fleet-Wide Real-Time Stream
* **Endpoint:** `GET /api/v1/locations/fleet/stream`
* **Auth:** Bearer JWT (`ROLE_ADMIN` only)
* **Description:** Emits continuous location events for all operational buses in the campus fleet.

### 3.2 GPS Subsystem Health & Diagnostics
* **Endpoint:** `GET /api/v1/locations/health`
* **Auth:** Bearer JWT (`ROLE_ADMIN` only)

#### Success Response (`HTTP 200 OK`)
```json
{
  "activeConnections": 14,
  "activeTripsTracked": 3,
  "totalReceived": 1250,
  "acceptedCount": 1242,
  "rejectedCount": 8,
  "staleCount": 4,
  "suspiciousCount": 2,
  "teleportationCount": 1,
  "duplicateCount": 24,
  "lastIngestAt": "2026-10-08T14:30:15.820Z",
  "uptimeSeconds": 7200
}
```
