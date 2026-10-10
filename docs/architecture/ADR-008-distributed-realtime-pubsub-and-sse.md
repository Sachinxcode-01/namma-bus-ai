# ADR-008: Distributed Real-Time Pub/Sub and SSE Streaming Backbone

## Status
Accepted

## Context
NammaBus AI previously relied on an in-memory, single-instance RxJS Subject publish/subscribe pattern for streaming real-time events (vehicle GPS coordinates, dynamic arrival ETAs, and critical push notifications) across campus transit routes.

While sufficient for single-replica local development, this in-memory design suffered from critical production limitations:
1. **Multi-Instance Scaling Bottleneck**: GPS telemetry ingested by instance A was invisible to connected clients on instance B.
2. **Resource Exhaustion Risks**: SSE HTTP connections held open indefinitely without connection ceilings, lifetime bounds, or per-client/per-IP concurrency limits could exhaust node file descriptors.
3. **Stream Failure Modes**: Unhandled exceptions in SSE routes yielded HTTP 500 status codes after header commitment, crashing connection state without structured wire errors.
4. **Data Leakage Risks**: Driver PII and internal credentials could inadvertently leak in fleet-wide broadcasts.
5. **Failover Resilience**: Direct dependence on external caching brokers (such as Redis) could cause a total collapse of real-time transit visibility if the broker encountered temporary network partition or restarts.

## Decision

We have designed and implemented a production-grade, distributed real-time backbone architecture:

### 1. Unified Real-Time Bus Abstraction (`RealtimeBus`)
- Defined a contract in `apps/api/src/modules/realtime/interfaces/realtime-bus.interface.ts` exposing `publish<T>(channel, event)` and `subscribe<T>(channel): Observable<T>`.
- Standardized typed channels:
  - `nammabus:locations`
  - `nammabus:eta`
  - `nammabus:notifications`
  - `nammabus:incidents`
- Standardized wire event envelopes preserving 100% backward compatibility:
  - `location_update`, `fleet_location_update`
  - `trip_eta_updated`
  - `notification`
  - `ping`
  - `error`

### 2. Multi-Mode Provider with Circuit Breaker
- **`InMemoryRealtimeBus`**: Low-overhead, zero-dependency RxJS Subject broker with per-channel isolation, automatic handler error containment, and clean lifecycle disposal.
- **`RedisRealtimeBus`**: Multi-instance pub/sub powered by `ioredis` with dual client architecture (`pubClient` and `subClient`).
- **Resilient Circuit Breaker**:
  - Automatically trips after 3 consecutive Redis connection failures or publishing faults.
  - Transparently falls back to `InMemoryRealtimeBus` when the circuit is `OPEN`, ensuring local subscribers never lose updates.
  - Probes Redis health with a 60-second recovery timer, testing connection viability before closing the circuit.
  - Prevents double delivery when operating in fallback mode.

### 3. Hardened SSE Connection Lifecycle and Security
- **`SseRateLimitGuard`**:
  - Enforces strict concurrency limits per authenticated user (`SSE_MAX_CONCURRENT_PER_USER`, default: 3) and per IP address (`SSE_MAX_CONCURRENT_PER_IP`, default: 10).
  - Immediately rejects requests exceeding limits with HTTP `429 Too Many Requests`.
  - Attaches to `res.on('close')` socket lifecycle hooks to accurately decrement active connection counters upon client disconnect or network abort.
- **Bounded Stream Lifetimes**:
  - Enforces a maximum connection duration (`SSE_MAX_CONNECTION_LIFETIME_MS`, default: 15 minutes) using RxJS `takeUntil(timer(lifetimeMs))`.
  - Clients gracefully disconnect and automatically reconnect using exponential backoff with random jitter.
- **Periodic Heartbeats**:
  - Dispatches keep-alive ping frames every 15-20 seconds to prevent aggressive proxy/NAT gateway timeouts.
- **Role-Based Authorization & Input Sanitization**:
  - Strict `@Roles(Role.ADMIN, Role.DISPATCHER)` guard on `/api/v1/locations/fleet/stream`. Non-privileged students receive `403 Forbidden`.
  - `RouteCodeValidationPipe` enforces regex `^[A-Z0-9-]{2,16}$` to prevent injection attacks.
  - Data minimization ensures driver credentials and sensitive personal data are never serialized into location or ETA payloads.

### 4. Wire-Level Exception Handling (`SseExceptionFilter`)
- When exceptions occur in SSE stream pipelines, `SseExceptionFilter` formats and writes a structured SSE frame:
  ```text
  event: error
  data: {"statusCode": 400, "errorCode": "INVALID_STREAM_PARAMETER", "message": "...", "timestamp": "..."}
  ```
- Terminates the response cleanly without crashing the NestJS application or corrupting connection state.

### 5. Frontend Streaming and Resilience (`packages/api-client` & `apps/admin-dashboard`)
- Standardized API client endpoints for streams:
  - `api.realtime.getFleetStreamUrl()`
  - `api.realtime.getTripEtaStreamUrl(tripId)`
  - `api.realtime.getHealth()`
  - `api.realtime.broadcastIncident(payload)`
- Modern React hooks:
  - `useFleetStream`: Subscribes to fleet telemetry with status tracking (`connecting`, `live`, `stale`, `error`), stale connection detection (>45s inactivity), and jittered exponential backoff auto-reconnect.
  - `useTripEtaStream`: Subscribes to dynamic trip ETA calculations with live countdown and fallback caching.

## Consequences

### Positive
- Full horizontal scaling support across container replicas with zero client code changes.
- High resilience against Redis downtime through transparent in-memory fallback.
- Protection against denial-of-service and file descriptor leaks via connection rate limiting and lifecycle caps.
- Strict authorization and data minimization preventing unauthorized tracking or data leakage.

### Trade-offs & Mitigations
- In multi-instance deployments where Redis is unavailable, fallback to in-memory mode operates per-instance until Redis recovers.
- Reconnections after the 15-minute ceiling require client-side exponential backoff, which is fully implemented in `useFleetStream` and `useTripEtaStream`.
