# 🏆 ELITE PRODUCTION ENGINEERING STANDARD

NammaBus AI must be developed to the standard of a **professional production software codebase** that could be maintained by a real engineering team for years.

Do not optimize for simply making the feature work.

Optimize for:

**Correctness → Architecture → Security → Reliability → Maintainability → Testability → Performance → Developer Experience**

The codebase must remain clean as the project grows from MVP to a multi-module production platform.

---

## 1. ARCHITECTURE MUST BE INTENTIONAL

Do not create files or folders randomly.

Every major module, directory and abstraction must have a clear responsibility.

The architecture must provide:

* Clear boundaries between domains.
* High cohesion within modules.
* Low coupling between modules.
* Clear dependency direction.
* Separation of business logic from infrastructure.
* Separation of business logic from HTTP/API concerns.
* Separation of persistence from business rules.
* Reusable but controlled shared components.
* Easy testability.
* Easy future expansion.

**Do not create abstractions simply because they look architecturally sophisticated.**

Use abstraction when it provides a real engineering benefit.

---

## 2. FOLDER STRUCTURE MUST SCALE

You are responsible for designing the folder structure based on the actual repository and requirements.

Do not use a folder structure just because it is common in tutorials.

The final structure must make it immediately obvious to another developer:

* Where a feature belongs.
* Where business logic belongs.
* Where API routes belong.
* Where database access belongs.
* Where validation belongs.
* Where configuration belongs.
* Where integrations belong.
* Where shared infrastructure belongs.
* Where tests belong.

Avoid:

* Giant `utils` folders.
* Giant `services` folders containing unrelated business logic.
* Giant `controllers` folders containing unrelated domains.
* Random helper files.
* Duplicate modules.
* Deep nesting without purpose.
* Circular dependencies.
* Files with multiple unrelated responsibilities.

When the project grows, new functionality should have an obvious architectural home.

---

## 3. DOMAIN-DRIVEN ORGANIZATION

Organize major business functionality around meaningful domains.

Potential domains include:

* Authentication
* Users
* Students
* Drivers
* Buses
* Routes
* Stops
* Trips
* Locations
* ETA
* Notifications
* Incidents
* Administration

Do not tightly couple unrelated domains.

For example:

**Trip logic must not become dependent on notification implementation details.**

Instead, define clean interfaces/workflows between domains.

---

## 4. DEPENDENCY DIRECTION

Maintain a predictable dependency direction.

Business/domain logic must not become tightly coupled to:

* HTTP framework details.
* Database implementation details.
* Firebase implementation details.
* External map providers.
* Notification providers.

Where appropriate, use interfaces/contracts so infrastructure implementations can be replaced without rewriting business logic.

Example:

```text
Business Logic
      ↓
Application Contracts
      ↓
Infrastructure Implementations
```

Do not reverse this dependency direction unnecessarily.

---

## 5. THIN CONTROLLERS

Controllers/routes must remain thin.

Controllers should primarily handle:

```text
HTTP request
    ↓
Validation
    ↓
Authentication/Authorization
    ↓
Application service/use case
    ↓
HTTP response
```

Do NOT put:

* Complex business rules.
* Database queries.
* ETA algorithms.
* Notification workflows.
* Large conditional logic.

inside controllers.

If a controller becomes large, refactor the responsibility into the appropriate application/domain layer.

---

## 6. BUSINESS LOGIC MUST BE TESTABLE

Business rules must not depend directly on HTTP requests.

Examples:

* ETA calculation.
* Stop arrival detection.
* Trip state transitions.
* Notification eligibility.
* Delay detection.
* Route progression.
* GPS validation.

These should be independently testable.

A business rule should be testable without starting the entire application whenever practical.

---

## 7. DATABASE ACCESS

Never scatter raw database queries throughout controllers or unrelated services.

Database access must have clear ownership.

Requirements:

* Prisma as the ORM.
* Centralized database configuration.
* Explicit transaction boundaries.
* Proper indexes.
* Proper relationships.
* Migration-based schema changes.
* No hidden database mutations.
* No unnecessary queries.
* Avoid N+1 query patterns.
* Validate data at application boundaries.
* Preserve database integrity with constraints.

Database implementation details should not leak throughout the business layer.

---

## 8. API CONTRACT QUALITY

Treat the API as a contract between independent clients and the backend.

Every endpoint must have:

* Clear resource naming.
* Correct HTTP method.
* Validation.
* Authentication requirements.
* Authorization requirements.
* Request schema.
* Response schema.
* Error behavior.
* Appropriate status codes.
* OpenAPI documentation.

Use:

```text
/api/v1
```

from the beginning.

Do not casually rename existing API contracts after clients depend on them.

---

## 9. CONSISTENT RESPONSE CONTRACT

Use a predictable API response structure.

Success and failure responses must be consistent.

Errors must contain stable machine-readable codes.

Example:

```json
{
  "success": false,
  "error": {
    "code": "TRIP_NOT_ACTIVE",
    "message": "The requested trip is not active.",
    "requestId": "req_123"
  }
}
```

Do not expose:

* SQL errors.
* Stack traces.
* Internal file paths.
* Secrets.
* Infrastructure details.

---

## 10. ERROR HANDLING MUST BE CENTRALIZED

Do not implement random error-handling patterns across modules.

Establish:

* Global exception handling.
* Validation error handling.
* Domain/application error mapping.
* Infrastructure error mapping.
* Consistent HTTP responses.
* Structured error logging.

Errors should be:

