# Architecture Decision Record (ADR) 003: Phase 2 Transport Management Architecture

## Status

Accepted

## Context

NammaBus AI requires core operational transport modeling and management covering five interdependent domains: Fleet Buses, Stops & Geofencing, Sequential Routes, Driver profiles, and Student subscriptions. These entities establish the physical and logical network over which active trips, real-time GPS tracking, ETA calculations, and safety notifications will operate in Phases 3 and 4.

## Decisions

### 1. Domain Separation & Modular Monolith

The transport core is divided into five cohesive modules under `apps/api/src/modules/`:

- `buses`: Fleet vehicle inventory, capacity tracking, vehicle registration, and active trip linkage.
- `stops`: Designated bus stops with geographic coordinates (`latitude`, `longitude`) and customizable arrival detection radius (`geofenceRadiusMeters`).
- `routes`: Operational bus transit routes with descriptive metadata and status.
- `drivers`: Driver profiles linked to User accounts, with commercial license tracking and phone numbers.
- `students`: Student directory with USN, contact info, and profile management.
- `subscriptions`: Student boarding stop subscriptions linked to designated routes.

### 2. Sequential Route Stops & Transactional Sequencing

- Route alignment is modeled via the `RouteStop` join entity (`routeId`, `stopId`, `sequenceOrder`, `estimatedMinutesFromStart`).
- Stopping sequences are enforced with composite unique constraints: `@@unique([routeId, sequenceOrder])` and `@@unique([routeId, stopId])`.
- Reordering and bulk stop assignment (`POST /api/v1/routes/:id/stops`) is executed inside an atomic database transaction (`$transaction`):
  1. Verifies that all referenced stops exist in the database.
  2. Ensures stop IDs and sequence orders are unique and non-overlapping.
  3. Replaces previous stop alignments atomically, preventing intermediate broken route states.

### 3. Subscription Verification & Route Membership

- Students subscribe to a specific boarding stop on a designated route (`POST /api/v1/subscriptions`).
- **Enforced Boundary**: The subscription service verifies that the selected stop is actively assigned to the designated route via `RouteStop`. Subscriptions to stops not on the selected route are rejected with `VALIDATION_ERROR` (HTTP 400).
- Duplicate subscriptions are prevented by the database composite constraint `@@unique([studentId, stopId, routeId])`. Re-subscribing to a deactivated subscription reactivates the record cleanly.

### 4. Integrity Protection on Deletions

- **Buses**: Deletion is rejected (`CONFLICT` HTTP 409) if any associated trip history exists (`countTrips > 0`). Fleet managers must deactivate buses (`isActive: false`) rather than delete them.
- **Routes**: Deletion is rejected if any associated trips exist.
- **Stops**: Deletion is rejected if the stop is currently used by any routes (`countRouteStops > 0`) or subscribed to by active students (`countSubscriptions > 0`).

### 5. Role-Based Access Control (RBAC)

- **Fleet & Route Mutators**: Creating, updating, and deleting buses, stops, routes, and route stops is strictly restricted to `UserRole.ADMIN`.
- **Driver Profiles**: Drivers may update their own contact details (phone, name). Only administrators can modify official commercial driver license numbers (`licenseNumber`).
- **Student Subscriptions**: Students can manage (create and cancel) their own route subscriptions. Administrators may manage subscriptions on behalf of any student.
- **Inspectors & Viewers**: All authenticated personas (`STUDENT`, `DRIVER`, `ADMIN`) can read active buses, stops, and sequenced routes.

## Consequences

- Clean, versioned REST API contracts under `/api/v1` ready for Prem's frontend applications (Student App, Driver App, Admin Dashboard).
- Guaranteed relational integrity and no orphaned records or broken geofence references.
- Safe deletion guards prevent accidental loss of operational audit and trip histories.
- Complete unit test coverage for each domain service with 100% mocked isolation.
