# Architecture Decision Record (ADR) 005: Production GPS Ingestion & Realtime Bus Tracking

## Status

Accepted

## Context

Following the foundational transit models (buses, sequential routes, stops, driver assignments, and trip lifecycle FSM) established in Phases 1–3, NammaBus AI requires an authoritative, high-throughput, and production-grade GPS ingestion and real-time tracking layer.

College transit operating environments in Bengaluru and similar campuses present distinctive operational challenges:
- High frequency GPS reporting from driver mobile phones (1–2 updates per second).
- Unreliable cellular coverage and packet buffering when buses enter underpasses, basement terminus points, or poor signal zones.
- Mobile device clock drift (device timestamp vs server received timestamp).
- Erroneous GPS telemetry: multipath reflections, impossible teleportation jumps, extreme accuracy degradation (> 200m), and duplicate transmission on mobile network retries.
- Need for immediate operational visibility for students, parents, and fleet managers without overwhelming client batteries or flooding backend infrastructure.

## Decisions

### 1. Ingestion Pipeline & Single-Responsibility Architecture

To prevent a monolithic "God Service", GPS telemetry ingestion is decomposed into independent, testable domain components:
- **`LocationsController`**: Thin HTTP controller validating request envelopes, enforcing JWT authentication, RBAC authorization (`DRIVER`, `ADMIN`), rate limiting (20 pings/sec sliding window per IP), and binding REST + SSE endpoints.
- **`GpsValidatorService`**: Pure domain validation isolating coordinate boundaries (`[-90, 90]`, `[-180, 180]`), clock skew tolerances, vehicle speed plausibility (<= 120 km/h), compass heading, accuracy metric categorization, and Haversine teleportation anomaly detection.
- **`GpsDeduplicationService`**: Suppresses redundant network retries of identical GPS readings and eliminates micro-displacement stationary jitter (< 2m within 500ms).
- **`LiveTrackingService`**: Manages the authoritative *current* operational position of each active bus and trip, enforcing dynamic staleness policies and maintaining an in-memory `O(1)` state cache.
- **`LocationStreamService`**: Reactive multi-channel Server-Sent Events (SSE) broadcasting system with periodic keep-alive heartbeats and lifecycle connection tracking.
- **`GpsMetricsService`**: Telemetry health observability tracking accepted, rejected, suspicious, stale, and duplicate counter metrics.
- **`LocationsRepository`**: Encapsulates persistence to PostgreSQL `live_locations` table using optimized compound indices.

```text
Driver Mobile Phone
        ↓ [POST /api/v1/locations]
LocationsController (RateLimitGuard + JwtAuthGuard + RolesGuard)
        ↓
LocationsService (Orchestrator)
        ↓
Active Trip & Ownership Verification (TripsRepository)
        ↓
GpsDeduplicationService (Suppresses network retries & stationary jitter)
        ↓
GpsValidatorService (Geographic bounds, clock drift, teleportation check)
        ↓
LocationsRepository (Persists to live_locations with receivedAt timestamp)
        ↓
LiveTrackingService (Updates authoritative current state cache & staleness)
        ↓
LocationStreamService (Broadcasts event to trip, bus, route, and fleet subscribers)
```

### 2. Device Timestamp vs. Server Timestamp

- `timestamp` (`recordedAt`): The device-reported capture time. Treated as untrusted external telemetry. Drift into the future is capped at 60 seconds (accommodating device clock skew). Readings older than 10 minutes are rejected as stale.
- `createdAt` (`receivedAt`): Server-authoritative timestamp generated upon database insertion.
- **Time Inversion Invariant**: An incoming GPS reading with a device timestamp older than or equal to the latest accepted reading for the trip is rejected, preventing out-of-order delayed packets from moving the current authoritative bus position backwards in time.

### 3. Coordinate, Accuracy, and Anomaly Plausibility Filters

