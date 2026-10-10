# ADR-007: Production Notification Architecture, Stop Arrival & Smart Alerts

## Status
**ACCEPTED & IMPLEMENTED** (Production Baseline)

## Context & Problem Statement
Students using NammaBus AI need timely, reliable, and actionable answers to three critical questions:
1. **"Where is my college bus?"**
2. **"When will it reach my designated stop?"**
3. **"Has something unexpected happened that I should know about?"**

In campus transportation, naive notification implementations suffer from severe failure modes:
1. **Notification Storms / Spamming**: Sending push notifications on every GPS telemetry ping or small ETA fluctuation (e.g. oscillating between 9 min and 11 min in traffic) frustrates students and leads to app uninstalls or notification muting.
2. **False Arrival Detections**: Declaring stop arrival from a single noisy GPS point, jumping boundaries, or missing a stop because a bus quickly traversed a geofence without prolonged dwell time.
3. **Unreliable Duplication Safeguards**: Relying purely on volatile in-memory booleans that reset when server processes restart or fail across multi-instance clusters.
4. **Tight Provider Coupling**: Blocking real-time GPS ingestion or database transactions while waiting on synchronous Firebase Cloud Messaging (FCM) network round-trips.
5. **Token Leaks and Orphaned Registrations**: Exposing device tokens across user boundaries or endlessly retrying dead/unregistered mobile push tokens.

---

## Decision Drivers & Core Principles

1. **State Transition-Based Arrival Alerts (~10 Min Threshold)**:
   - ETA alerts trigger exclusively on forward upcoming stops when predicted travel time crosses below the configured threshold ($\le 10$ minutes).
   - Suppressed for stops already marked `PASSED` or where an `ARRIVED` event was already recorded.
   - Guarded against stale GPS ($> 120$s age) or `LOW` confidence predictions.
2. **Multi-Sample Geofence Stabilization for Stop Arrival**:
   - Geofence radius defaults to $50.0$ meters per authoritative stop record.
   - Requires consecutive qualifying telemetry samples ($\ge 2$) or stationary boarding speed ($< 15$ km/h) inside the geofence.
   - Automatically records `StopEvent` transitions (`ARRIVED` and subsequent `DEPARTED` upon exiting a $30$m buffer).
3. **Database-Level Persistent Deduplication**:
   - Every generated notification carries a deterministic `deduplicationKey` (e.g., `trip:${tripId}:stop:${stopId}:type:ETA_10_MIN`).
   - Backed by PostgreSQL unique constraint `@@unique([recipientId, deduplicationKey])`.
   - Protects against concurrent processing, network retries, and application restarts.
4. **Outbox & Asynchronous Push Dispatch Pattern**:
   - Notification records are persisted in the primary database before external push dispatch.
   - Provider calls to FCM are completely decoupled from database transactions and GPS ingestion threads.
   - Bounded retries with exponential backoff (up to 3 attempts).
   - Permanent FCM errors (`registration-token-not-registered`, `invalid-registration-token`) immediately deactivate the token.
5. **Dual-Channel Delivery: Real-Time SSE + Mobile Push (FCM)**:
   - Foreground applications receive instant in-app alerts via authenticated Server-Sent Events (`/api/v1/notifications/stream`).
   - Background mobile devices receive native push notifications via FCM.
6. **Data Minimization & Role-Based Privacy**:
   - Push notification payloads on lock screens omit sensitive personal data.
   - In emergency SOS events: administrators receive immediate detailed incident telemetry; subscribed students receive general operational delay advisories without causing panic.
   - Device tokens are masked in server logs (`***...1234`).

---

## Architectural Workflow

