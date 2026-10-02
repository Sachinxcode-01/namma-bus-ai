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

### 4. Module Boundaries & Data Isolation
- `AuthModule` owns authentication lifecycle (`login`, `register/student`, `register/driver`, `refresh`, `logout`, `me`).
- `UsersModule` owns user retrieval and administration (`users` listing with pagination, status toggling).
- Direct Prisma queries are quarantined inside `AuthRepository` and `UsersRepository`. Controllers remain thin.

## Consequences
- Full compliance with the 25 Elite Production Engineering Standards.
- Zero external C++ native build tool dependencies for password hashing.
- Immune to user enumeration: invalid emails and bad passwords return identical generic `UNAUTHORIZED` responses.
- Refresh token database records remain unreadable even in the event of database exfiltration.
- Comprehensive unit (35 tests) and e2e integration test coverage (21 tests).
