# NammaBus AI — REST API Standards and OpenAPI Documentation

## Base URL

All domain endpoints are prefixed with version 1:

```text
http://localhost:4000/api/v1
```

Root endpoints:

- `GET /health` — Liveness probe
- `GET /health/ready` — Readiness probe (database connectivity)
- `GET /docs` — Interactive Swagger UI

## Request Headers

| Header | Description | Required | Example |
| :--- | :--- | :--- | :--- |
| `X-Request-ID` | Client correlation ID (auto-generated if omitted) | No | `req_9e47bf1b2c7e47a9` |
| `Authorization` | Bearer JWT access token for authenticated routes | Conditional | `Bearer eyJhbGci...` |
| `Content-Type` | MIME type (`application/json`) | For POST/PUT/PATCH | `application/json` |

## Response Formats

### Standard Success Envelope

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-10-02T13:50:00.000Z",
    "uptime": 12.4,
    "version": "1.0.0"
  }
}
```

### Standard Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed.",
    "requestId": "req_9e47bf1b2c7e47a9",
    "details": [
      "latitude must be a latitude coordinate",
      "longitude must be a longitude coordinate"
    ]
  }
}
```

## Standard Error Codes

| Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 400 | Bad input payload or malformed query parameter |
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired JWT |
| `FORBIDDEN` | 403 | Authenticated user lacks permission for action |
| `NOT_FOUND` | 404 | Target resource does not exist |
| `CONFLICT` | 409 | Unique constraint violation or state conflict |
| `SERVICE_UNAVAILABLE` | 503 | Database or downstream critical service down |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled server exception (details masked) |

## Phase 1 Endpoints

### Authentication (`/api/v1/auth`)

- `POST /api/v1/auth/register/student` — Register student account (`email`, `password`, `name`, `usn`, optional `phone`).
- `POST /api/v1/auth/register/driver` — Register driver account (`email`, `password`, `name`, `licenseNumber`, `phone`).
- `POST /api/v1/auth/login` — Authenticate with `email` and `password`. Returns `{ accessToken, refreshToken, expiresIn, user }`.
- `POST /api/v1/auth/refresh` — Rotate single-use refresh token and receive a new token pair.
- `POST /api/v1/auth/logout` — Revoke active refresh token.
- `GET /api/v1/auth/me` — Retrieve authenticated user profile with role context (`STUDENT`, `DRIVER`, `ADMIN`).

### User Management (`/api/v1/users`)

- `GET /api/v1/users` — List users with pagination and search (`page`, `limit`, `role`, `search`). **Admin only**.
- `GET /api/v1/users/:id` — Retrieve user profile by ID. **Admin or account owner**.
- `PATCH /api/v1/users/:id/status` — Activate/deactivate account (`isActive: boolean`). **Admin only**.

## Phase 2 Endpoints (Transport Management)

### Fleet Buses (`/api/v1/buses`)

- `POST /api/v1/buses` — Register new bus (`busNumber`, `registrationNumber`, `capacity`, optional `isActive`). **Admin only**.
- `GET /api/v1/buses` — List fleet buses with pagination, optional `search` (busNumber/registrationNumber) and `isActive` filter. **Authenticated**.
- `GET /api/v1/buses/:id` — Get bus details and current active trip status by ID. **Authenticated**.
- `PATCH /api/v1/buses/:id` — Update bus capacity, registration, or active status. **Admin only**.
- `DELETE /api/v1/buses/:id` — Delete bus (rejected if historical trips exist). **Admin only**.

### Bus Stops (`/api/v1/stops`)

- `POST /api/v1/stops` — Create bus stop (`name`, `code`, `latitude`, `longitude`, optional `geofenceRadiusMeters`). **Admin only**.
- `GET /api/v1/stops` — List bus stops with pagination and search. **Authenticated**.
- `GET /api/v1/stops/:id` — Get stop details by ID. **Authenticated**.
- `PATCH /api/v1/stops/:id` — Update stop name, code, coordinates, or geofence radius. **Admin only**.
- `DELETE /api/v1/stops/:id` — Delete stop (rejected if assigned to routes or subscribed to by students). **Admin only**.

### Routes & Stop Sequencing (`/api/v1/routes`)

