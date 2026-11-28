# SWAYAM ADMISSION — PHASE 9 INITIAL AUDIT REPORT
## Security Hardening, Automated Regression Testing & Release Readiness

**Document Version:** 1.0.0  
**Audit Date:** 2026-11-01  
**Auditor / Architect:** Senior DevSecOps Engineer & QA Lead  
**Repository Location:** `c:\Users\mdosa\OneDrive\Desktop\swayam-admission`  
**Git Branch:** `main` (clean working tree)  
**Latest Baseline Commit:** `f8f1c1b` (`chore: add phase 8 CI/CD runbook, phase 7 test evidence, and related configuration scripts`)  

---

## 1. Executive Summary

Phase 9 focuses on **Security Hardening, Deterministic Automated Regression Testing, and CI Quality Gate Enforcement**.

An empirical baseline audit of the repository was executed prior to applying code modifications. The audit revealed critical security vulnerabilities in authentication secrets, unverified OTP paths in staff onboarding, 18 failing Jest test suites in the backend, completely absent test suites in both frontends, an unversioned Prisma migration directory, and CI failure-masking (`|| true`).

### Baseline Verification Status Summary

| Area / Component | Verified Baseline Status | Metric / Evidence | Critical Findings |
|---|---|---|---|
| **Backend Unit Tests** | **FAILING (18/28 Suites Failed)** | 10 Passed, 18 Failed, 50 Passed Tests, 19 Failed Tests | 16 DI dependency errors, 1 DataScope mismatch, 1 Auth service mock failure. |
| **Backend Build** | **PASSING** | Exit code 0, compiles via NestJS CLI | No circular dependencies or syntax compilation errors. |
| **Admin Frontend Build** | **PASSING** | Exit code 0, 3.16 MB monolithic bundle | Clean Vite build, warning for >500kB chunks. |
| **User Frontend Build** | **PASSING** | Exit code 0, 1.56 MB bundle | Clean Vite build, warning for >500kB chunks. |
| **Frontend Tests** | **NOT EXECUTED (0 Tests)** | 0 test files in `frontend/admin` & `frontend/user` | No automated test script or assertions configured in `package.json`. |
| **Prisma Schema** | **VALID** | `npx prisma validate` passed | Schema is valid, but `prisma/migrations/` is completely absent (`prisma db push` used). |
| **CI Quality Gate** | **COMPROMISED** | `.github/workflows/ci.yml:70` | `npm test -- --passWithNoTests \|\| true` suppresses all test failures. |
| **JWT Configuration** | **HIGH SECURITY VULNERABILITY** | `auth.module.ts`, `jwt.strategy.ts` | Fallback `'swayam_super_secret_key'` allows token forgery if env var is missing. |
| **OTP / Auth Bypasses** | **HIGH SECURITY VULNERABILITY** | `staff-onboarding.service.ts`, `auth.service.ts` | Arbitrary 6-digit code accepted in staff onboarding; Google test token bypass lacked production guard. |

---

## 2. Detailed Security Vulnerabilities & Findings

### Finding 1: Fallback JWT Secret in Production (`'swayam_super_secret_key'`)
- **Severity**: **CRITICAL**
- **Affected Files**:
  - `backend/src/auth/auth.module.ts` (lines 30–35)
  - `backend/src/auth/jwt.strategy.ts` (line 15)
  - `backend/src/auth/auth.service.ts` (lines 174, 230–231)
- **Vulnerability Mechanism**:
  If the `JWT_SECRET` environment variable is undefined, empty, or misconfigured in a production deployment, the backend silently falls back to `'swayam_super_secret_key'`. An attacker aware of this hardcoded default can sign arbitrary JWTs with `role: "SUPER_ADMIN"`, bypassing all authentication and authorization barriers.
