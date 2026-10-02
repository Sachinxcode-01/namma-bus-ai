# Architecture Decision Record (ADR) 001: Phase 0 Foundation Architecture

## Status
Accepted

## Context
NammaBus AI requires a production-grade, scalable, and maintainable backend platform for real-time student bus tracking, arrival predictions, and safety alerts. The system needs to establish foundational patterns for error handling, structured logging, configuration validation, database modeling, API versioning, and test automation before domain-specific features are implemented.

## Decisions

### 1. Technology Stack
- **Framework**: NestJS on Node.js with TypeScript in strict mode. NestJS provides enterprise-grade dependency injection, clear modular boundaries, and native support for middleware, interceptors, and pipes.
- **Database & ORM**: PostgreSQL with Prisma ORM. Prisma provides type-safe query generation, deterministic schema migrations, and declarative modeling.
- **Validation**: Centralized fail-fast environment validation using Zod. Global request payload validation via NestJS `ValidationPipe` with `class-validator` and `class-transformer` (stripping unknown properties and enforcing strict type conversion).
- **Structured Logging**: `nestjs-pino` backed by `pino`. Human-readable logs in development (`pino-pretty`) and structured JSON in production with automatic redaction of sensitive credentials (passwords, tokens, keys).
- **Request Correlation**: Dedicated `RequestIdMiddleware` generating or passing `X-Request-ID` across all HTTP boundaries, logs, and error responses.
- **API Versioning**: Prefix `/api/v1` for all domain resources with root exceptions for `/health`, `/health/ready`, and `/docs`.
- **Documentation**: Swagger / OpenAPI generated from code decorators at `/docs`.

### 2. Error and Response Contracts
All responses follow consistent envelopes:
- **Success**: `{ "success": true, "data": ... }`
- **Error**: `{ "success": false, "error": { "code": "...", "message": "...", "requestId": "..." } }`
Internal implementation details, raw database exceptions, and stack traces are suppressed in HTTP responses and only logged internally.

### 3. Repository Organization
A clean workspace structure is adopted:
```text
namma-bus-ai/
├── apps/
│   └── api/                # NestJS core backend service
├── packages/
│   └── shared-types/       # Common TypeScript definitions & envelopes
├── docs/                   # ADRs, API, and Database documentation
└── infra/                  # Docker compose & deployment helpers
```

## Consequences
- Clean separation between HTTP transport, domain services, and database persistence.
- Standardized error codes and correlation IDs simplify multi-client debugging (mobile, web, admin).
- Fail-fast configuration prevents accidental deployment with missing secrets.
- Full type-safety across database queries, application services, and API contracts.
