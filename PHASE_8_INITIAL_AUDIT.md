# SWAYAM ADMISSION — PHASE 8 INITIAL AUDIT
## Comprehensive Architectural Audit, Phase 7 Verification & Baseline Discrepancy Analysis

**Audit Date:** October 21, 2026  
**Auditor:** Principal Software Architect, SRE, DevSecOps Engineer & QA Lead  
**Current Commit:** `903009e3f7a3fda34e1f2bf4d9b5a151b302996e`  
**Target Environment:** Local Node.js v20+ / Neon PostgreSQL / Vercel Frontends / Render Staging

---

### 1. REPOSITORY BASELINE & ARCHITECTURAL INVENTORY

| Subsystem | Verified Technology | Deployment Location | Status |
| :--- | :--- | :--- | :--- |
| **Backend API** | NestJS 11 + Express + TypeScript | Render Web Service (`https://swayam-admission.onrender.com`) | Operational (Starter tier) |
| **ORM & Database** | Prisma 6.9.0 + PostgreSQL 16 | Neon Serverless PostgreSQL (`ep-sweet-salad-...`) | Operational |
| **Admin & ERP Portal** | React 18 + Vite 6 + Tailwind/Radix UI | Vercel (`https://swayam-admission-eg2x.vercel.app`) | Operational |
| **Student Portal** | React 18 + Vite 6 + Tailwind/Radix UI | Vercel (`https://swayam-admission.vercel.app`) | Operational |
| **Outbox Processor** | `DurableOutboxService` (PostgreSQL) | Embedded background worker in NestJS backend | Operational (5s poll) |
| **Email Transports** | Amazon SES, SendGrid, Gmail SMTP, Generic SMTP | Configurable via Render Environment Variables | Transports ready; Gmail daily quota blocked |
| **Authentication** | JWT (15m) + Refresh Token (7d) + Bcrypt | Backend Auth Module (`/v1/auth`) | Operational (Zero temp passwords) |

---

### 2. AUDIT OF PHASE 7 FEATURES & CODEBASE VERIFICATION

We audited the actual files modified in Phase 7 to confirm that claimed features exist in code:

1. **Persistent Quota Cooldown in PostgreSQL (`durable-outbox.service.ts`)**:
   - **Verified**: `getPersistentQuotaCooldown()` and `setPersistentQuotaCooldown()` query and persist JSON metadata (`{ quotaCooldownUntil, reason, provider, updatedAt }`) into `OtpConfiguration.providerUrl`.
   - **Integrity & Concurrency**: The database serves as the source of truth across worker instances. If an admin calls `resetQuotaCooldown()`, both memory and DB are synchronized. In-memory cache invalidation occurs immediately when DB cooldown expires.
2. **AWS SNS Webhook SSRF Guards (`communication-campaign.controller.ts`)**:
   - **Verified**: `validateSnsCertificateUrl()` strictly validates HTTPS, regex `^sns\.[a-zA-Z0-9-]+\.amazonaws\.com(\.cn)?$`, and `.pem` file extension.
   - **Verified**: `validateSnsSubscribeUrl()` strictly enforces the trusted AWS SNS domain pattern.
3. **SendGrid Event Webhook Anti-Replay & Signatures (`communication-campaign.controller.ts`)**:
   - **Verified**: `X-Twilio-Email-Event-Webhook-Timestamp` is evaluated; timestamps older than 10 minutes (`600s`) are rejected with `401 Unauthorized`.
   - **Verified**: Cryptographic verification supports both ECDSA (`SENDGRID_WEBHOOK_VERIFICATION_KEY`) and HMAC (`SENDGRID_WEBHOOK_SECRET`).
4. **Cross-Attribution Protection (`notification-channels.service.ts`)**:
   - **Verified**: In `NotificationDispatcher.handleDeliveryWebhook()`, if `event.recipientEmail` does not match the stored delivery record's recipient email, the webhook rejects the callback.
5. **Recipient Suppression Refinement (`notification-channels.service.ts`)**:
   - **Verified**: Suppression check filters exclusively for `['HARD_BOUNCE', 'COMPLAINT', 'PERMANENT_REJECTION', 'SPAM_REPORT']`. Soft bounces (`SOFT_BOUNCE`, `MAILBOX_FULL`, `TEMPORARY_DEFERRAL`) are excluded from permanent suppression.
6. **Authentication Message Safety (`durable-outbox.service.ts`)**:
   - **Verified**: 10-minute TTL expiry and supersession checks guard `REGISTRATION_OTP`, `EMAIL_VERIFICATION`, `PASSWORD_RESET`, `EMPLOYEE_ACTIVATION`, and `EMPLOYEE_PASSWORD_RESET`.

---

### 3. SPECIFIC DISCREPANCIES AUDITED & RESOLVED

#### 3.1 Test Count Reconciliations (Phase 7 vs Phase 6)
- **Discrepancy**: Some sections in documentation loosely stated "23 passing and 2 blocked" without specifying the test suite.
- **Clarification & Exact Metrics**:
  - `backend/scripts/test_phase7_activation_and_security.ts`: Contains **25 total test cases**.
    - **23 PASSED**
    - **2 BLOCKED** (Suite 7 Live SMTP Handshake & Live Outbound Delivery due to Gmail daily quota `550-5.4.5`)
    - **0 FAILED**
  - `backend/scripts/test_phase6_email_deliverability.ts`: Contains **23 total test cases**.
    - **22 PASSED**
    - **1 BLOCKED** (Suite 6 Live Outbound Transmission due to Gmail daily quota `550-5.4.5`)
    - **0 FAILED**
  - The counts are completely distinct suites with different scopes. They must not be conflated.

