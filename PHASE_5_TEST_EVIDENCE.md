# SWAYAM ADMISSION — PHASE 5 TEST EVIDENCE & EXECUTION LOGS

**Document ID:** SWAYAM-PHASE-5-TEST-EVIDENCE  
**Date:** October 21, 2026  
**Audience:** QA Lead, Security Auditor, Engineering Leadership  

---

## 1. Test Execution Inventory

| # | Test Suite / Command | Execution Scope | Scenarios | Result | Exit Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `scripts/test_phase5_staging_acceptance.ts` | Live Render API, Live CORS, Outbox Safety, TTL, Webhook | 12 | 12 Passed | 0 |
| 2 | `scripts/test_employee_recovery_full_e2e.ts` | Employee Activation, OTP Reset, Token Invalidation, RBAC | 16 | 16 Passed | 0 |
| 3 | `scripts/test_phase4_1_domains_and_email.ts` | Testing Domains CORS, Links, Webhook Fail-Closed, SMTP Handshake | 16 | 15 Passed, 1 Blocked (Gmail Quota) | 0 |
| 4 | `scripts/test_phase4_verification.ts` | Sent/Delivered Semantics, Outbox Metrics, Stale Worker Recovery | 10 | 10 Passed | 0 |
| 5 | `scripts/test_phase3_verification.ts` | Quota Circuit Breaker, Strict Email Verification, Security | 10 | 10 Passed | 0 |
| 6 | `npx nest build` (Backend) | Production TypeScript compilation | Full codebase | Passed | 0 |
| 7 | `npm run build` (Admin Frontend) | Vite production bundling | Full admin UI | Passed (27.74s) | 0 |
| 8 | `npm run build` (User Frontend) | Vite production bundling | Full public UI | Passed (19.93s) | 0 |

---

## 2. Evidence: Phase 5 Staging Acceptance & Reliability Suite

**Command:**
```powershell
node -r ts-node/register/transpile-only scripts/test_phase5_staging_acceptance.ts
```

**Actual Terminal Output:**
```
===================================================================================
       SWAYAM ADMISSION — PHASE 5 STAGING ACCEPTANCE & RELIABILITY SUITE           
===================================================================================

--- SUITE 1: Live Staging API Health & Connectivity ---
✅ [Live API] Live Backend Root Connectivity: HTTP 200 OK from Render backend (https://swayam-admission.onrender.com/v1)

--- SUITE 2: Live Staging CORS & Allowlist Enforcement ---
✅ [CORS] Admin Testing Domain Preflight: CORS allowed for https://swayam-admission-eg2x.vercel.app with credentials: true
✅ [CORS] Student Testing Domain Preflight: CORS allowed for https://swayam-admission.vercel.app with credentials: true
✅ [CORS] Unapproved Origin Rejection: Unapproved origin https://unapproved-hacker-site.com correctly denied CORS headers (fail closed)

--- SUITE 3: Public Catalog Data Retrieval ---
✅ [Catalog] Public Colleges Catalog Retrieval: Retrieved 2 colleges (Total: 33)

--- SUITE 4: Outbox Authentication Message TTL Suppression ---
[Nest] 23392  - 10/21/2026, 1:39:18 AM    WARN [DurableOutboxService] [OUTBOX TTL EXPIRED] Delivery ID: cmvh49mej0001q01sel05l3tb | Purpose: REGISTRATION_OTP | Expired. Suppressing delivery to avoid replaying expired credentials.
✅ [Queue Safety] Expired Auth Message TTL Suppression: Expired registration OTP suppressed before dispatch (status: FAILED, reason: AUTH_MESSAGE_EXPIRED)

--- SUITE 5: Superseded Authentication Message Suppression ---
[Nest] 23392  - 10/21/2026, 1:39:26 AM    WARN [DurableOutboxService] [OUTBOX SUPERSEDED] Delivery ID: cmvh49t0k0003q01s5dyjsizt for superseded.test.1792526962474@example.com (Purpose: REGISTRATION_OTP) is superseded by newer delivery cmvh49tkb0005q01s0r4dqzsy. Suppressing delivery.
✅ [Queue Safety] Superseded Authentication Message Suppression: Older OTP delivery was suppressed because a newer OTP request superseded it

--- SUITE 6: Provider Quota Circuit Breaker & Safe Queue Retention ---
[Nest] 23392  - 10/21/2026, 1:39:31 AM    WARN [DurableOutboxService] [OUTBOX PROVIDER QUOTA EXCEEDED] Daily sending limit exceeded on email channel. Activating 15m cooldown until 2026-10-20T20:24:31.424Z. Retaining pending jobs safely.
✅ [Queue Safety] Quota Circuit Breaker & Safe Retention: Quota error activated 15m cooldown, preserved status: QUEUED, isRetryable: true without burning maxRetries

--- SUITE 7: Admin Outbox Recovery Controls ---
[Nest] 23392  - 10/21/2026, 1:39:35 AM     LOG [DurableOutboxService] [OUTBOX COOLDOWN RESET] Email provider quota cooldown manually reset.
[Nest] 23392  - 10/21/2026, 1:39:36 AM     LOG [DurableOutboxService] [OUTBOX RECOVERY] Reset 3 quota-blocked deliveries for retry.
✅ [Admin Controls] Quota Recovery & Cooldown Reset: Successfully reset cooldown and recovered 3 quota-blocked deliveries to QUEUED

--- SUITE 8: Production Security & PII Masking ---
✅ [Security] Admin Delivery PII Masking: Email: r***a@example.com, Phone: +91****3210

--- SUITE 9: Meta Webhook Fail-Closed Security ---
✅ [Webhook] Verify Token Mismatch Rejection: Rejected unauthorized GET challenge
✅ [Webhook] Valid POST HMAC Signature Accepted: Successfully authenticated sha256 HMAC payload signature

===================================================================================
                 📊 PHASE 5 STAGING ACCEPTANCE RESULTS SUMMARY                     
===================================================================================
TOTAL TESTS : 12
PASSED      : 12 ✅
FAILED      : 0 ❌
BLOCKED     : 0 ⚠️
===================================================================================
```