1. **Coordinates**: Must be finite numbers within `[-90, 90]` latitude and `[-180, 180]` longitude. Non-finite, `NaN`, or out-of-bounds coordinates are rejected with `ValidationException`.
2. **Accuracy Tiers**:
   - `EXCELLENT`: <= 10.0 meters.
   - `ACCEPTABLE`: <= 50.0 meters.
   - `POOR`: > 50.0 meters.
   - `REJECTED`: > 200.0 meters (discarded as unusable noise).
3. **Speed & Teleportation Detection**:
   - Instantaneous speed ceiling: 120 km/h.
   - Jump velocity calculated via the Haversine formula against the latest accepted location. Consecutive pings within 120 seconds with implied velocity > 160 km/h are rejected as teleportation anomalies.
   - Velocities between 95 km/h and 160 km/h are flagged as `SUSPICIOUS` for operational metrics.

### 4. Authoritative Live Operational Status & Staleness Policy

The system distinguishes five authoritative operational states:
- `TRIP_NOT_STARTED`: Trip is scheduled but driver has not started it, or bus has no active trip history.
- `LIVE`: Bus is operating an active trip and has reported validated GPS telemetry within the last 45 seconds (`GPS_CONFIG.LIVE_THRESHOLD_MS`).
- `STALE`: Bus is operating an active trip, but 45 to 180 seconds have elapsed since the last valid update. Student and admin maps display a warning indicator.
- `OFFLINE`: Active trip has not reported any GPS update for > 180 seconds (3 minutes), indicating device shutdown, battery exhaustion, or tunnel signal loss.
- `COMPLETED` / `CANCELLED`: Trip has ended.

### 5. Offline GPS Buffering & Batch Sync

Mobile devices recovering from signal outages can submit buffered breadcrumbs via `POST /api/v1/locations/batch` (up to 100 pings per batch).
- Readings are sorted chronologically by device timestamp.
- Each valid reading is persisted to `live_locations` for historical route replay and future ETA ML training.
- Only the latest valid reading updates the authoritative real-time live position.

### 6. Real-Time Distribution via Server-Sent Events (SSE)

Real-time streaming is implemented using unidirectional HTTP Server-Sent Events (SSE):
- Dedicated domain channels:
  - `GET /api/v1/locations/trips/:tripId/stream`: Trip-level live stream for students waiting for a specific bus.
  - `GET /api/v1/locations/buses/:busId/stream`: Vehicle-level live stream.
  - `GET /api/v1/locations/routes/:routeCode/stream`: Route-level live stream.
  - `GET /api/v1/locations/fleet/stream`: Comprehensive fleet-wide monitoring stream for transit administrators.
- **Initial State Emission**: Upon connection, subscribers immediately receive the bus's current authoritative state without waiting for the next physical GPS broadcast.
- **Heartbeat Keep-Alive**: A `:ping` event is interleaved every 20 seconds (`GPS_CONFIG.SSE_HEARTBEAT_INTERVAL_MS`), preventing mobile browser and corporate proxy disconnections.

### 7. Future ETA Engine Compatibility

Every accepted location record preserves clean, indexed, and normalized fields:
- `tripId`, `busId`, `latitude`, `longitude`, `speed`, `heading`, `accuracy`, `timestamp` (recordedAt), and `createdAt` (receivedAt).
- This structured history provides the foundation for Phase 4: Deterministic Haversine ETA calculation, stop sequence progression, and subsequent historical ML ETA modeling.

## Consequences

- Full operational visibility for college students, drivers, and transport administrators.
- High resilience against corrupt, spoofed, duplicated, or out-of-order GPS telemetry.
- Zero external client libraries required for real-time frontend integration (standard browser and Flutter HTTP/EventSource).
- Sub-millisecond `O(1)` live state lookups backed by in-memory caching.
- Exhaustive test coverage encompassing all validation thresholds, state transitions, and anomaly conditions.
