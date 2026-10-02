# NammaBus AI --- Product Requirements Document

**Product Name:** NammaBus AI\
**Tagline:** Smart student bus tracking, arrival prediction, and safety
alerts\
**Version:** 1.0\
**Project Type:** AI-enabled real-time college transport platform\
**Primary Pilot:** One college bus route with selected student stops

------------------------------------------------------------------------

## 1. Product Overview

NammaBus AI is a real-time college transport platform that allows
authorised students to see the live location of an active bus, receive
estimated arrival times (ETA), and get timely alerts before the bus
reaches a selected stop.

The system has three primary applications:

-   **Student App** --- live bus tracking, stop selection, ETA, alerts
    and status.
-   **Driver App** --- driver authentication, assigned route, Start
    Trip/End Trip, active GPS tracking and incident reporting.
-   **Admin Dashboard** --- buses, drivers, routes, stops, active trips,
    incidents, notifications and historical reports.

The product begins with deterministic GPS, route and ETA functionality.
Historical trip data is then used to improve ETA prediction and detect
unusual delays or route deviations.

------------------------------------------------------------------------

## 2. Core Problem

Students often do not know whether their bus is early, late, stopped,
delayed or cancelled. Static schedules cannot reflect real road
conditions.

Transport administrators also need a central operational view of active
buses, delays, route compliance, incidents and historical trip
performance.

NammaBus AI addresses:

-   Uncertain bus arrival times.
-   Students waiting unnecessarily or missing buses.
-   Repeated calls to drivers and transport staff.
-   Lack of immediate delay, breakdown and cancellation communication.
-   Lack of authorised live route visibility.
-   Lack of structured transport performance data.

------------------------------------------------------------------------

## 3. Product Goals

1.  Show live bus location to authenticated and authorised users.
2.  Predict bus arrival time at remaining stops.
3.  Send a one-time alert approximately 10 minutes before a selected
    stop.
4.  Notify users about meaningful delays, arrival, cancellation and
    breakdown events.
5.  Provide administrators with operational monitoring and management
    tools.
6.  Store structured trip history for analytics and future ML-based ETA
    prediction.
7.  Keep the system privacy-aware, secure and maintainable.
8.  Build the backend as a production-quality Node.js service even
    during local development.

------------------------------------------------------------------------

## 4. MVP Scope

### Student

-   Secure login.
-   Select an authorised bus and boarding stop.
-   View active bus on a map.
-   View route and stops.
-   View current bus status.
-   View ETA and last GPS update time.
-   Receive start, ETA, arrival, delay and cancellation notifications.

### Driver

-   Secure login.
-   View assigned bus and route.
-   Start Trip.
-   End Trip.
-   Active foreground GPS tracking.
-   Connection/tracking status.
-   Breakdown, delay and SOS reporting.

### Admin

-   Secure admin login.
-   Manage buses.
-   Manage drivers.
-   Manage routes.
-   Manage stops.
-   Assign driver/bus/route.
-   View active buses.
-   View trip history.
-   View incidents.
-   Send operational broadcast notifications.

### Explicitly deferred

-   Parent accounts.
-   QR/RFID boarding.
-   Weather/traffic-aware ETA.
-   Voice announcements.
-   Advanced anomaly detection.
-   Dedicated GPS hardware.
-   Multi-route production rollout.
-   ML ETA until sufficient historical data exists.

------------------------------------------------------------------------

## 5. End-to-End Workflow

``` text
Driver Login
    ↓
Start Trip
    ↓
Validate assigned bus + route
    ↓
Create active trip
    ↓
Driver phone begins foreground GPS tracking
    ↓
GPS updates reach Node.js backend / realtime layer
    ↓
Validate + normalise location
    ↓
Store latest location
    ↓
Route matching + stop progression
    ↓
ETA engine calculates remaining-stop ETA
    ↓
Notification rules evaluate eligible subscriptions
    ↓
10-minute alert is sent once per student + stop + trip
    ↓
Bus enters stop geofence
    ↓
Stop event is recorded
    ↓
Arrival notification is sent
    ↓
Trip history remains available for analytics
    ↓
Driver ends trip
    ↓
Tracking is stopped
```

------------------------------------------------------------------------

# 6. Technical Architecture

## 6.1 Architecture Principles

The implementation must follow:

