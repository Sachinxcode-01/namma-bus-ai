# ADR-006: Production ETA Engine & Arrival Prediction Architecture

## Status
**ACCEPTED & IMPLEMENTED** (Production Baseline)

## Context & Problem Statement
With trustworthy GPS ingestion and real-time location tracking established in NammaBus AI, the core product challenge is answering the primary student inquiry:
> **"When will my college bus reach my stop?"** (e.g. Bus 07 on Hulkoti → Gadag line reaching Stop 6 in ~14 mins).

Naïve implementations frequently suffer from critical flaws:
1. Calculating straight-line Euclidean distance divided by instantaneous speed, ignoring physical road geography and sequence constraints.
2. Dividing by zero when a bus halts at a red light or stop, yielding infinite ETAs or absurd numerical jumps (e.g., oscillating wildly between 3 min and 25 min every few seconds).
3. Failing to handle buses that have already passed the student's stop, displaying misleading optimistic arrival times.
4. Prematurely claiming "AI/ML" prediction without a reliable, explainable, and measurable deterministic baseline.
5. Incurring paid vendor lock-in (e.g., mandatory Google Maps Platform Distance Matrix billing) rather than using local route geometry or self-hosted OpenStreetMap/OSRM.

## Decision Drivers
- **Deterministic Baseline First**: Provide explainable, mathematically provable arrival times before applying statistical or machine learning models.
- **Route-Aware Progression**: Follow the authoritative route stop order (`sequenceOrder`). Travel distance must follow forward route segments, not geographic shortcuts.
- **Speed Validation & Fallback Hierarchy**: Handle stationary periods ($v < 5$ km/h), telemetry spikes ($> 100$ km/h), and missing speeds gracefully.
- **Stabilization & Smoothing**: Suppress jitter and wild minute oscillations using Exponential Weighted Moving Averages (EWMA) and dwell-time allowances.
- **Passed Stop Detection**: Explicitly mark traversed stops as `STOP_PASSED` with remaining ETA of 0 min.
- **Zero Mandatory Google Maps Platform Dependency**: Native high-precision spherical polyline calculations with optional OSRM integration behind an `IRoutingProvider` abstraction.
- **High-Concurrency Protection**: In-memory short-lived cache (5s TTL) to shield compute and database resources during morning rush-hour student refresh bursts.
- **Future ML & MAE Evolution**: Preserve all progression states, stop arrival geofence entries, and baseline predictions to enable Mean Absolute Error (MAE) benchmarking.

---

## Architectural Design

### 1. The Core Route Progression Pipeline
```text
Active Trip
    ↓
Latest Accepted GPS Location
    ↓
Authoritative Route Stops (sequenceOrder: 1, 2, ... N)
    ↓
Nearest Route Segment Projection (projectPointOnSegment)
    ↓
Current Position & Segment Progress (t ∈ [0, 1])
    ↓
Stop Classification:
    • Index ≤ CurrentSegment: PASSED (distanceRemaining = 0)
    • Within Stop Geofence: APPROACHING (eta = 0–1 min)
    • Next Forward Stop: NEXT
    • Subsequent Stops: UPCOMING
    ↓
Route Distance Remaining = Remaining On Active Segment + Intermediate Segments
    ↓
Travel Time Estimation = (Distance / Effective Speed) + (Intervening Stops × Dwell Time)
    ↓
Deterministic ETA Minutes & Arrival ISO Timestamp
    ↓
Status & Confidence Classification (HIGH / MEDIUM / LOW)
```

---

### 2. Speed Evaluation Hierarchy
GPS-reported speed fluctuates or drops to zero whenever the vehicle stops to pick up students or waits at traffic signals. The engine applies the following authoritative priority:

1. **Validated Moving Speed**: If $5.0 \le v \le 100.0\text{ km/h}$, apply EWMA smoothing:
   $$v_{\text{effective}} = \alpha \cdot \min(v_{\text{gps}}, 100.0) + (1 - \alpha) \cdot v_{\text{baseline}}$$
   with smoothing parameter $\alpha = 0.6$ and $v_{\text{baseline}} = 25.0\text{ km/h}$.
