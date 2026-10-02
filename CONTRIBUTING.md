# Contributing to NammaBus AI

All contributions to NammaBus AI must adhere to our [Elite Production Engineering Standard](file:///docs/architecture/ENGINEERING_STANDARD.md).

## Core Principles
1. **Correctness → Architecture → Security → Reliability → Maintainability → Testability → Performance → Developer Experience**
2. **Thin Controllers & Clean Domain Boundaries**: Business logic lives in domain services and pure domain functions, not HTTP controllers.
3. **Security by Default**: Validate inputs, enforce RBAC, verify resource ownership, never trust client-supplied IDs.
4. **Reliability & Idempotency**: State transitions must be validated; duplicate requests must not produce corrupted state.
5. **Observability**: Centralized structured logging with `requestId` correlation via `nestjs-pino`.

## Development Workflow
1. **Understand Requirement**: Review `PRD.md`, `ENGINEERING_STANDARD.md`, and relevant ADRs.
2. **Modular Design**: Place code inside domain modules (`apps/api/src/modules/<domain>/`).
3. **Validation & Error Handling**: Validate inputs with DTOs, use `AppException` for business exceptions.
4. **Structured Logging**: Use `nestjs-pino` logger, never log passwords, tokens, or personal identifiers.
5. **Quality Verification**:
   - `npm run format`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run test:e2e`

## Branching & Commits
- Branches: `feature/<name>`, `bugfix/<name>`, `chore/<name>`
- Commits: Conventional Commits format (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).