-   Separation of concerns.
-   Modular architecture.
-   Dependency inversion where useful.
-   Explicit domain boundaries.
-   RESTful API conventions.
-   Consistent request/response contracts.
-   Centralised error handling.
-   Centralised structured logging.
-   Strong input validation.
-   Secure configuration management.
-   No secrets committed to Git.
-   Database access isolated from controllers.
-   Business logic isolated from HTTP transport.
-   Testable services.
-   Predictable naming conventions.
-   Small, focused modules.
-   No unnecessary abstraction.
-   No duplicated business logic.
-   No giant controller/service files.
-   No random utility-folder dumping.
-   No hard-coded environment-specific values.

------------------------------------------------------------------------

## 6.2 Backend Direction

**Primary backend:** Node.js + TypeScript.

Recommended production-oriented stack:

-   Node.js
-   TypeScript
-   NestJS
-   REST API
-   PostgreSQL
-   Prisma ORM
-   Redis where required for caching, rate limiting or transient state
-   Pino-based structured logging
-   OpenAPI/Swagger documentation
-   Zod/class-validator-compatible request validation strategy
-   JWT access/refresh authentication
-   Role-based access control
-   Firebase Cloud Messaging for push notifications
-   WebSocket/realtime channel only where live updates require it

The implementation should avoid introducing additional infrastructure
unless it solves a concrete requirement.

------------------------------------------------------------------------

# 7. Repository Architecture

The repository must remain clean and predictable.

Recommended top-level structure:

``` text
namma-bus-ai/
│
├── apps/
│   ├── api/
│   ├── student-app/
│   ├── driver-app/
│   └── admin-dashboard/
│
├── packages/
│   ├── shared-types/
│   ├── api-contracts/
│   └── config/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   └── decisions/
│
├── infra/
│   ├── docker/
│   └── scripts/
│
├── .github/
│   └── workflows/
│
├── .env.example
├── .gitignore
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
└── PRD.md
```

The exact structure may be refined after inspecting the existing
repository, but the final structure must have a clear reason for every
major directory.

------------------------------------------------------------------------

# 8. Node.js API Architecture

The API must be versioned from the beginning.

Base URL:

``` text
/api/v1
```

Recommended resource structure:

``` text
/api/v1/auth
/api/v1/users
/api/v1/students
/api/v1/drivers
/api/v1/buses
/api/v1/routes
/api/v1/stops
/api/v1/trips
/api/v1/locations
/api/v1/eta
/api/v1/subscriptions
/api/v1/notifications
/api/v1/incidents
/api/v1/admin
/health
```

Example endpoints:

``` text
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/buses
GET    /api/v1/buses/:busId

GET    /api/v1/routes
GET    /api/v1/routes/:routeId/stops

POST   /api/v1/trips
POST   /api/v1/trips/:tripId/start
POST   /api/v1/trips/:tripId/end
GET    /api/v1/trips/:tripId

POST   /api/v1/locations
GET    /api/v1/buses/:busId/live-location

GET    /api/v1/trips/:tripId/eta

POST   /api/v1/subscriptions
DELETE /api/v1/subscriptions/:subscriptionId

GET    /api/v1/notifications
POST   /api/v1/notifications/broadcast

POST   /api/v1/incidents
GET    /api/v1/incidents

GET    /health
GET    /health/ready
```

API rules:

-   Use nouns for resources.
-   Use HTTP methods correctly.
-   Use consistent status codes.
-   Use pagination for collection endpoints where needed.
-   Use query parameters for filtering/sorting.
-   Validate path, query and body parameters.
-   Never expose database internals directly.
-   Return a consistent API response/error shape.
-   Include request/correlation IDs.
-   Document public endpoints with OpenAPI.

------------------------------------------------------------------------

# 9. Suggested Backend Module Structure

The API should use feature/domain-oriented modules rather than one giant
`controllers`, `services` and `utils` directory.

Example:

``` text
apps/api/src/
│
├── main.ts
├── app.module.ts
│
├── config/
│   ├── env.config.ts
│   ├── database.config.ts
│   └── firebase.config.ts
│
├── common/
│   ├── errors/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── middleware/
│   ├── pipes/
│   ├── logging/
│   ├── pagination/
│   └── types/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── students/
│   ├── drivers/
│   ├── buses/
│   ├── routes/
│   ├── stops/
│   ├── trips/
│   ├── locations/
│   ├── eta/
│   ├── subscriptions/
│   ├── notifications/
│   ├── incidents/
│   └── admin/
│
├── integrations/
│   ├── firebase/
│   ├── maps/
│   └── notifications/
│
└── prisma/
    ├── schema.prisma
    └── migrations/
```