2. **Stationary Bus Fallback**: If $v < 5.0\text{ km/h}$ or speed is missing/unreliable:
   - Use route scheduled speed if `estimatedMinutesFromStart` is available on `RouteStop`.
   - Fall back to configured default fleet baseline ($25.0\text{ km/h}$ for semi-urban Karnataka college routes).
   - Tag state as stationary; preserve ETA stability without producing infinite estimates.

---

### 3. Stop Dwell Time Allowance
College buses do not travel unimpeded; each intermediate stop incurs passenger boarding and alighting delay.
The baseline incorporates:
$$\text{Dwell Allowance} = 45\text{ seconds (0.75 minutes) per intervening stop}$$
$$\text{ETA Minutes} = \left\lceil \frac{T_{\text{travel\_seconds}} + (\text{Intervening Stops} \times 45)}{60} \right\rceil$$

---

### 4. Status & Confidence Classification
To avoid false precision and misleading display on client applications, the engine outputs explicit status and qualitative confidence tiers:

#### Status Codes:
- `AVAILABLE`: Bus is active on route with fresh GPS telemetry.
- `APPROACHING`: Bus is within the stop geofence radius ($\le 50\text{m}$ arrival or $\le 250\text{m}$ approach).
- `STOP_PASSED`: Bus has already traveled past the requested stop along the route.
- `STALE`: GPS telemetry is between 120s and 300s old.
- `GPS_UNAVAILABLE`: Bus has no recorded coordinates or telemetry is older than 300s.
- `NO_ACTIVE_TRIP`: Trip is SCHEDULED, COMPLETED, or CANCELLED.
- `INSUFFICIENT_DATA`: Route lacks sufficient geometry or configured stops.

#### Confidence Tiers:
- **`HIGH`**: GPS age $\le 45\text{s}$, accuracy $\le 25\text{m}$, bus actively moving, route deviation $\le 300\text{m}$.
- **`MEDIUM`**: GPS age $45\text{s}–120\text{s}$, accuracy $25\text{m}–60\text{m}$, or stationary fallback speed active.
- **`LOW`**: GPS age $> 120\text{s}$ (stale), accuracy $> 60\text{m}$, or bus detected off-route ($> 300\text{m}$).

---

### 5. Routing Provider Abstraction
All distance and duration calculations are behind `IRoutingProvider`:
- **`LocalGeometryRoutingProvider`** (Default): Fast, zero-network, spherical polyline distance calculation using haversine math and segment projection. Fully offline, 0 cost, 0 dependencies.
- **`OsrmRoutingProvider`**: Configurable via `OSRM_BASE_URL` with 1500ms timeout and automatic circuit fallback to `LocalGeometryRoutingProvider`.
- **Google Maps Platform**: Not required. No proprietary billing dependencies introduced.

---

### 6. Caching & Real-Time Broadcast Integration
- **In-Memory Cache (`EtaCacheService`)**: 5000ms TTL per `(tripId, stopId)`. Eliminates redundant queries when hundreds of students view the same campus bus.
- **Real-Time SSE Event (`trip.eta.updated`)**: Distributed via `EtaStreamService` whenever:
  - Fresh GPS telemetry shifts ETA by $\ge 1.0\text{ minute}$.
  - Next stop transitions (e.g. Stop 2 $\to$ Stop 3).
  - Operational status transitions (e.g. `AVAILABLE` $\to$ `APPROACHING`).

---

### 7. Evolution Path to ML & MAE Validation
```text
Reliable GPS Telemetry (Phase 3)
         ↓
Route Context & Authoritative Ordering (Phase 3)
         ↓
Deterministic Baseline Engine (Current - Phase 4)
         ↓
Stop Arrival Events & Actual vs. Predicted Logging
         ↓
Mean Absolute Error (MAE) Benchmarking
         ↓
Segment-Level Historical Travel Time Profiling
         ↓
Machine Learning Predictive Models (Future Phase)
```

## Consequences & Verification
- 100% of ETA unit and integration test suites pass (24 suites, 202 tests).
- Zero TypeScript compiler warnings (`tsc --noEmit`).
- Clean ESLint and Prettier compliance.
- Verified compatibility with Flutter mobile student app (`TripEtaResponse` & `StopEtaDto`).