- `POST /api/v1/routes` — Create bus route (`name`, `code`, optional `description`, optional `isActive`). **Admin only**.
- `GET /api/v1/routes` — List routes with pagination, search, and stop counts. **Authenticated**.
- `GET /api/v1/routes/:id` — Get route details with ordered sequential stops. **Authenticated**.
- `PATCH /api/v1/routes/:id` — Update route name, code, description, or status. **Admin only**.
- `DELETE /api/v1/routes/:id` — Delete route (rejected if trips exist). **Admin only**.
- `POST /api/v1/routes/:id/stops` — Assign and order sequential stops (`stops: [{ stopId, sequenceOrder, estimatedMinutesFromStart }]`). **Admin only**.
- `GET /api/v1/routes/:id/stops` — Get ordered list of stops along the route. **Authenticated**.

### Driver Management (`/api/v1/drivers`)

- `GET /api/v1/drivers` — List drivers with pagination, search, and active trip status. **Admin only**.
- `GET /api/v1/drivers/me` — Retrieve current authenticated driver profile and assignments. **Driver only**.
- `GET /api/v1/drivers/:id` — Get driver profile by ID. **Admin or driver owner**.
- `PATCH /api/v1/drivers/:id` — Update driver profile (`name`, `phone`, `licenseNumber` [admin only]).

### Student Directory (`/api/v1/students`)

- `GET /api/v1/students` — List students with pagination and search (`name`, `usn`, `email`). **Admin only**.
- `GET /api/v1/students/me` — Retrieve current student profile and active stop subscriptions. **Student only**.
- `GET /api/v1/students/:id` — Get student profile by ID. **Admin or student owner**.
- `PATCH /api/v1/students/:id` — Update student contact details (`name`, `phone`).

### Route Subscriptions (`/api/v1/subscriptions`)

- `POST /api/v1/subscriptions` — Subscribe student to a specific stop on a route (`routeId`, `stopId`). Validates that stop belongs to the route.
- `GET /api/v1/subscriptions` — List subscriptions (Students view theirs; Admins can filter by `studentId`, `routeId`, `stopId`).
- `DELETE /api/v1/subscriptions/:id` — Cancel/remove subscription. **Admin or student owner**.

## Phase 3 Endpoints (Trips, GPS Ingestion & Realtime Tracking)

### Operational Bus Trips (`/api/v1/trips`)

- `POST /api/v1/trips` — Schedule a new bus trip (`busId`, `driverId`, `routeId`, optional `scheduledStartTime`). Validates bus/driver/route availability and prevents concurrent active conflicts. **Admin only**.
- `GET /api/v1/trips` — List trips with pagination and filtering (`status`, `busId`, `driverId`, `routeId`, `date`, `search`). **Authenticated**.
- `GET /api/v1/trips/active` — List all currently active bus trips across the fleet. **Authenticated**.
- `GET /api/v1/trips/:id` — Get detailed trip info by ID, including assigned bus, driver, sequenced route stops, and stop events. **Authenticated**.
- `PATCH /api/v1/trips/:id/start` — Start scheduled trip (`actualStartTime` recorded, status set to `ACTIVE`). Idempotent if already active. **Assigned driver or Admin**.
- `PATCH /api/v1/trips/:id/end` — End active trip (`actualEndTime` recorded, status set to `COMPLETED`). Idempotent if already completed. **Assigned driver or Admin**.
- `PATCH /api/v1/trips/:id/cancel` — Cancel trip. Rejects cancellation of completed trips. **Assigned driver or Admin**.
- `GET /api/v1/trips/:id/stops` — Get ordered stops along the trip route with recorded arrival/departure event timestamps. **Authenticated**.
- `POST /api/v1/trips/:id/stops/:stopId/events` — Record a stop arrival or departure event (`eventType`: `ARRIVED` | `DEPARTED`, optional `timestamp`). Idempotent. **Assigned driver or Admin**.

### High-Frequency GPS & Realtime Telemetry (`/api/v1/locations`)

- `POST /api/v1/locations/ingest` — Ingest vehicle GPS ping (`tripId`, `latitude`, `longitude`, optional `speed`, `heading`, `accuracy`, `timestamp`). Strict validation on bounds, clock skew, speed limits, and teleportation jumps. **Assigned driver or Admin**.
- `GET /api/v1/locations/trips/:tripId/latest` — Fetch the most recent live location for an active trip. **Authenticated**.
- `GET /api/v1/locations/buses/:busId/latest` — Fetch the most recent live location for a fleet vehicle. **Authenticated**.
- `GET /api/v1/locations/trips/:tripId/history` — Fetch historical GPS breadcrumbs for a trip (`limit`, `since`). **Authenticated**.
- `GET /api/v1/locations/trips/:tripId/stream` — **Server-Sent Events (SSE)** real-time live location stream for continuous map updates without polling. **Authenticated**.