- **Required Remediation**:
  1. Enforce fail-closed validation at application startup (`main.ts`): If `process.env.NODE_ENV === 'production'`, verify `JWT_SECRET` is defined, has at least 32 characters, and is not equal to any default insecure string (`swayam_super_secret_key`, `secret`, `default`). If invalid, abort startup immediately with a fatal error.
  2. Eliminate `'swayam_super_secret_key'` fallbacks in `auth.module.ts`, `jwt.strategy.ts`, and `auth.service.ts`.

---

### Finding 2: Insecure Staff Onboarding OTP Verification
- **Severity**: **CRITICAL**
- **Affected File**: `backend/src/staff-onboarding/staff-onboarding.service.ts` (lines 238–241)
- **Code Evidence**:
  ```typescript
  // In production environment, verify against Redis/SMS cache. Validated here for all 6-digit OTPs.
  if (dto.otp !== '123456' && dto.otp.length !== 6) {
    throw new BadRequestException('Invalid OTP. Please check and re-enter.');
  }
  ```
- **Vulnerability Mechanism**:
  The condition `dto.otp !== '123456' && dto.otp.length !== 6` evaluates to `false` for **ANY 6-digit number** (e.g. `000000`, `999999`) as well as `'123456'`. Consequently, any applicant can bypass mobile/email verification during staff onboarding without ever receiving or possessing a valid one-time password.
- **Required Remediation**:
  1. Integrate staff OTP verification with the authoritative `this.prisma.otpVerification` table.
  2. Validate OTP existence, expiration (`expiresAt > now`), matching hash/code, and maximum attempt limits.
  3. Gated dev OTP bypass (`123456`) strictly to `process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_OTP === 'true'`.

---

### Finding 3: Google OAuth Test Token Bypass Lacking Strict Production Guard
- **Severity**: **HIGH**
- **Affected File**: `backend/src/auth/auth.service.ts` (lines 657–672)
- **Code Evidence**:
  ```typescript
  if (
    (process.env.NODE_ENV === 'test' ||
      process.env.ALLOW_TEST_AUTH === 'true') &&
    token.startsWith('test-google-token-')
  ) { ... }
  ```
- **Vulnerability Mechanism**:
  If `ALLOW_TEST_AUTH=true` is inadvertently set or retained in a production `.env` file, anyone can authenticate as any student by sending a synthetic token header `test-google-token-sub:victim@example.com:Name`.
- **Required Remediation**:
  Explicitly forbid test token bypass when `process.env.NODE_ENV === 'production'`, regardless of `ALLOW_TEST_AUTH`.

---

### Finding 4: CI Quality Gate Failure Suppression (`|| true`)
- **Severity**: **HIGH**
- **Affected File**: `.github/workflows/ci.yml` (line 70)
- **Code Evidence**:
  ```yaml
  - name: Execute Deterministic Security & Reliability Tests
    working-directory: backend
    run: |
      npm test -- --passWithNoTests || true
  ```
- **Vulnerability Mechanism**:
  The shell pipe `|| true` masks all test suite failures, returning an exit code of `0` even when 18 out of 28 test suites fail. Broken builds are deployed to staging and production undetected.
- **Required Remediation**:
  Remove `|| true`, fix the root causes of the 18 failing test suites, and add automated frontend test gates.

---