A module should contain only what belongs to that domain, for example:

``` text
modules/trips/
├── trips.controller.ts
├── trips.service.ts
├── trips.repository.ts
├── trips.module.ts
├── dto/
├── entities/
├── guards/
└── types/
```

------------------------------------------------------------------------

# 10. Database

Primary database:

**PostgreSQL**

Core entities:

``` text
users
students
drivers
buses
routes
stops
trips
live_locations
stop_events
subscriptions
notifications
incidents
refresh_tokens
audit_logs
```

Important requirements:

-   Proper primary keys.
-   Foreign keys.
-   Unique constraints.
-   Indexes for high-frequency queries.
-   Timestamps.
-   Soft deletion only where justified.
-   Explicit status enums.
-   Transaction boundaries for multi-step state changes.
-   Migration-based schema management.
-   Seed data for local development.
-   No manual production schema editing.

------------------------------------------------------------------------

# 11. Realtime Location Architecture

The driver device sends GPS information only during an active trip.

Location payload should include, where available:

``` text
busId
tripId
latitude
longitude
speed
heading
accuracy
timestamp
```

The backend must:

1.  Authenticate the driver.
2.  Verify the driver is authorised for the trip.
3.  Verify the trip is active.
4.  Validate coordinate ranges.
5.  Reject clearly invalid/stale payloads.
6.  Store/update the latest location.
7.  Record historical points according to the retention strategy.
8.  Update route/stop state.
9.  Recalculate ETA when appropriate.
10. Emit realtime updates to authorised clients.

The system must not continue tracking after an active trip ends.

------------------------------------------------------------------------

# 12. ETA Architecture

## Phase 1 --- Deterministic ETA

Use:

``` text
ETA = remaining route distance / estimated route speed
```

Apply sensible speed bounds and handle stale GPS.

## Phase 2 --- Historical ETA

Store actual segment travel times and calculate averages by:

-   Route.
-   Route segment.
-   Day of week.
-   Time window.

## Phase 3 --- ML ETA

After enough real trips exist:

-   Build a reproducible dataset.
-   Train a regression model.
-   Compare against deterministic baseline.
-   Measure MAE.
-   Store model version and evaluation results.
-   Never claim improved accuracy without measured evidence.

Potential features:

-   Route ID.
-   Next stop.
-   Remaining distance.
-   Current speed.
-   Rolling average speed.
-   Stops remaining.
-   Day/time.
-   Historical segment duration.
-   Current delay.

------------------------------------------------------------------------

# 13. Notification System

Notification delivery must be treated as a backend workflow, not
scattered calls inside controllers.

Notification types:

-   Trip started.
-   10-minute ETA.
-   Stop reached.
-   Delay.
-   Cancellation.
-   Breakdown.
-   Route anomaly.

Anti-spam rules:

-   One 10-minute alert per student + stop + trip.
-   Do not resend unchanged alerts.
-   Delay alerts only after a material ETA change.
-   Do not trigger ETA notifications from stale GPS.
-   Keep notification delivery state.
-   Make notification processing idempotent.

------------------------------------------------------------------------

# 14. Logging and Observability

Logging is a first-class requirement.

Use structured JSON logs in production-style environments.

Every request should support:

``` text
requestId
timestamp
level
service
environment
method
path
statusCode
durationMs
userId (when safe)
errorCode (when applicable)
```

Log levels:

``` text
debug
info
warn
error
fatal
```

Rules:

-   Never log passwords.
-   Never log JWTs.
-   Never log private keys.
-   Never log unnecessary student personal data.
-   Never log raw authentication credentials.
-   Use structured fields instead of string concatenation.
-   Use correlation/request IDs across workflows.
-   Centralise exception logging.
-   Keep application logs separate from audit logs where appropriate.

Development should provide readable local logs while preserving
structured fields.

------------------------------------------------------------------------

# 15. Error Handling

Use one consistent error format.

Example:

``` json
{
  "success": false,
  "error": {
    "code": "TRIP_NOT_ACTIVE",
    "message": "The requested trip is not active.",
    "requestId": "req_123"
  }
}
```

