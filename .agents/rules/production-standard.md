# Production Engineering Standard for Antigravity Agents

When designing, implementing, refactoring, or reviewing code for **NammaBus AI**, you MUST strictly adhere to the **25 Elite Production Engineering Standards**:

Refer to canonical documentation: [docs/architecture/ENGINEERING_STANDARD.md](file:///docs/architecture/ENGINEERING_STANDARD.md).

## Non-Negotiable Core Rules:
1. **Architecture Must Be Intentional**: Clear boundaries, high cohesion, low coupling, no arbitrary abstractions or files.
2. **Folder Structure Must Scale**: Keep business logic in domain modules (`apps/api/src/modules/<domain>/`), shared cross-cutting code in `common/`, infrastructure in `database/` and `config/`. No giant utils or god services.
3. **Domain-Driven Organization**: Domains (`auth`, `users`, `students`, `drivers`, `buses`, `routes`, `stops`, `trips`, `locations`, `eta`, `notifications`, `incidents`) are cleanly decoupled.
4. **Dependency Direction**: Business Logic -> Application Contracts -> Infrastructure Implementations.
5. **Thin Controllers**: Controllers only parse request, validate, check auth, call application use-case/service, and return response envelope. No business logic or SQL in controllers.
6. **Business Logic Must Be Testable**: Independent pure functions and unit-testable domain services (ETA formulas, geofencing, state machines).
7. **Database Access**: Prisma ORM, migrations, explicit transactions, index utilization, no raw unvalidated mutations, prevent N+1 queries.
8. **API Contract Quality**: Versioned under `/api/v1`, typed DTOs with `class-validator`, Swagger/OpenAPI documentation.
9. **Consistent Response Contract**: `{ success: true, data: T }` and `{ success: false, error: { code, message, requestId, details? } }`. No leaked internal stack traces or database errors.
10. **Error Handling Centralized**: `AppException` domain errors handled by `GlobalExceptionsFilter`.
11. **Logging Must Be Professional**: Structured JSON via `nestjs-pino`, include `requestId`, redact secrets and personal data.
12. **Security by Default**: Authentication, Role-based Authorization (RBAC), ownership verification, rate limiting, no trust on client-supplied user IDs.
13. **Configuration Discipline**: Strict Zod schema validation on application bootstrap; fail fast if environment variables are missing.
14. **No God Classes / God Modules**: Refactor oversized classes into cohesive single-purpose domain services.
15. **No Premature Over-Engineering**: Solid modular monolith first.
16. **Performance Awareness**: Efficient indexing, lean payloads, pagination, bounded calculations.
17. **Realtime GPS Engineering**: Untrusted external input! Validate bounds (-90..90, -180..180), accuracy, timestamps, speed plausibility, trip ownership.
18. **Idempotency**: Retries must not produce duplicate notifications, trip start events, or stop events.
19. **State Transitions**: Enforce strict finite state machines (e.g. `TripStatus: SCHEDULED -> ACTIVE -> COMPLETED / CANCELLED`). Reject illegal transitions.
20. **Testing Standard**: Happy path, edge cases, unauthorized scenarios, duplicate requests, stale data.
21. **Code Review Mindset**: Self-review every diff against senior engineering criteria before presenting completion.
22. **Change Discipline**: Small, focused edits. Never touch unrelated files.
23. **Document Architectural Decisions**: Record major choices in `docs/architecture/ADR-xxx.md`.
24. **Definition of Production-Ready**: Correct + Validated + Authorized + Secure + Tested + Observable + Maintainable + Documented + Error-handled + Performance-conscious.
25. **Final Rule**: Ensure any professional developer reading the code six months from now will immediately understand where it belongs, why it exists, how it works, how it fails, and how to safely modify it.