**Expected → handled intentionally.**

**Unexpected → logged safely and returned with a generic response.**

---

## 11. LOGGING MUST BE PROFESSIONAL

Use centralized structured logging.

Every important workflow should be traceable.

Logs should support:

```text
requestId
timestamp
level
service
module
operation
userId where safe
tripId where appropriate
status
duration
errorCode
```

Never use random debugging logs as the permanent logging strategy.

Never log secrets or sensitive personal data.

Use appropriate log levels.

---

## 12. SECURITY BY DEFAULT

Security must be considered during implementation, not added later.

Every feature must be checked for:

* Authentication.
* Authorization.
* Input validation.
* Resource ownership.
* Rate limiting.
* Data exposure.
* Secret handling.
* Injection risks.
* Abuse scenarios.
* Logging/privacy concerns.

Follow least-privilege principles.

A user must only access resources they are authorized to access.

Never trust IDs supplied by the client without authorization checks.

---

## 13. CONFIGURATION DISCIPLINE

Never hard-code:

* API keys.
* Database URLs.
* JWT secrets.
* Firebase credentials.
* Environment-specific URLs.
* Production configuration.

All configuration must flow through a validated configuration system.

The application should fail fast if required configuration is missing.

---

## 14. NO GOD CLASSES / GOD MODULES

If a class, service, controller or module starts handling too many responsibilities, stop and refactor.

Avoid:

```text
BusService
```

becoming responsible for:

* Bus CRUD
* GPS
* ETA
* Notifications
* Drivers
* Routes
* Analytics

Break responsibilities into meaningful domains.

---

## 15. NO PREMATURE OVER-ENGINEERING

Production quality does NOT mean making the project unnecessarily complicated.

Do not add:

* Microservices without a real requirement.
* Message brokers without a real requirement.
* Multiple databases without justification.
* Complex design patterns without a real benefit.
* Excessive abstraction.
* Unnecessary dependencies.

Start with a strong modular architecture that can evolve later.

---

## 16. PERFORMANCE AWARENESS

Do not optimize blindly, but avoid obvious performance problems.

Pay attention to:

* Database query efficiency.
* Indexes.
* N+1 queries.
* Large payloads.
* Pagination.
* Repeated calculations.
* Unnecessary API calls.
* Unnecessary realtime events.
* Memory-heavy operations.

Realtime GPS workflows must be designed carefully because they can generate high request volume.

---

## 17. REALTIME GPS ENGINEERING

GPS data is untrusted external input.

Every location update must consider:

* Coordinate validity.
* Timestamp validity.
* Accuracy.
* Staleness.
* Impossible movement.
* Active trip ownership.
* Driver authorization.
* Duplicate updates.
* Rate/frequency limits.

Do not blindly accept every GPS payload.

---

## 18. IDEMPOTENCY

Important operations should be safe against duplicate requests.

Examples:

* Start trip.
* End trip.
* Send 10-minute alert.
* Record stop arrival.
* Create notification.
* Process GPS updates.

Design these workflows so retries do not accidentally create duplicate state or duplicate notifications.

---

## 19. STATE TRANSITIONS

Important entities should have explicit state transitions.

For example:

```text
Trip:
SCHEDULED
    ↓
ACTIVE
    ↓
COMPLETED
```

Invalid state transitions must be rejected.

Do not allow arbitrary status mutation from controllers.

Business rules should control state changes.

---

## 20. TESTING STANDARD

Do not treat tests as an afterthought.

For every meaningful feature ask:

```text
What is the happy path?
What can fail?
What input is invalid?
What happens when the user is unauthorized?
What happens when the database fails?
What happens when the request is duplicated?
What happens when data is stale?
```

Tests should cover real business behavior.

---

## 21. CODE REVIEW MINDSET

Before considering implementation complete, review your own changes as if you were a senior engineer reviewing a pull request.

Ask:

* Is this the correct module?
* Is the responsibility in the correct layer?
* Is anything duplicated?
* Is there unnecessary complexity?
* Can this fail silently?
* Can an unauthorized user access this?
* Can this create duplicate data?
* Is the API contract clear?
* Are errors handled?
* Are logs sufficient?
* Are tests meaningful?
* Did this introduce technical debt?

Fix issues before reporting completion.

---

## 22. CHANGE DISCIPLINE

When implementing a feature:

**Do not modify unrelated files.**

Prefer small, focused changes.

Before creating a new file, check whether an existing file/module already owns that responsibility.

Before creating a new dependency, check whether the repository already has an equivalent capability.

Before creating a new utility, search for existing implementations.

---

## 23. DOCUMENT ARCHITECTURAL DECISIONS

When a significant architectural decision is made, document:

* The problem.
* The decision.
* Why it was chosen.
* Alternatives considered.
* Consequences.

Future developers should be able to understand **why** the architecture looks the way it does.

---

## 24. DEFINITION OF PRODUCTION-READY

A feature is NOT production-ready merely because:

```text
It works once.
```

It is production-ready when it is:

```text
Correct
+ Validated
+ Authorized
+ Secure
+ Tested
+ Observable
+ Maintainable
+ Documented
+ Error-handled
+ Performance-conscious
```

---

## 25. FINAL RULE

At every stage of development, ask:

> **"If another professional developer joins this project six months from now, will they immediately understand where this code belongs, why it exists, how it works, how it fails, and how to safely modify it?"**

If the answer is no, improve the architecture before continuing.

**Never sacrifice long-term codebase quality merely to finish the current feature faster.**