---

## 3. Evidence: Employee Recovery Full E2E Verification

**Command:**
```powershell
node -r ts-node/register/transpile-only scripts/test_employee_recovery_full_e2e.ts
```

**Actual Terminal Output (Summary):**
```
=================================================================================
  SWAYAM ADMISSION — EMPLOYEE RECOVERY & AUTHENTICATION END-TO-END VERIFICATION  
=================================================================================

✅ PostgreSQL Connected
[Scenario 1] ✅ PASS — Newly approved employee receives single-use 24h activation link without temporary password
[Scenario 2] ✅ PASS — Employee activates account and creates permanent password without temporary password
[Scenario 3] ✅ PASS — Normal employee requests OTP using registered official email
[Scenario 4] ✅ PASS — Valid OTP permits employee to receive reset token and set new password
[Scenario 5] ✅ PASS — Incorrect, expired, reused, or invalidated OTPs are rejected
[Scenario 6] ✅ PASS — OTP resend limits, cooldowns (60s), and attempt limits enforced
[Scenario 7] ✅ PASS — Unknown email does not reveal account existence (Anti-enumeration policy)
[Scenario 8] ✅ PASS — Protected account recovery requires authorized IAM Administrator action
[Scenario 9] ✅ PASS — Administrator-triggered recovery link dispatches to verified official email
[Scenario 10] ✅ PASS — Recovery links expire strictly (24h) and cannot be reused (single-use)
[Scenario 11] ✅ PASS — Existing sessions and refresh tokens are revoked upon successful password reset
[Scenario 12] ✅ PASS — SMTP centralized service health check and fallback resilience
[Scenario 13] ✅ PASS — Concurrent requests cannot consume or duplicate password reset operations
[Scenario 14] ✅ PASS — Correct login and portal access work with updated password
[Scenario 15] ✅ PASS — Unauthorized users cannot access administrative recovery APIs (Strict RBAC)
[Scenario 16] ✅ PASS — Database persistence and audit logs verified in Neon PostgreSQL

Total Scenarios: 16
Passed: 16 / 16
Failed: 0 / 16
```

---

## 4. Evidence: Real SMTP Probe & Quota Error Verification

**Command:**
```powershell
node -r ts-node/register/transpile-only scripts/test_phase4_1_domains_and_email.ts
```

**Actual Terminal Output (SMTP Excerpt):**
```
--- SUITE 4: Real SMTP Connection & Sender Readiness ---
[SMTP Probe] Host=smtp.gmail.com, Port=587, Secure=false, User=swayamadmissions@gmail.com
✅ [SMTP] Credentials Present: User swayamadmissions@gmail.com configured; password length=16 chars (spaces stripped)
✅ [SMTP] SMTP Handshake & Authentication: Successfully authenticated with smtp.gmail.com:587 as swayamadmissions@gmail.com
⚠️ [SMTP] Live Email Transmission Probe: Google SMTP 550-5.4.5: Daily user sending limit exceeded on swayamadmissions@gmail.com (Gmail personal quota rolling limit). Transporter authentication succeeded, but live dispatch is rate-limited by Google until quota resets or dedicated relay (Amazon SES / SendGrid) is provisioned.
```

---

## 5. Evidence: Production Compilations

### 5.1 Backend Compilation (`npx nest build`)
```
Exit code: 0
Output: Clean compilation to backend/dist/
```

### 5.2 Admin Frontend Compilation (`npm run build`)
```
> @swayam/admin@0.0.1 build
> vite build

vite v6.3.5 building for production...
transforming...
✓ 2811 modules transformed.
rendering chunks...
dist/index.html                                        0.83 kB │ gzip:   0.48 kB
dist/assets/SA_logo-removebg-preview-Cxih-dbI.png    166.31 kB
dist/assets/index-Cgm37oHU.css                       183.59 kB │ gzip:  27.84 kB
dist/assets/index-B32YZKO3.js                      3,158.48 kB │ gzip: 663.61 kB
✓ built in 27.74s
```

### 5.3 User Frontend Compilation (`npm run build`)
```
> @swayam/user@0.0.1 build
> vite build

vite v6.3.5 building for production...
transforming...
✓ 1898 modules transformed.
rendering chunks...
dist/index.html                                        0.93 kB │ gzip:   0.51 kB
dist/assets/SA_logo-removebg-preview-Cxih-dbI.png    166.31 kB
dist/assets/index-BPaOU6Fw.css                       196.45 kB │ gzip:  28.70 kB
dist/assets/index-Zlyiq-nN.js                      1,563.14 kB │ gzip: 380.12 kB
✓ built in 19.93s
```
