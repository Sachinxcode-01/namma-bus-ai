# Database Architecture & Entity Specifications

## Engine
- **PostgreSQL 16+** managed with **Prisma ORM**.

## Core Entities
1. **users**: System credentials, role-based access (`STUDENT`, `DRIVER`, `ADMIN`), and account state.
2. **students**: Student profile linked to `users`, holding USN and contact data.
3. **drivers**: Driver profile linked to `users`, holding license numbers and contacts.
4. **buses**: Physical vehicle registration, fleet numbers, and capacity.
5. **routes**: Transport lines with codes, descriptions, and active status.
6. **stops**: Geographical bus stops with latitude, longitude, and geofence radii.
7. **route_stops**: Ordered sequence linking routes to stops with estimated stage minutes.
8. **trips**: Live transport operational runs with `SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELLED` states.
9. **live_locations**: Ingested high-frequency GPS telemetry (lat, lon, speed, heading, accuracy, timestamp).
10. **stop_events**: Geofence arrival and departure records.
11. **subscriptions**: Student subscriptions to specific route/stop combinations for alerts.
12. **notifications**: In-app and push notification audit trail.
13. **incidents**: Driver or staff reported issues (`BREAKDOWN`, `ACCIDENT`, `DELAY`, `SOS`).
14. **refresh_tokens**: Hashed token rotation store for JWT refresh flow.
15. **audit_logs**: Immutable trail for sensitive administrative and state operations.

## Database Migrations
Prisma CLI handles migration files in `apps/api/prisma/migrations/`:
```bash
npm run prisma:migrate
```
Client generation:
```bash
npm run prisma:generate
```
Development seed:
```bash
npm run prisma:seed
```