#### 3.2 Phase 5 Regression Timeout Diagnosis
- **Symptom**: `Live Backend Root Connectivity: Render connection failed: HTTP request timeout (25000ms)`.
- **Root Cause**: Render free/starter tiers spin down web services after 15 minutes of inactivity. When a request hits a sleeping container, container provisioning, image pull, and NestJS initialization require **35 to 45 seconds**. The test suite hardcoded a 25-second timeout on the initial ping.
- **Evidence**: Immediately after the first timeout, subsequent requests in the same test script (CORS preflight, Public Catalog data retrieval) completed in under 400ms.
- **Resolution Plan**: Update `backend/scripts/test_phase5_staging_acceptance.ts` to include an initial wake-up ping with automatic retry and a 60s timeout, eliminating false-negative cold-start timeouts while testing live Render staging.

#### 3.3 AWS SNS Signature Validation & Certificate Retrieval
- **Audit Finding**: In `communication-campaign.controller.ts`, line 530 reads:
  `const cachedCert = this.snsCertCache.get(payload.SigningCertURL);`
  If the certificate has not yet been cached, the code did not trigger an outbound HTTPS fetch.
- **Risk**: An incoming valid AWS SNS notification received before manual cache population would bypass signature checking if only `cachedCert` is evaluated.
- **Resolution Plan**: Enhance `CommunicationCampaignController` with an asynchronous HTTPS fetcher (`fetchSnsCertificate`) that safely downloads the certificate over HTTPS using `validateSnsCertificateUrl`, caches it, and strictly rejects requests if certificate fetching fails or signature verification fails.

#### 3.4 AWS SNS Subscription Confirmation Behavior
- **Audit Finding**: When SNS delivers `Type: 'SubscriptionConfirmation'`, `CommunicationCampaignController` validates `SubscribeURL` against SSRF and returns `{ status: 'SUBSCRIPTION_CONFIRMATION_RECEIVED', topicArn, subscribeUrl }`.
- **Analysis**: Returning the URL without auto-fetching prevents an SSRF vector where arbitrary actors might send subscription tokens. However, in automated production environments, administrators want the option to auto-confirm subscriptions from verified AWS SNS hosts.
- **Resolution Plan**: Keep the safe behavior as default, but provide an optional configuration (`AWS_SNS_AUTO_CONFIRM_SUBSCRIPTION=true`) that performs an outbound HTTPS GET request strictly to validated `sns.<region>.amazonaws.com` URLs with a 5-second timeout, logging the confirmation event.

#### 3.5 SendGrid Signature Verification & Anti-Replay
- **Audit Finding**: Verified against SendGrid official documentation (Twilio SendGrid Event Webhook Signature Verification).
- **Validation**: SendGrid uses ECDSA with SHA-256 (`crypto.createVerify('sha256')`) using a public verification key, formatted as `X-Twilio-Email-Event-Webhook-Signature` and `X-Twilio-Email-Event-Webhook-Timestamp`. The current code correctly concatenates `timestamp + rawPayload` and verifies against the public key. The 10-minute timestamp window prevents replay attacks.

---

### 4. IDENTIFIED GAPS & DEFICIENCIES TO RESOLVE IN PHASE 8

1. **Production Health Checks (Workstream A)**:
   - Need dedicated, separated endpoints:
     - `GET /v1/health/liveness` (process functioning, lightweight)
     - `GET /v1/health/readiness` (DB connectivity check, returns 503 if DB is down)
     - `GET /v1/health/providers` (independent status for Email, SMS, WhatsApp without leaking credentials)
     - `GET /v1/health/worker` (outbox queue metrics, stall detection)
2. **Database Backup & Disaster Recovery (Workstream B)**:
   - No documented runbook or automated recovery drill script exists for Neon PostgreSQL branching and `pg_dump`/`pg_restore`.
3. **CI/CD & Release Gates (Workstream D)**:
   - No `.github/workflows/` exists in the repository. Release gates (backend build, admin frontend build, student frontend build, schema validation, test suites) are manual.
4. **Rate Limiting & Abuse Resilience (Workstream F)**:
   - `@nestjs/throttler` is declared in `package.json` dependencies but never registered in `app.module.ts`. Global API rate limiting relies only on application-level OTP cooldowns.
5. **Database Index Verification (Workstream C & G)**:
   - `CommunicationDelivery` lacks explicit indexes on `recipientEmail` and `providerMessageId`, which are heavily queried during suppression and webhook lookups.

---

### 5. PHASE 8 WORK PLAN & EXECUTION ROADMAP

- [x] **Step 1: Initial Audit & Documentation** (`PHASE_8_INITIAL_AUDIT.md`)
- [ ] **Step 2: Workstream A — Production Health & Readiness Endpoints**
- [ ] **Step 3: Workstream E & F — AWS SNS Cert Fetcher, Safe Subscription & NestJS Throttler**
- [ ] **Step 4: Workstream D — GitHub Actions CI/CD Release Pipeline (`.github/workflows/ci.yml`)**
- [ ] **Step 5: Workstream B & C — Neon PostgreSQL Recovery Runbook & Schema Index Optimization**
- [ ] **Step 6: Phase 5 Staging Acceptance Script Cold-Start Hardening**
- [ ] **Step 7: Automated Test Suite Execution & Production Builds**
- [ ] **Step 8: Final Phase 8 Deliverables (Reports, Runbooks & Evidence)**
