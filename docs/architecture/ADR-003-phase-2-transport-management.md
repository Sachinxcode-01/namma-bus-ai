# ADR-003: Phase 2 - Transport Management (Buses, Stops, Routes, Drivers)

## Status
Accepted

## Context
NammaBus AI requires structured management of physical transit assets and spatial network data:
1. **Buses**: Fleet management with unique bus registration and internal fleet numbering, passenger capacity limits, and operational active toggling.
2. **Stops**: Spatial entities defined by geographical coordinates (latitude [-90, 90], longitude [-180, 180]) and configurable geofencing radii (10m - 500m).
3. **Routes & Sequencing**: Ordered transit itineraries linking stops with positive sequence indices (`sequenceOrder >= 1`) and estimated transit durations.
4. **Drivers**: Operator profiles associated with specific user accounts, holding unique commercial driving licenses and contact details.

## Decisions

### 1. Domain Separation & Repository Architecture
* Decomposed transport management into four isolated NestJS domain modules: `BusesModule`, `StopsModule`, `RoutesModule`, and `DriversModule`.
* Applied the Repository Pattern across all domains (`BusesRepository`, `StopsRepository`, `RoutesRepository`, `DriversRepository`), guaranteeing that controllers and domain services remain uncoupled from Prisma ORM implementation details.

### 2. Strict Geospatial & DTO Validation
* Validated GPS coordinates using class-validator `@Min(-90)` / `@Max(90)` for latitude and `@Min(-180)` / `@Max(180)` for longitude.
* Enforced positive capacity and geofence radius constraints with `@Min(10)` and `@Max(500)`.
* Enforced RFC4122 v4 UUID validation at both the HTTP routing layer via `ParseUUIDPipe` and within DTO payloads via `@IsUUID('4')`.

### 3. Atomic Route Stop Sequencing
* Stop reordering operations (`PUT /api/v1/routes/:id/stops/reorder`) are executed inside an atomic Prisma database transaction (`$transaction`).
* The transaction verifies route existence, checks stop validity, removes previous mappings, and reinserts the sequence atomically, eliminating partial sequencing states or sequence collisions.

### 4. Role-Based Access Control (RBAC)
* Fleet creation, stop configuration, route definition, and driver assignment endpoints are restricted exclusively to `ADMIN` users via `@Roles(UserRole.ADMIN)` and `RolesGuard`.
* Route listings, stop lookups, and bus schedules allow authenticated `STUDENT` and `DRIVER` users read access.

## Consequences
* High data integrity across spatial network topologies.
* Zero sequence drift or race conditions during dispatch route edits.
* Scalable foundation ready for Phase 3 (Real-Time GPS Trips & Live Telemetry Ingestion).