Requirements:

-   Central global exception handling.
-   Stable machine-readable error codes.
-   Safe user-facing messages.
-   Internal stack traces only in controlled logs.
-   Correct HTTP status codes.
-   Validation errors must identify invalid fields.
-   Do not leak database or infrastructure details.

------------------------------------------------------------------------

# 16. Authentication and Authorisation

Roles:

``` text
STUDENT
DRIVER
ADMIN
```

Requirements:

-   Short-lived access token.
-   Secure refresh-token strategy.
-   Password hashing if password authentication is used.
-   Role-based guards.
-   Resource-level authorisation.
-   Driver can only control assigned/authorised trips.
-   Student can only access authorised transport information.
-   Admin can manage operational resources.
-   Revoke/rotate refresh tokens appropriately.
-   Never store plaintext passwords.

------------------------------------------------------------------------

# 17. Configuration and Secrets

All environment-specific values must be configuration-driven.

Example:

``` env
NODE_ENV=development
PORT=4000

DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

REDIS_URL=

LOG_LEVEL=info
```

Rules:

-   `.env` must never be committed.
-   `.env.example` must document required variables without real
    secrets.
-   Validate environment variables at application startup.
-   Fail fast when required configuration is missing.
-   Never hard-code API keys or secrets.
-   Keep local, test and production configuration separate.

------------------------------------------------------------------------

# 18. Security Requirements

-   HTTPS in deployed environments.
-   CORS configured explicitly.
-   Rate limiting for sensitive endpoints.
-   Request body size limits.
-   Input validation.
-   Authentication on protected routes.
-   Authorisation on protected resources.
-   Secure HTTP headers.
-   Dependency vulnerability checks.
-   No secrets in source control.
-   Audit logs for sensitive admin actions.
-   Minimal personal-data collection.
-   Defined location-data retention.
-   No public live bus tracking.
-   Active-trip-only driver tracking.

------------------------------------------------------------------------

# 19. Testing Requirements

The project must not rely only on manual testing.

Minimum backend testing layers:

``` text
Unit tests
Integration tests
API/e2e tests
```

Important scenarios:

-   Login success/failure.
-   Role authorisation.
-   Start/end trip.
-   Invalid trip ownership.
-   GPS validation.
-   Stale GPS rejection.
-   ETA calculation.
-   Stop geofence handling.
-   Notification idempotency.
-   Duplicate notification prevention.
-   Database constraints.
-   Global error handling.
-   Health endpoints.

Every implemented feature should include appropriate tests before being
considered complete.

------------------------------------------------------------------------

# 20. Developer Workflow

Every implementation task must follow this sequence:

``` text
Understand requirement
    ↓
Inspect existing repository
    ↓
Identify affected modules
    ↓
Check existing conventions
    ↓
Design minimal change
    ↓
Implement
    ↓
Run formatter/linter
    ↓
Run type checks
    ↓
Run relevant tests
    ↓
Verify API contract
    ↓
Review logs/errors/security
    ↓
Update documentation
    ↓
Report exactly what changed
```

Do not blindly create duplicate files, modules, utilities or APIs.

------------------------------------------------------------------------

# 21. Local Development

The system must run cleanly on localhost.

Expected local services:

``` text
API:             http://localhost:4000
API Docs:        http://localhost:4000/docs
Health:          http://localhost:4000/health
PostgreSQL:      local/container
Redis:           local/container when required
```

The exact ports may be changed if the existing repository already uses
them.

The first implementation must establish a reliable local development
baseline before feature-heavy development begins.

------------------------------------------------------------------------

# 22. Documentation

Maintain:

``` text
README.md
PRD.md
docs/architecture/
docs/api/
docs/database/
docs/decisions/
```

Document important architectural decisions using lightweight ADRs where
useful.

README must explain:

-   Project overview.
-   Architecture.
-   Prerequisites.
-   Environment setup.
-   Installation.
-   Database setup.
-   Migration commands.
-   Seed commands.
-   Local run commands.
-   Test commands.
-   API documentation.
-   Troubleshooting.

------------------------------------------------------------------------

# 23. Definition of Done

A task is not complete merely because the code compiles.

A feature is complete only when:

