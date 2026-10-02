<p align="center">
  <img src="docs/assets/banner.png" alt="NammaBus AI — Intelligent Campus Transit & Real-time Tracking Platform" width="100%" />
</p>

<p align="center">
  <strong>Next-Generation AI-Powered Campus Transit Tracking, Intelligent ETA Estimation & Student Safety Platform</strong>
</p>

<p align="center">
  <a href="https://github.com/Sachinxcode-01/namma-bus-ai/actions"><img src="https://img.shields.io/github/actions/workflow/status/Sachinxcode-01/namma-bus-ai/ci.yml?branch=main&style=for-the-badge&logo=github-actions&logoColor=white&label=CI%20Pipeline" alt="CI Status" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.3+-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://nestjs.com/"><img src="https://img.shields.io/badge/NestJS-10.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-16+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-5.10-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" /></a>
  <a href="https://docker.com/"><img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" /></a>
</p>

<p align="center">
  <a href="#-project-overview">Overview</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-architecture--system-design">Architecture</a> •
  <a href="#-technical-stack">Tech Stack</a> •
  <a href="#-repository-structure">Repository</a> •
  <a href="#-quickstart--local-development">Quickstart</a> •
  <a href="#-api-specifications--conventions">API Docs</a> •
  <a href="#-roadmap--milestones">Roadmap</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 📌 Project Overview

**NammaBus AI** is a real-time, intelligent student transportation platform designed specifically for colleges, universities, and enterprise campuses. It bridges the communication and visibility gap between student commuters, bus fleet operators, and institutional transport authorities.

By combining high-frequency GPS telemetry ingestion, predictive ETA modeling, automated geofence event triggers, and instant push safety alerts, NammaBus AI eliminates transit uncertainty and enhances campus security.

```
       [ Driver App / IoT Hardware ]
                     │ (GPS Pings / Telemetry)
                     ▼
        ┌─────────────────────────┐
        │   NammaBus Core API     │ ◄──► [ Redis In-Memory Geospatial Cache ]
        └────────────┬────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
[ PostgreSQL + Prisma ]   [ AI ETA & Geofencing Engine ]
         │                       │
         └───────────┬───────────┘
                     ▼
  [ Real-Time Updates & Notifications ]
     ├── 📱 Student Mobile PWA
     ├── 🖥️ Admin Monitoring Console
     └── 🔔 Instant Safety & SOS Alerts
```

---

## ⚡ Key Features

| Capability | Description |
| :--- | :--- |
| 🛰️ **Real-Time GPS Ingestion** | Sub-second telemetry ingestion pipeline supporting both in-vehicle mobile driver nodes and dedicated IoT GPS hardware modules. |
| 🧠 **Predictive ETA Engine** | Hybrid ETA estimation factoring in historical route runtimes, time-of-day traffic models, weather patterns, and real-time transit telemetry. |
| 📍 **Dynamic Geofence Alerts** | Automated trigger boundary radii around campus stops notifying waiting students 5–10 minutes prior to bus arrival. |
| 🛡️ **Student Safety & SOS** | Instant emergency beacon alerts with live coordinates pushed directly to campus security officers and administrators. |
| 📊 **Fleet Analytics & Diagnostics** | Transport coordinator dashboards tracking schedule adherence, speed threshold violations, idle times, and overcrowding telemetry. |
| 🔒 **Enterprise-Grade Security** | Hardened NestJS architecture with rate limiting, Helmet HTTP security headers, CORS protection, and encrypted JWT credential rotation. |

---

## 🏗️ Architecture & System Design

