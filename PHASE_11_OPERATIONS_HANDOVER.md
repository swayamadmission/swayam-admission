# SWAYAM ADMISSION — PHASE 11 OPERATIONS HANDOVER
## Platform Operational Guide, System Architecture & Engineering Maintenance Manual

**Document Version:** 1.0.0  
**Effective Date:** 2026-11-01  
**Author:** Principal Software Architect & DevSecOps Lead  
**Audience:** Site Reliability Engineers (SRE), DevOps Engineers, Platform Administrators  
**Repository Location:** `c:\Users\mdosa\OneDrive\Desktop\swayam-admission`  

---

## 1. System Architecture Overview

The Swayam Admission platform consists of three core codebases managed within a unified mono-repository structure:

```
swayam-admission/
├── backend/                  # NestJS 10 REST API (TypeScript / Node 20)
│   ├── src/                  # Modules (Auth, Leads, Applications, Marketing, Payments, etc.)
│   ├── prisma/               # Prisma Schema (schema.prisma) & Seeds
│   └── test/                 # Smoke tests & E2E configuration
├── frontend/
│   ├── user/                 # Public Website & Student Portal (React 18 / Vite 6)
│   │   ├── src/              # Pages, Components, State, API clients
│   │   └── test/             # Automated user regression tests
│   └── admin/                # Admin & Counselor CRM (React 18 / Vite 6)
│       ├── src/              # CRM Dashboards, Lead Routing, RBAC, Settings
│       └── test/             # Automated admin regression tests
└── .github/workflows/ci.yml  # Platform Quality Gate CI Pipeline
```

### Core Technology Stack Summary

| Layer | Technologies Used | Version | Deployment Target |
|---|---|---|---|
| **Backend API** | NestJS, TypeScript, Express, Passport, Throttler | 10.x / 5.x | Render Web Service |
| **Database ORM** | Prisma ORM, PostgreSQL Driver | 6.9.0 | Neon Serverless PostgreSQL 16 |
| **Frontend Framework** | React, TypeScript, Vite, Tailwind CSS, Lucide | 18.x / 6.x | Vercel Edge Hosting |
| **Document Processing** | `pdf-lib` (Watermarking & Security) | 1.17.x | Embedded Backend Worker |
| **Outbox Queue** | `DurableOutboxService` | Custom PostgreSQL Queue | Integrated in NestJS Background Service |

---

## 2. Standard Deployment & Build Operations

### 2.1 Package Scripts & Verification Commands

All standard maintenance operations can be executed using standard npm scripts:

```bash
# ------------------------------------------------------------------------------
# 1. DATABASE SCHEMA VALIDATION
# ------------------------------------------------------------------------------
# Validate Prisma schema definition
cmd /c "set DATABASE_URL=postgresql://user:pass@localhost:5432/db && npx --prefix backend prisma validate --schema=backend/prisma/schema.prisma"

# Generate fresh Prisma Client
npx --prefix backend prisma generate --schema=backend/prisma/schema.prisma

# ------------------------------------------------------------------------------
# 2. AUTOMATED TESTING
# ------------------------------------------------------------------------------
# Execute Backend Unit & Integration Tests (32 suites, 90 tests)
npm test --prefix backend

# Execute Admin Portal Frontend Tests (4 suites, 8 tests)
npm test --prefix frontend/admin

# Execute Student Portal Frontend Tests (4 suites, 8 tests)
npm test --prefix frontend/user

# ------------------------------------------------------------------------------
# 3. PRODUCTION BUILDS
# ------------------------------------------------------------------------------
# Compile Backend API (produces backend/dist/)
npm --prefix backend run build

# Compile Admin CRM Portal (produces frontend/admin/dist/)
npm --prefix frontend/admin run build

# Compile Student Portal (produces frontend/user/dist/)
npm --prefix frontend/user run build
```

---

## 3. Daily Operational Checklist

Platform operators should perform the following daily operational checks:

### 3.1 Morning Health Probing (09:00 UTC)
1. **Liveness Check**:
   `curl -s https://swayam-admission.onrender.com/v1/health/liveness`
   *Expected Response*: `{"status":"UP","uptimeSeconds":...,"timestamp":"..."}`
2. **Database Readiness**:
   `curl -s https://swayam-admission.onrender.com/v1/health/readiness`
   *Expected Response*: `{"status":"UP","database":"CONNECTED","databaseLatencyMs":...}`
3. **Outbox Worker Status**:
   `curl -s https://swayam-admission.onrender.com/v1/health/worker`
   *Expected Response*: `{"status":"HEALTHY","isWorkerRunning":true,"queueStalled":false}`
4. **Communication Gateways**:
   `curl -s https://swayam-admission.onrender.com/v1/health/providers`
   *Expected Response*: Checks status of Email, WhatsApp, and SMS transports.

### 3.2 Lead & Application Queue Review
- Verify in Admin CRM (`https://swayam-admission-eg2x.vercel.app`) that new inbound leads are being assigned to counselors without unrouted backlog.
- Check that document verification queues in `/applications/review-queue` do not exceed 24 hours in age.

### 3.3 Payment Reconciliation
- Inspect `/payments` in Admin CRM to verify that all completed transactions have corresponding Razorpay Order IDs and Payment IDs.
- For any pending payment where student claims deduction, use the `POST /payments/:id/reconcile` action to fetch the live status from Razorpay.

---

## 4. Disaster Recovery & Rollback Quick Reference

- **Frontend Rollback**: Go to [Vercel Dashboard](https://vercel.com) > Deployments > Click `...` > **Instant Rollback**.
- **Backend Rollback**: Go to [Render Dashboard](https://dashboard.render.com) > Events > Select previous commit > **Rollback to this deploy**.
- **Database Rollback**:
  - Open [Neon Console](https://console.neon.tech).
  - Create a point-in-time recovery branch from the timestamp prior to the incident.
  - Update `DATABASE_URL` in Render environment variables.
  - Restart Render Web Service.

> [!CAUTION]
> Under no circumstances should an engineer execute `npx prisma migrate reset` or `db push --force-reset` on staging or production.

---

## 5. Security & Credential Rotation Protocol

When rotating production secrets (e.g. quarterly or following a team transition):

1. **Rotate `JWT_SECRET`**:
   - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - Update in Render Settings.
   - Note: Users will need to log in again.
2. **Rotate Database Password**:
   - In Neon Console > Dashboard > Reset Password for `neondb_owner`.
   - Copy new pooled connection string into Render `DATABASE_URL`.
3. **Rotate Razorpay Keys**:
   - In Razorpay Dashboard > Settings > API Keys > Generate Key.
   - Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Render.

---

## 6. Engineering Support & Escalation Ownership

- **Lead Software Architect & DevSecOps Lead**: Technical architecture, schema changes, security policies.
- **Backend & Database Lead**: API controllers, Prisma ORM, Neon database, payment gateway.
- **Frontend & UI Lead**: React/Vite applications, design token maintenance, client-side routing.
- **Platform Administrator**: User provisioning, counselor role assignments, college master data.

