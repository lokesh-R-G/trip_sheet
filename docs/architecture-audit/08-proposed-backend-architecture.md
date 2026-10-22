# Proposed Backend Architecture

## 1. Architectural Strategy: Modular Monolith

Based on the audit of the existing React application, a **Modular Monolith** is recommended as the optimal backend architecture.

### Rationale:
1. **Financial Transaction Integrity**: Trip sheet creation, expense approval, advance settlement, and payroll calculation require cross-entity ACID transactions within PostgreSQL. A distributed microservices setup would introduce distributed transaction overhead (Sagas, 2PC) with unnecessary operational complexity.
2. **Team & Domain Cohesion**: The operational lifecycle (drivers -> advances -> trips -> fuel -> payroll) is sequential and tightly bounded. A modular monolith provides clear module boundaries in code while allowing seamless transactional queries.
3. **Seamless Frontend Integration**: The current React frontend is structured around feature modules that align directly with a modular monolith's REST API controllers.

---

## 2. Recommended Technology Stack

| Layer | Recommended Technology | Justification & Compatibility |
| :--- | :--- | :--- |
| **Runtime & Language** | **Node.js (LTS v22) + TypeScript 5.7+** | Shares TypeScript definitions (`src/types/index.ts`) directly with the frontend; enables code reuse of calculation utilities (`src/utils/calculations.ts`). |
| **API Framework** | **Express.js v4/v5** | Present in `package.json` dependencies; lightweight, mature middleware ecosystem, high performance for JSON REST endpoints. |
| **Database** | **PostgreSQL 16+** | Robust relational model, native JSONB support for payload logs, powerful check constraints, serializable transactions for financial ledger tables. |
| **ORM / Data Access** | **Prisma ORM v5/v6** | Type-safe query generation, intuitive schema migrations, automated TypeScript types matching database models, connection pooling. |
| **Validation** | **Zod v3** | Runtime request body and query parameter validation; automatic inference of TypeScript DTOs. |
| **Authentication & Auth** | **JWT (jsonwebtoken) + bcryptjs** | Stateless token authentication with role-based access control (RBAC) middleware. |
| **Logging** | **Pino** | High-throughput structured JSON logging with correlation IDs for auditability. |
| **Background Jobs** | **Pg-Boss or BullMQ (PostgreSQL/Redis)** | Durable background worker for retryable TLCM Pro external API requests with exponential backoff and dead-letter handling. |

---

## 3. Proposed Backend Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma             # Primary PostgreSQL schema definition
│   └── migrations/               # Versioned SQL migrations
│
├── src/
│   ├── app.ts                    # Express app configuration & middleware pipeline
│   ├── server.ts                 # HTTP server bootstrap & graceful shutdown hooks
│   │
│   ├── config/                   # Environment & runtime configurations
│   │   ├── env.ts                # Validated env vars via Zod
│   │   └── database.ts           # Prisma client singleton
│   │
│   ├── common/                   # Shared utilities, middlewares, and errors
│   │   ├── errors/               # AppError, NotFoundError, ConflictError, ValidationError
│   │   ├── middlewares/          # auth.middleware, rbac.middleware, validate.middleware, errorHandler
│   │   ├── utils/                # calculations.ts (shared pure business logic), logger.ts
│   │   └── types/                # Express request extensions, common DTOs
│   │
│   ├── modules/                  # Feature domain modules
│   │   ├── auth/                 # Login, refresh tokens, password hashing
│   │   ├── users/                # Operator profiles, RBAC assignments
│   │   ├── drivers/              # Driver directory, employment status, documents
│   │   ├── salary-structures/    # Salary packages, components, driver assignments
│   │   ├── vehicles/             # Cached vehicle master mirrors from TLCM Pro
│   │   ├── fuel-topups/          # Vehicle fuel bunkering top-ups
│   │   ├── trips/                # Trip sheets, routes, odometer evaluation
│   │   ├── expenses/             # Trip expense submission and auditing
│   │   ├── advances/             # Driver advances, returns, and financial ledger
│   │   ├── settlements/          # Trip advance reconciliation
│   │   ├── mileage-benchmarks/   # Expected mileage targets & tolerances
│   │   ├── fuel-deductions/      # Potential fuel excess, adjustments, approvals
│   │   ├── payroll/              # Draft generation, calculation engine, finalization seal
│   │   ├── payslips/             # Payslip generation and PDF rendering
│   │   ├── integrations/         # TLCM Pro API client, durable outbox jobs, reconciliation
│   │   ├── audit/                # Immutable system audit trail service
│   │   └── analytics/            # Fleet performance, dashboard aggregations
│   │
│   └── jobs/                     # Background workers (TLCM retry queue, daily sync)
│       ├── worker.ts             # Background job runner
│       └── handlers/
│           ├── tlcmVehicleSync.job.ts
│           └── tlcmTyreAttribution.job.ts
```

---

## 4. Internal Module Architecture Pattern

Each domain module under `src/modules/<feature>/` will adhere to a consistent 4-tier layer pattern:

```
[ HTTP Request ]
       │
       ▼
1. <feature>.routes.ts       (Route definitions, auth guard, rbac guard, Zod schema validation)
       │
       ▼
2. <feature>.controller.ts   (HTTP request extraction, status code mapping, response serialization)
       │
       ▼
3. <feature>.service.ts      (Core business logic, calculations, audit logging, transaction demarcation)
       │
       ▼
4. <feature>.repository.ts   (Prisma database queries, direct PostgreSQL constraints, locking)
```

---

## 5. Transaction & Financial Safety Boundaries

To satisfy business rules preventing double-spending, negative advance balances, and unauthorized modifications:

1. **Prisma `$transaction` Wrapper**:
   * Advance issuance and driver ledger debiting occur within a single database transaction.
   * Expense approval and trip settlement balance recomputation occur in a single transaction.
   * Payroll finalization and marking fuel deductions as `'posted_to_payroll'` execute atomically.
2. **Optimistic Locking**:
   * The `Trip` and `PayrollRun` tables will include a `version: Int @default(1)` column. Concurrent updates will verify `WHERE id = :id AND version = :version`, rejecting conflicting simultaneous edits.
3. **Immutable Audit Emission**:
   * Every service mutating state emits an audit entry inside the same database transaction. If the transaction aborts, no phantom audit log is created.
4. **Idempotent Background Jobs**:
   * TLCM Pro integration jobs are stored in an `IntegrationJob` outbox table with unique idempotency keys (`idempotency_key = "tlcm-attr-trip-<trip_id>"`). Retrying a job sends the exact same key to TLCM Pro, preventing duplicate tyre distance accumulation.
