# SWAYAM ADMISSION — COMPLETE TECHNICAL & FUNCTIONAL AUDIT
## 01. Executive Summary

### 1. Overview & Platform Mission

**Swayam Admission** is a full-stack, enterprise-grade educational technology, college discovery, counseling CRM, and application management platform designed for higher education admissions in India. The platform bridges the gap between prospective students seeking undergraduate and postgraduate admissions and higher education institutions (universities, autonomous colleges, and institutes) across India.

The platform provides a dual-portal user experience:
1. **Public Student Portal (`frontend/user`)**: A modern discovery engine where students can explore colleges, courses, entrance exams, scholarships, rankings, and career guides, calculate eligibility, receive AI-driven guidance, submit multi-step admission applications, upload verified documents, pay fees, and track admission progress in real-time.
2. **Admin & ERP Portal (`frontend/admin`)**: A comprehensive administrative, CRM, and institutional operations suite used by Super Admins, Directors, Counselors, Content Managers, SEO Managers, and Institutional Officers to manage leads, student journeys, counselor tasks, verification queues, fee collections, college profiles, rankings, and communication campaigns.

---

### 2. High-Level System Architecture

```mermaid
graph TD
    subgraph "Clients & Frontends"
        SP["Student Portal & Public Website<br/>React 18 + Vite 6 + Tailwind 4<br/>(Hosted on Vercel)"]
        AP["Admin & ERP Portal<br/>React 18 + Vite 6 + Tailwind 4<br/>(Hosted on Vercel)"]
    end

    subgraph "API Gateway & Routing"
        VR1["Vercel Edge Rewrites (/v1/*)"]
        VR2["Vercel Edge Rewrites (/v1/*)"]
    end

    subgraph "Backend Application (NestJS 11 on Render)"
        API["NestJS 11 REST API Engine<br/>Express 5 + Global Validation Pipe<br/>Global Prefix: /v1"]
        AUTH["Auth & IAM Service<br/>Passport JWT + Refresh Tokens + RBAC"]
        OUTBOX["Durable Outbox Background Worker<br/>In-Process Polling Loop (5s Interval)"]
        SYNC["LiveSync WebSocket Gateway<br/>Socket.io Event Dispatcher"]
    end

    subgraph "Data & Storage Tier"
        DB[(Neon PostgreSQL Serverless<br/>Prisma ORM 6.9.0<br/>218 Models | 38 Enums)]
        FS["Local Filesystem Storage Vault<br/>Watermarked PDFs & Media Thumbnails"]
    end

    subgraph "External Integrations"
        SMTP["Gmail / SMTP Server"]
        WA["Meta WhatsApp Cloud API"]
        SMS["Fast2SMS Gateway"]
        RZP["Razorpay Payment Gateway"]
        AI["Google Gemini / OpenAI APIs"]
    end

    SP --> VR1 --> API
    AP --> VR2 --> API
    API --> AUTH
    API --> DB
    API --> FS
    API --> SYNC
    OUTBOX --> DB
    OUTBOX --> SMTP
    OUTBOX --> WA
    OUTBOX --> SMS
    API --> RZP
    API --> AI
```

---

### 3. Quantitative Platform Scale

| Dimension | Measured Repository Metric | Verification Source |
|---|---|---|
| **Total Non-Ignored Files** | **1,134 files** | Filesystem scan (excluding `node_modules`, `.git`, `dist`) |
| **TypeScript / TSX Files** | **918 files** (672 `.ts`, 246 `.tsx`) | Codebase AST scan |
| **JavaScript / MJS Files** | **53 files** (50 `.js`, 3 `.mjs`) | Root scripts & build configurations |
| **Prisma Models** | **218 database models** | `backend/prisma/schema.prisma` (6,162 lines) |
| **Prisma Enums** | **38 database enums** | `backend/prisma/schema.prisma` |
| **Database Indexes** | **463 `@@index` blocks** | Prisma schema AST |
| **Unique Constraints** | **16 `@@unique` blocks** + inline `@unique` | Prisma schema AST |
| **Models with JSON Fields** | **63 models** (95 total `Json` fields) | Prisma schema AST |
| **Backend Modules** | **71 `.module.ts` files** (49 mounted, 22 unmounted) | NestJS dependency scan |
| **Backend Controllers** | **75 `.controller.ts` files** (58 mounted, 17 unmounted) | NestJS controller scan |
| **Backend Services** | **114 `.service.ts` files** | NestJS provider scan |
| **Total API Endpoints** | **1,024 endpoints** (987 mounted, 37 unmounted) | Controller route analysis |
| **Actively Used Endpoints** | **869 endpoints** consumed by frontends | Client-to-Controller cross-reference |
| **Admin ERP Views** | **39 distinct module views** | `frontend/admin/src/app/components/AppLayout.tsx` |
| **Student Public Routes** | **28 routes** + 14 dashboard tabs + 9 modals | `frontend/user/src/app/routes.tsx` |
| **Admin API Client Calls** | **1,181 API invocation points** | `frontend/admin/src/api/*.ts` (39 client files) |
| **Student API Client Calls** | **323 API invocation points** | `frontend/user/src/api/*.ts` (28 client files) |

---

### 4. Build & Reliability Health Status

