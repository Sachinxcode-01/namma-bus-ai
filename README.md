# NammaBus AI — Backend Platform

Smart student bus tracking, arrival prediction, and safety alerts for college transport systems.

---

## 1. Project Overview
NammaBus AI provides real-time college bus location tracking, deterministic and historical ETA calculation, geofence-based stop arrival events, and instant safety alerts for students, drivers, and transport administrators.

---

## 2. Technical Stack
- **Runtime**: Node.js (>= 20)
- **Language**: TypeScript (Strict mode)
- **Framework**: NestJS 10
- **Database**: PostgreSQL 16+
- **ORM**: Prisma 5
- **Logging**: Structured Pino Logging (`nestjs-pino`) with sensitive data redaction
- **Configuration**: Type-safe fail-fast validation using Zod
- **API Documentation**: OpenAPI / Swagger (`/docs`)
- **Containerization**: Docker Compose (PostgreSQL, Redis)

---

## 3. Architecture & Repository Structure

```text
namma-bus-ai/
│
├── apps/
│   └── api/                        # NestJS Core REST API Backend
│       ├── prisma/                 # Prisma schema and seed script
│       ├── src/
│       │   ├── common/             # Interceptors, Filters, Middleware, DTOs, Errors
│       │   ├── config/             # Zod environment validation & namespaces
│       │   ├── database/           # Prisma service and connection lifecycle
│       │   ├── logging/            # Pino structured logging module
│       │   ├── modules/
│       │   │   └── health/         # Liveness (/health) & Readiness (/health/ready)
│       │   ├── app.module.ts
│       │   └── main.ts             # Entrypoint: Security (Helmet), CORS, Swagger
│       └── test/                   # Unit, Integration and E2E Tests
│
├── docs/                           # Architecture Decision Records (ADRs), API & DB specs
├── infra/                          # Docker compose configurations for local development
├── packages/                       # Shared packages (e.g., shared-types)
├── .github/workflows/              # GitHub Actions CI
├── .env.example                    # Environment template
└── PRD.md                          # Source of Truth Product Requirements Document
```

---

## 4. Prerequisites
- **Node.js**: v20 or higher (`node -v`)
- **npm**: v10 or higher (`npm -v`)
- **Docker**: For local PostgreSQL instance (`docker compose`)

---

## 5. Quickstart & Local Development

### Step 1: Clone and Install Dependencies
```bash
cd namma-bus-ai
npm install
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env` in `apps/api/`:
```bash
cp .env.example apps/api/.env
```
Ensure the required variables are set:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET` (at least 16 characters)
- `JWT_REFRESH_SECRET` (at least 16 characters)

### Step 3: Start Local Database (PostgreSQL)
```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

### Step 4: Run Database Migrations & Seed
```bash
# Generate Prisma Client
npm run prisma:generate

# Apply Migrations
npm run prisma:migrate

# Seed Development Data
npm run prisma:seed
```

### Step 5: Start the API in Development Mode
```bash
npm run dev
```

The server will start at:
- **API Base**: `http://localhost:4000/api/v1`
- **Swagger Documentation**: `http://localhost:4000/docs`
- **Liveness Probe**: `http://localhost:4000/health`
- **Readiness Probe**: `http://localhost:4000/health/ready`

---

## 6. Testing, Linting & Verification

```bash
# Run unit tests
npm run test

# Run end-to-end (e2e) tests
npm run test:e2e

# Type check
npm run typecheck

# Lint check
npm run lint

# Format code
npm run format

# Production build
npm run build
```

---

## 7. API Design Conventions

### Base Prefix
All domain endpoints reside under `/api/v1`. Root exceptions exist only for `/health`, `/health/ready`, and `/docs`.

### Request Correlation
Every incoming request receives or carries an `X-Request-ID` header. This ID is attached to:
- HTTP Response headers (`X-Request-ID`)
- Structured application logs
- Standardized error envelopes

### Standard Response Envelope
```json
{
  "success": true,
  "data": { ... }
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found.",
    "requestId": "req_8f142c13d9a7413689fa2d89e2ba6438"
  }
}
```

---

## 8. Troubleshooting

- **Database Connection Refused**:
  Make sure Docker is running and PostgreSQL is healthy (`docker compose -f infra/docker/docker-compose.yml ps`).
- **Configuration Validation Error at Startup**:
  Review your `.env` file. Ensure `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` satisfy validation rules.
- **Port Conflict**:
  If port `4000` is already in use, update `PORT` in your `.env` file.