NammaBus AI adopts a clean, modular layer architecture built for high availability and low-latency geospatial queries:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│   Web Dashboard (Admin)  │  Student PWA Client  │  Driver Device App   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / WSS
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       GATEWAY & SECURITY LAYER                         │
│   • Request Correlation ID (X-Request-ID)   • Helmet Protection        │
│   • CORS White-listing                      • Zod Fail-Safe Config     │
│   • Global Exception Filter                 • Standard Response Format │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE APPLICATION SERVICES                       │
│   ├── Health & Readiness Probes (/health, /health/ready)               │
│   ├── Auth & Identity (RBAC: Student, Driver, Admin)                   │
│   ├── Telemetry & Fleet Tracking Service                               │
│   ├── Geofencing & Proximity Detection                                 │
│   └── ETA Prediction & AI Forecasting Service                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌─────────────────────────────────────┐   ┌──────────────────────────────┐
│        DATA PERSISTENCE             │   │       CACHING & PUBSUB       │
│  PostgreSQL 16+ via Prisma ORM      │   │  Redis Geospatial Index      │
│  • Buses, Routes, Stops             │   │  • Active Vehicle Locations  │
│  • Historical Trip Telemetry        │   │  • Low-latency ETA Lookups   │
│  • Audit Logs & Alert Events        │   │  • Pub/Sub Real-time Events  │
└─────────────────────────────────────┘   └──────────────────────────────┘
```

---

## 💻 Technical Stack

### Core Backend & Runtime
- **Runtime**: [Node.js](https://nodejs.org/) `>= 20.x` (LTS)
- **Language**: [TypeScript](https://www.typescriptlang.org/) `5.3+` (Strict Type Safety enabled)
- **Framework**: [NestJS 10](https://nestjs.com/) (Modular Dependency Injection & Decorator Architecture)

### Storage & In-Memory Cache
- **Primary Database**: [PostgreSQL 16+](https://www.postgresql.org/)
- **ORM & Migrations**: [Prisma 5](https://www.prisma.io/) with strict schema typing
- **Cache & Telemetry Index**: [Redis 7](https://redis.io/) (Planned Geospatial Coordinates Ingestion)

### Observability & Quality
- **Structured Logging**: [Pino](https://github.com/pinojs/pino) via `nestjs-pino` with automatic secret redaction
- **Configuration & Validation**: [Zod](https://zod.dev/) fail-fast schema validation at bootstrap
- **API Documentation**: [Swagger / OpenAPI 3.0](https://swagger.io/) auto-generated at `/docs`
- **Testing**: [Jest](https://jestjs.io/) & [Supertest](https://github.com/ladjs/supertest) for unit, integration, and e2e testing

---

## 📂 Repository Structure

The project is structured as a scalable monorepo-ready layout:

```text
namma-bus-ai/
│
├── .github/
│   └── workflows/
│       └── ci.yml                      # Automated lint, typecheck, test & build pipeline
│
├── apps/
│   └── api/                            # Core NestJS REST API application
│       ├── prisma/
│       │   ├── schema.prisma           # Relational schema (Users, Buses, Routes, Stops, etc.)
│       │   └── seed.ts                 # Idempotent development seeder
│       ├── src/
│       │   ├── common/                 # Reusable cross-cutting concerns
│       │   │   ├── constants/          # Application & error code constants
│       │   │   ├── dto/                # Standard API response envelopes
│       │   │   ├── errors/             # Domain exceptions
│       │   │   ├── filters/            # Global exception handling & normalization
│       │   │   ├── interceptors/       # Response transformation & timing
│       │   │   └── middleware/         # Request ID correlation (UUIDv4)
│       │   ├── config/                 # Zod environment schemas & validation logic
│       │   ├── database/               # Prisma service lifecycle integration
│       │   ├── logging/                # Structured Pino logger module
│       │   ├── modules/
│       │   │   └── health/             # Kubernetes-ready Liveness & Readiness checks
│       │   ├── app.module.ts           # Root NestJS application module
│       │   └── main.ts                 # Bootstrap: Helmet, CORS, Swagger, Validation
│       └── test/                       # E2E test suites (Health, Error Envelopes, Request IDs)
│
├── docs/                               # Project documentation & architectural blueprints
│   ├── assets/                         # Visual assets, banners, diagrams
│   ├── api/                            # OpenAPI JSON & Markdown exports
│   ├── architecture/                   # Architecture Decision Records (ADRs)
│   └── database/                       # ER diagrams and schema specifications
│
├── infra/
│   └── docker/
│       └── docker-compose.yml          # Local containerized infrastructure (Postgres, Redis)
│
├── packages/
│   └── shared-types/                   # Shared TypeScript models and interfaces
│
├── .env.example                        # Template for required environment keys
├── .gitignore                          # Standardized ignore rules
├── package.json                        # Root package manifest & scripts
├── PRD.md                              # Comprehensive Product Requirements Document
├── CONTRIBUTING.md                     # Contribution guidelines and Git workflow
└── README.md                           # Project documentation hub
```

---

## 🚀 Quickstart & Local Development

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker**: For running PostgreSQL & Redis locally

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Sachinxcode-01/namma-bus-ai.git
cd namma-bus-ai
npm install
```

