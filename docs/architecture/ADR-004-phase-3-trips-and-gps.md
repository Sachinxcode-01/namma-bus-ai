# Architecture Decision Record (ADR) 004: Phase 3 Trips, GPS Ingestion & Realtime Tracking

## Status

Accepted

## Context

With foundational transport resources (Buses, Stops, Sequential Routes, Drivers, and Subscriptions) established in Phase 2, Phase 3 implements the dynamic runtime layer of NammaBus AI:

1. Operational Bus Trips with strict lifecycle management.
2. High-throughput GPS telemetry ingestion from mobile devices and onboard hardware.
3. Untrusted GPS input validation (geographic bounds, clock skew, teleportation jump detection).
4. Real-time live location broadcasting to Prem's frontend applications (Student App, Driver App, Admin Dashboard).
5. Sequential stop arrival and departure event recording.

## Decisions

### 1. Trip Lifecycle Finite State Machine & Concurrency Invariants

The `Trip` entity undergoes a strict state transition flow:

```text
           +-----------+
           | SCHEDULED |
           +-----+-----+
                 |
        +--------+--------+
        |                 |
        v                 v
   +----+---+       +-----+-----+
   | ACTIVE | ----> | CANCELLED |
   +----+---+       +-----------+
        |
        v
  +-----+-----+
  | COMPLETED |
  +-----------+
```

- **Transitions**:
  - `SCHEDULED -> ACTIVE`: Initiated via `PATCH /api/v1/trips/:id/start`. Records `actualStartTime`.
  - `ACTIVE -> COMPLETED`: Initiated via `PATCH /api/v1/trips/:id/end`. Records `actualEndTime`.
  - `SCHEDULED -> CANCELLED` or `ACTIVE -> CANCELLED`: Initiated via `PATCH /api/v1/trips/:id/cancel`.
- **Illegal Transitions**:
  - Any attempt to transition directly from `SCHEDULED` to `COMPLETED`, or from `COMPLETED` to `ACTIVE` / `CANCELLED`, is rejected with `INVALID_STATE_TRANSITION` (`HTTP 400`).
- **Idempotency**:
  - Duplicate calls to start an already `ACTIVE` trip, end an already `COMPLETED` trip, or cancel an already `CANCELLED` trip succeed and return the current state idempotently without creating duplicates or throwing errors.
- **Resource Concurrency Invariants**:
  - A bus cannot operate multiple concurrent active trips.
  - A driver cannot operate multiple concurrent active trips.
  - Conflicts trigger `CONFLICT` (`HTTP 409`).

### 2. High-Frequency GPS Ingestion & Quality Filters (Production Standard 17)

All incoming GPS telemetry (`POST /api/v1/locations/ingest`) is treated as untrusted input:

1. **Geographic Boundaries**: Latitude must fall within `[-90, 90]` and Longitude within `[-180, 180]`.
2. **Timestamp Freshness & Clock Skew**:
   - Drift into the future is restricted to a maximum of 60 seconds (accommodates minor device clock skew).
   - Stale telemetry older than 10 minutes is rejected to maintain spatial integrity.
3. **Plausibility & Anomaly Filters**:
   - Reported vehicle speed is validated: negative values are rejected, and values exceeding 120 km/h trigger validation rejection.
   - **Teleportation Jump Detection**: Calculated via the Haversine formula against the latest recorded location. If consecutive pings occur within 120 seconds with an implied velocity exceeding 160 km/h, the ping is rejected as an anomalous GPS jump.
4. **Ownership Verification**:
   - Drivers can only ingest location telemetry for trips assigned to them.
   - The targeted trip must be in `ACTIVE` status.

### 3. Real-Time Telemetry Streaming via Server-Sent Events (SSE)

- Implemented using NestJS `@Sse('trips/:tripId/stream')` backed by an in-memory RxJS `Subject<LiveLocationEvent>` in `LocationStreamService`.
- **Advantages over WebSockets for Phase 3**:
  - Unidirectional server-to-client streaming fits the real-time map viewing model perfectly.
  - Native browser support via standard `EventSource` with automatic reconnection and zero external client libraries.
  - Fully compatible with standard HTTP/HTTPS proxies, load balancers, and corporate firewalls without WebSocket handshake overhead.
- Clients receive structured events (`location_update`) carrying coordinates, speed, heading, accuracy, and vehicle metadata.

### 4. Stop Arrival & Departure Event Progress

- Stop progress is tracked via `StopEvent` records (`ARRIVED`, `DEPARTED`).
- Drivers or automated geofence listeners record events at `POST /api/v1/trips/:id/stops/:stopId/events`.
- Stop events are verified against the trip's assigned route stops.
- Event recording is idempotent: re-submitting an arrival event at the same stop returns the existing record without duplicates.
- The `GET /api/v1/trips/:id/stops` endpoint provides ordered route stops combined with recorded arrival and departure timestamps.

## Consequences

- Full lifecycle visibility into operational bus transit for students, parents, drivers, and fleet managers.
- Bulletproof defense against corrupted, fabricated, or severely skewed GPS readings.
- High-performance, lightweight real-time stream ready for immediate integration in Prem's mobile and web frontends.
- Exhaustive test suites covering state machine transitions, concurrent conflicts, anomaly detection, and ownership checks.