-   Correct files/modules are used.
-   Architecture remains clean.
-   Types are correct.
-   Validation exists.
-   Authorisation exists where required.
-   Errors are handled consistently.
-   Logging is appropriate.
-   Tests pass.
-   Lint/typecheck pass.
-   No secrets are exposed.
-   API behaviour is documented.
-   Existing functionality is not unnecessarily broken.
-   The local application starts successfully.

------------------------------------------------------------------------

# 24. Implementation Strategy

## Phase 0 --- Architecture Foundation

Before building business features:

1.  Inspect repository.
2.  Establish Node.js + TypeScript backend structure.
3.  Establish module boundaries.
4.  Establish environment/configuration validation.
5.  Establish PostgreSQL + Prisma foundation.
6.  Establish global error handling.
7.  Establish structured logging.
8.  Establish request/correlation IDs.
9.  Establish API versioning.
10. Establish OpenAPI documentation.
11. Establish health/readiness endpoints.
12. Establish linting, formatting and testing.
13. Establish CI-ready scripts.
14. Document the architecture.

## Phase 1 --- Authentication

-   User model.
-   Roles.
-   Login.
-   Refresh token.
-   Logout/revocation.
-   RBAC.

## Phase 2 --- Transport Management

-   Buses.
-   Drivers.
-   Routes.
-   Stops.
-   Assignments.

## Phase 3 --- Trips and GPS

-   Start/end trip.
-   Live location ingestion.
-   Location validation.
-   Active trip state.
-   Route matching.

## Phase 4 --- ETA and Notifications

-   Deterministic ETA.
-   Stop geofencing.
-   Student subscriptions.
-   10-minute notification.
-   Delay/cancellation/breakdown notifications.

## Phase 5 --- Admin and Analytics

-   Live monitoring.
-   Trip history.
-   Incidents.
-   Reports.

## Phase 6 --- AI

-   Historical dataset.
-   Baseline evaluation.
-   ML ETA.
-   Anomaly detection.
-   Model versioning and measurement.

------------------------------------------------------------------------

# 25. Non-Negotiable Antigravity Development Rules

These rules apply to **every implementation prompt and every coding
task** for NammaBus AI:

1.  Treat this as a real production software project, not a demo-only
    project.
2.  Inspect the repository before modifying it.
3.  Preserve existing working functionality unless the task explicitly
    requires change.
4.  Never create duplicate architecture just because a similar module
    already exists.
5.  Keep files small, focused and logically grouped.
6.  Follow a consistent feature/domain-based architecture.
7.  Use Node.js + TypeScript for the backend.
8.  Use REST API conventions and `/api/v1` versioning.
9.  Keep controllers thin and business logic inside services/use cases.
10. Keep database access behind repositories/data-access boundaries
    where appropriate.
11. Centralise validation, errors, logging and configuration.
12. Use structured logging and request/correlation IDs.
13. Never expose secrets or hard-code credentials.
14. Validate all environment variables at startup.
15. Use consistent API response and error contracts.
16. Apply authentication and authorisation at the correct resource
    boundary.
17. Make important workflows idempotent.
18. Write tests for meaningful business logic and API behaviour.
19. Run formatter, linter, typecheck and relevant tests after
    implementation.
20. Do not mark a feature complete if verification has not been
    performed.
21. Keep documentation synchronized with architecture and API changes.
22. Prefer simple, maintainable solutions over unnecessary complexity.
23. Do not add libraries without a clear technical reason.
24. Do not rewrite unrelated code.
25. Before finishing each task, provide a concise summary of changed
    files, API changes, tests/checks run, and any remaining risks.

------------------------------------------------------------------------

# 26. First Development Milestone

The first coding milestone is **not** the student tracking UI.

The first milestone is to create a clean, production-grade local backend
foundation for NammaBus AI:

``` text
Node.js
+ TypeScript
+ NestJS
+ PostgreSQL
+ Prisma
+ structured logging
+ configuration validation
+ global error handling
+ API versioning
+ OpenAPI
+ health/readiness checks
+ testing
+ linting
+ formatting
+ clean module architecture
```

Only after this foundation is verified should feature development
proceed.

------------------------------------------------------------------------

## Final Product Direction

NammaBus AI should evolve from:

``` text
GPS Tracking
      ↓
Realtime Transport Platform
      ↓
Reliable ETA
      ↓
Historical Transport Intelligence
      ↓
Measured AI ETA + Anomaly Detection
```

The priority is **correctness, reliability, security and maintainability
first; AI second**.