### 2. Configure Environment Variables
Copy the root `.env.example` to `apps/api/.env`:
```bash
cp .env.example apps/api/.env
```

Ensure essential parameters are filled:
```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nammabus_dev?schema=public"
JWT_ACCESS_SECRET="super-secure-jwt-access-secret-key-32-chars-min"
JWT_REFRESH_SECRET="super-secure-jwt-refresh-secret-key-32-chars-min"
```

### 3. Spin Up Local Infrastructure
Launch PostgreSQL via Docker Compose:
```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

### 4. Database Setup & Seeding
```bash
# Generate Prisma Client types
npm run prisma:generate

# Apply pending migrations
npm run prisma:migrate

# Seed database with sample routes, stops, and vehicles
npm run prisma:seed
```

### 5. Launch Development Server
```bash
npm run dev
```

The service will be accessible at:
- **API Base**: `http://localhost:4000/api/v1`
- **Interactive Swagger Docs**: `http://localhost:4000/docs`
- **Liveness Probe**: `http://localhost:4000/health`
- **Readiness Probe**: `http://localhost:4000/health/ready`

---

## 🧪 Testing & Code Quality

```bash
# Run Unit Tests with Jest
npm run test

# Run End-to-End (E2E) Integration Tests
npm run test:e2e

# Run TypeScript Strict Typecheck
npm run typecheck

# Check Code Formatting & ESLint Rules
npm run lint

# Format Codebase with Prettier
npm run format

# Compile Production Build
npm run build
```

---

## 📡 API Specifications & Conventions

### Base Route Hierarchy
All business domain routes are mounted beneath the versioned `/api/v1` prefix. System probes (`/health`, `/health/ready`) and documentation (`/docs`) are served at root level.

### Correlation ID Tracking
Every HTTP request received or emitted by the system tracks an `X-Request-ID` header. If not provided by upstream clients, a `UUIDv4` is assigned automatically and logged across the entire request lifecycle.

### Standard Response Envelope (`2xx`)
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-10-02T14:30:00.000Z",
    "uptime": 124.52
  }
}
```

### Standard Error Envelope (`4xx / 5xx`)
```json
{
  "success": false,
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Transit route #402 was not found or is currently inactive.",
    "requestId": "e1f13b63-0c4a-4318-87ef-466d6287c711"
  }
}
```

---

## 🗺️ Roadmap & Milestones

- [x] **Phase 0: Foundation Architecture**
  - NestJS modular skeleton, Pino logging, Zod validation, Prisma setup, Health probes, CI pipeline.
- [ ] **Phase 1: Real-Time Telemetry & Tracking Engine**
  - GPS ping ingestion endpoints, Redis geospatial cache, WebSocket live stream gateway.
- [ ] **Phase 2: Geofencing & ETA Prediction**
  - Stop proximity boundary detection, dynamic ETA calculations, push notification triggers.
- [ ] **Phase 3: Student & Driver Applications**
  - Cross-platform student tracking PWA/mobile app, driver navigation terminal.
- [ ] **Phase 4: Admin Fleet Management & SOS Dispatch**
  - Fleet telematics console, live map overlays, emergency response center.

---

## 🤝 Contributing

Contributions are what make the open-source community an amazing place to learn, inspire, and create. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on code style, commit conventions, and branch management.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License & Security

- **License**: Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
- **Security**: For security vulnerability disclosures, please review [SECURITY.md](SECURITY.md).

<p align="center">
  <sub>Built with ❤️ for safer, smarter campus transit.</sub>
</p>