### Finding 5: 18 Failing Backend Jest Unit Test Suites
- **Severity**: **HIGH**
- **Affected Files**:
  1. `src/audit/audit.service.spec.ts` (Missing `PrismaService`, `SystemConfigurationService`, `DataScopeService`)
  2. `src/payments/payments.controller.spec.ts` (Missing `InvoiceService`, `ReconciliationService`, etc.)
  3. `src/auth/authorization-data-scope.spec.ts` (Outdated assertion & missing `permission` model mock)
  4. `src/auth/auth.service.spec.ts` (Missing `ConsentService`)
  5. `src/tasks/tasks.controller.spec.ts` (Missing `TasksService`)
  6. `src/payments/payments.service.spec.ts` (Missing `PrismaService`, `AuditService`, etc.)
  7. `src/tasks/tasks.service.spec.ts` (Missing dependencies)
  8. `src/admission-workflow/admission-workflow.controller.spec.ts` (Missing `AdmissionWorkflowService`)
  9. `src/admission-workflow/admission-workflow.service.spec.ts` (Missing `PrismaService`, `AuditService`)
  10. `src/dashboards/dashboards.service.spec.ts` (Missing `PrismaService`)
  11. `src/dashboards/dashboards.controller.spec.ts` (Missing `DashboardsService`)
  12. `src/ai-recommendation/ai-recommendation.service.spec.ts` (Missing `PrismaService`)
  13. `src/ai-analytics/ai-analytics.controller.spec.ts` (Missing `AiAnalyticsService`)
  14. `src/ai-analytics/ai-analytics.service.spec.ts` (Missing `PrismaService`)
  15. `src/ai-memory/ai-memory.service.spec.ts` (Missing `PrismaService`)
  16. `src/users/users.service.spec.ts` (Missing `PrismaService`, `AuthorizationService`, `IdGeneratorService`)
  17. `src/ai-prompts/ai-prompts.service.spec.ts` (Missing `PrismaService`)
  18. `src/storage/storage.service.spec.ts` (Missing `LocalStorageService`)
- **Required Remediation**:
  Provide strongly typed mock providers for every dependency in these 18 spec files and align test assertions with current business logic.

---

### Finding 6: Missing Prisma Migration History
- **Severity**: **MEDIUM** (Operational / Reliability Risk)
- **Status**: `backend/prisma/schema.prisma` exists and validates cleanly (`npx prisma validate`), but `backend/prisma/migrations/` is not committed. The project currently relies on `prisma db push`.
- **Policy Compliance**:
  Per the Phase 9 instructions:
  - Do not create fake migration history or blindly baseline against the remote database.
  - Never run `prisma migrate reset` against production or staging.
  - Document a safe transition plan to tracked migrations for a future maintenance window.

---

### Finding 7: Missing Automated Tests in Frontends
- **Severity**: **MEDIUM**
- **Status**: Neither `frontend/admin` nor `frontend/user` has a test script in `package.json` or automated test files.
- **Required Remediation**:
  Implement automated regression suites for Admin and Student frontends using Node.js's native test runner (`node --test`), verifying session tokens, authentication state, API client interceptor logic, and role guards.

---

## 3. Prioritized Implementation Plan

```mermaid
flowchart TD
    A[Step 1: Security Hardening] --> B[Step 2: Fix 18 Failing Backend Tests]
    B --> C[Step 3: Security & RBAC Regression Suites]
    C --> D[Step 4: Frontend Automated Regression Tests]
    D --> E[Step 5: CI Workflow Hardening]
    E --> F[Step 6: Full Verification & Reporting]

    subgraph Security Hardening
      A1[Fail-Closed JWT Validation in main.ts]
      A2[Eliminate Insecure JWT Fallbacks]
      A3[Fix Staff Onboarding OTP Verification]
      A4[Guard Google OAuth Test Token Bypass]
      A1 --- A2 --- A3 --- A4
    end

    subgraph Backend Test Fixes
      B1[Fix DI in 16 Scaffolding Specs]
      B2[Fix AuthService & UsersService Mocks]
      B3[Update DataScope Spec Assertions]
      B1 --- B2 --- B3
    end

    subgraph Quality Gates
      E1[Remove || true in ci.yml]
      E2[Add Frontend Test Steps]
      E1 --- E2
    end
```

---

## 4. Audit Sign-off

- **Audit Status:** **AUDIT COMPLETE — COMMENCING IMPLEMENTATION**
- **Action Plan Approved:** All security fixes, test mocks, regression suites, and CI updates are strictly non-destructive to existing UI, design, and production data.