```text
[Driver Mobile App]
       │ GPS Telemetry Ping (Lat, Lon, Speed, Accuracy, Timestamp)
       ▼
[LocationsService] (Validation, Deduplication, Persistence)
       ├──► [LocationStreamService] (SSE broadcast to live map clients)
       │
       ├──► [StopArrivalDetectorService]
       │         │ Checks GPS Accuracy (≤ 50m) & Freshness (≤ 120s)
       │         │ Geofence Evaluation & Consecutive Sample Stabilization
       │         ├── Stop Arrived? ──► Records StopEvent (ARRIVED) in PostgreSQL
       │         │                     └──► Calls NotificationsService.handleStopArrival()
       │         └── Stop Departed? ──► Records StopEvent (DEPARTED) in PostgreSQL
       │
       └──► [EtaService] (Deterministic Baseline ETA Recalculation)
                 │
                 ▼
       [EtaAlertEvaluatorService]
                 │ Checks ETA Status (Reject STALE / LOW confidence)
                 │ Upcoming Stop ETA ≤ Threshold (10 mins)?
                 └──► Calls NotificationsService.handleEtaThresholdAlert()
                           │
                           ▼
                 [NotificationsService]
                           ├── Validates User Notification Preferences
                           ├── Evaluates Database Deduplication Key
                           ├── Persists Notification in PostgreSQL
                           ├── Emits Real-time SSE to [NotificationStreamService]
                           └── Invokes Asynchronous [NotificationDispatchService]
                                     └──► [FirebasePushService] (FCM HTTP v1 / Mobile Push)
```

---

## Database Model Changes

1. **`Notification`**:
   - Added `readAt DateTime?`
   - Added `deduplicationKey String?`
   - Added `@@unique([recipientId, deduplicationKey])`
2. **`DeviceToken`**:
   - Token lifecycle with `userId`, `token` (unique), `platform`, `deviceModel`, `isActive`, `lastUsedAt`.
   - Token reassignment support for device ownership transfers.
3. **`NotificationDelivery`**:
   - Tracks delivery status per recipient device (`PENDING`, `SENT`, `FAILED`).
   - Records attempt count, `lastError`, and provider message ID.
4. **`NotificationPreference`**:
   - Granular student preferences: `etaAlertsEnabled`, `arrivalAlertsEnabled`, `tripLifecycleAlertsEnabled`, `incidentAlertsEnabled`.
5. **`StopEvent`**:
   - Added `@@unique([tripId, stopId, eventType])` ensuring strict idempotency for stop arrival and departure events.

---

## REST API Contracts (`/api/v1/notifications`)

| Method | Endpoint | Description | Role / Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/notifications/devices` | Register/refresh FCM device token | Authenticated User |
| `DELETE` | `/api/v1/notifications/devices` | Unregister FCM device token | Authenticated Owner |
| `GET` | `/api/v1/notifications` | Paginated notification history | Authenticated User |
| `GET` | `/api/v1/notifications/unread-count`| Unread notification badge count | Authenticated User |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark single notification as read | Recipient Owner |
| `POST` | `/api/v1/notifications/mark-all-read`| Mark all user notifications as read | Authenticated User |
| `GET` | `/api/v1/notifications/preferences` | Retrieve notification preferences | Authenticated User |
| `PUT` | `/api/v1/notifications/preferences` | Update notification preferences | Authenticated User |
| `POST` | `/api/v1/notifications/broadcast` | Operational announcements | `ADMIN` only |
| `GET` | `/api/v1/notifications/stream` | Real-time SSE notification stream | Authenticated User |

---

## Verification & Automated Test Coverage

The implementation includes 29 specialized unit and integration tests covering:
1. **ETA Threshold Alerts**:
   - Crossing below 10-minute threshold triggers alert.
   - Repeated ETA updates with values below threshold do NOT trigger duplicate alerts.
   - Stale GPS and low-confidence estimations suppress threshold alerts.
   - Passed stops are ignored.
2. **Stop Arrival Detection**:
   - Geofence entry with low speed triggers arrival and records `StopEvent`.
   - Fast moving vehicles require consecutive stabilized pings.
   - Inaccurate GPS ($> 50$m) and stale timestamps ($> 120$s) skip arrival evaluation.
   - Stops with existing arrival events are not re-triggered.
   - Departure events recorded when exiting geofence buffer.
3. **Device Token Management**:
   - Reassignment of existing tokens on user login.
   - Ownership enforcement preventing cross-user token deletion.
   - Automatic deactivation upon FCM unregistered token responses.
   - Token masking in structured logs.
4. **Delivery & Anti-Spam**:
   - IN_APP fallback when no mobile devices registered.
   - Multi-device independent delivery and partial failure isolation.
   - Exponential backoff retries on retryable provider errors.
