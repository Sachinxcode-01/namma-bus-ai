# Architecture Decision Record (ADR) 002: Phase 1 Authentication & RBAC Architecture

## Status
Accepted

## Context
NammaBus AI requires a secure, production-grade identity, authentication, and role-based authorization system supporting three core personas: Students, Drivers, and Administrators. Real-time bus tracking and route management are sensitive operational workflows, so the platform must enforce strict least-privilege access, prevent user enumeration, guard against token replay attacks, and prevent client-supplied identifier forgery.

## Decisions

### 1. Cryptography & Password Hashing
- **Password Hasher Contract**: Built around `IPasswordHasher` interface adhering to the Dependency Inversion Principle.
- **Algorithm**: Node standard library `crypto.scrypt` with a cryptographically secure 16-byte random salt per user and 64-byte key length.
- **Timing-Attack Resistance**: Verification uses `crypto.timingSafeEqual` over buffers to prevent side-channel timing attacks.
- **Format**: `scrypt$<saltHex>$<derivedKeyHex>`.

### 2. Token Architecture & Rotation
- **Access Tokens**: Short-lived (default 15 minutes), signed with `JWT_ACCESS_SECRET`. Payloads contain minimal necessary identity claims (`sub`, `email`, `role`, `studentId`, `driverId`).
- **Refresh Tokens**: Long-lived (7 days), generated as 40-byte high-entropy random hex strings.
- **Refresh Token Storage & Hashing**: Tokens are SHA-256 hashed before storage in the PostgreSQL `refresh_tokens` table. Plaintext refresh tokens are never persisted.
- **Single-Use Rotation**: Using a refresh token automatically revokes it and issues a newly generated token pair. Reusing a revoked token fails immediately.

### 3. Role-Based Access Control (RBAC) & Guards
- **User Roles**: `STUDENT`, `DRIVER`, `ADMIN` defined centrally in Prisma schema and shared types.
- **`@Roles(...)` & `RolesGuard`**: Applied at controller or endpoint level to enforce authorization constraints. Rejections return HTTP 403 `FORBIDDEN` standard error envelopes.
- **`@CurrentUser()`**: Strongly-typed decorator extracting claims from the validated JWT payload rather than trusting client-supplied IDs in request parameters or bodies.
- **Resource Ownership**: Endpoints like `GET /api/v1/users/:id` verify that non-administrators may only query their own account.

### 4. Abuse Protection & Rate Limiting
- **In-Memory Sliding Window**: Route-level `@RateLimit({ ttlMs, limit })` decorator paired with `RateLimitGuard`.
- **IP Isolation**: Bucketed by client IP with automated periodic cleanup of expired buckets via non-blocking unreferenced interval timers.
- **Telemetry**: RFC-compliant `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers. Returns HTTP 429 `TOO_MANY_REQUESTS`.
- **Zero Additional Infrastructure**: Provides essential brute-force protection without introducing Redis complexity prematurely.

### 5. Audit Logging & Secret Sanitization
- **`AuditLogService`**: Centralized service emitting structured events to both the database `audit_logs` table and Pino structured logger.
- **Automated Recursive Redaction**: Strictly sanitizes sensitive keys (`password`, `currentPassword`, `newPassword`, `token`, `refreshToken`, `accessToken`, `authorization`, `passwordHash`) before recording or logging to prevent credential leakage.

### 6. Compromised Refresh Token Breach Mitigation
- **Family Revocation**: If a previously revoked refresh token is presented at `/api/v1/auth/refresh`, the system identifies a token theft breach, immediately revokes ALL refresh tokens belonging to that user, records an `AUTH_TOKEN_REUSE_DETECTED` audit alert, and rejects the request.

### 7. Password Management & Session Revocation
- **Password Change**: `POST /api/v1/auth/change-password` requires the current password and validates strong complexity rules for the new password.
- **Global Session Invalidation**: Upon changing passwords or calling `POST /api/v1/auth/logout-all`, all active refresh tokens for the user are revoked.

### 8. Module Boundaries & Data Isolation
- `AuthModule` owns authentication lifecycle (`login`, `register/student`, `register/driver`, `refresh`, `logout`, `logout-all`, `change-password`, `me`).
- `UsersModule` owns user retrieval and administration (`users` listing with pagination, status toggling, admin-controlled user creation).
- Direct Prisma queries are quarantined inside `AuthRepository` and `UsersRepository`. Controllers remain thin.

## Consequences
- Full compliance with the 25 Elite Production Engineering Standards.
- Zero external C++ native build tool dependencies for password hashing.
- Immune to user enumeration: invalid emails and bad passwords return identical generic `UNAUTHORIZED` responses.
- Refresh token database records remain unreadable even in the event of database exfiltration.
- Automatic mitigation against compromised refresh token replay attacks via family revocation.
- Comprehensive unit (27 tests) and e2e integration test coverage (24 tests).