| Component | Target Runtime | Command Tested | Exit Code | Result | Key Observations |
|---|---|---|---|---|---|
| **Backend** | Node.js 24 / NestJS 11 | `npm run build` | **0** | **SUCCESS** | Clean compilation into `dist/` using TypeScript 5.7.3. |
| **Admin Frontend** | Vite 6 / React 18 | `npm run build` | **0** | **SUCCESS** | Built in 10.32s; produces 3.16 MB monolithic JavaScript bundle (`index-B32YZKO3.js`) without route code splitting. |
| **Student Frontend** | Vite 6 / React 18 | `npm run build` | **0** | **SUCCESS** | Built in 6.04s; produces 1.56 MB monolithic JavaScript bundle (`index-Zlyiq-nN.js`). |
| **Backend Unit Tests** | Jest 30 / ts-jest | `npm test` | **0** (CLI) | **18 FAILED / 10 PASSED** | 69 total tests: 50 passed, 19 failed. Failures stem from unmocked NestJS service dependencies in scaffolding spec files, missing PDF header in watermark mock test, and DataScope filter assertion mismatches. |
| **Frontend Unit Tests** | None | N/A | N/A | **NOT AVAILABLE** | No test files (`.test.tsx` or `.spec.tsx`) exist in either frontend repository. |
| **CI/CD Quality Gate** | GitHub Actions | `ci.yml` | **0** | **BYPASSED** | CI pipeline executes `npm test -- --passWithNoTests \|\| true`, which suppresses failing test suites to force green release builds. |

---

### 5. Critical Technical & Security Findings

1. **Hardcoded Fallback JWT Secret (CRITICAL SECURITY)**:
   In `backend/src/auth/auth.module.ts` (line 34), the JWT module configures:
   `secret: config.get<string>('JWT_SECRET') || 'swayam_super_secret_key'`.
   If the `JWT_SECRET` environment variable fails to load or is omitted in staging/production, the application defaults to a widely known static secret, exposing tokens to offline forgery.

2. **Test Failure Suppression in CI/CD (HIGH RELIABILITY RISK)**:
   `.github/workflows/ci.yml` (line 69) appends `|| true` to the test execution step:
   `npm test -- --passWithNoTests || true`.
   This masks all 18 failing Jest test suites and allows defective builds to pass the release quality gate automatically.

3. **Absence of Prisma Database Migrations (HIGH ARCHITECTURE RISK)**:
   The `backend/prisma/` directory contains `schema.prisma` (6,162 lines) and `seed.ts`, but has **no `migrations/` directory**. The database schema has been applied via `prisma db push` rather than tracked, reversible migration scripts. Any drift between environments poses high data-loss and breaking change risks.

4. **Zombie and Duplicate Modules (MEDIUM ARCHITECTURAL DEBT)**:
   The codebase contains several duplicate and abandoned modules:
   - `backend/src/applications/`: Contains 5 empty 0-byte zombie files (`applications.controller.ts`, `applications.service.ts`, `applications.module.ts`, and DTOs). The real implementation resides in `backend/src/application/` (singular).
   - `backend/src/modules/`: Contains 6 orphan modules (`cms`, `homepage`, `media`, `navigation`, `pages`, `seo`) with 6 controllers and 22 endpoints completely disconnected from `AppModule`.
   - `backend/src/exam/` vs `backend/src/exams/`: `exam/` is unmounted; `exams/` is active.
   - `backend/src/scholarship/` vs `backend/src/scholarships/`: `scholarship/` is unmounted; `scholarships/` is active.
   - `backend/src/career/` vs `backend/src/hr/careers.controller.ts`: `career/` is unmounted; `hr/` is active.

5. **Shared Frontend Package Abandonment (MEDIUM CODE DEBT)**:
   The directory `frontend/shared` contains 5 empty subdirectories (`components`, `constants`, `hooks`, `types`, `utils`) containing **0 files**. As a result, identical DTOs, API error handlers, and UI types are duplicated across `frontend/admin` and `frontend/user`.

6. **Monolithic Frontend Bundles (MEDIUM PERFORMANCE DEBT)**:
   Neither frontend application uses dynamic `React.lazy()` / `import()` code splitting. The Admin Portal loads as a single 3.16 MB minified file, while the Student Portal loads as a 1.56 MB minified file, significantly increasing first-contentful-paint (FCP) times on 3G/4G mobile connections.

7. **Storage Provider Reality (INFORMATIONAL / ARCHITECTURAL)**:
   While environment variables and settings reference S3 and GCS, the actual document storage pipeline uses the local filesystem (`STORAGE_PROVIDER=LOCAL`), storing encrypted and watermarked documents in `backend/uploads/` and `backend/storage/private_vault/`.

---

### 6. Audit Deliverables Directory Structure

All 17 required reports have been compiled into `docs/complete-website-audit/`:

```text
docs/complete-website-audit/
├── 01_EXECUTIVE_SUMMARY.md
├── 02_TECHNOLOGY_STACK.md
├── 03_PROJECT_STRUCTURE.md
├── 04_WEBSITE_PAGES_AND_ROUTES.md
├── 05_MODULES_AND_FEATURES.md
├── 06_DATABASE_ARCHITECTURE.md
├── 07_API_DOCUMENTATION.md
├── 08_AUTHENTICATION_AND_RBAC.md
├── 09_SYSTEM_ARCHITECTURE_AND_DATA_FLOWS.md
├── 10_THIRD_PARTY_INTEGRATIONS.md
├── 11_BUSINESS_LOGIC_AND_RULES.md
├── 12_SECURITY_AND_PERFORMANCE_AUDIT.md
├── 13_SEO_AND_CONTENT_ARCHITECTURE.md
├── 14_TESTING_AND_BUILD_STATUS.md
├── 15_FEATURE_IMPLEMENTATION_MATRIX.md
├── 16_TECHNICAL_DEBT_AND_RECOMMENDATIONS.md
└── 17_ENVIRONMENT_AND_DEPLOYMENT_ARCHITECTURE.md
```

