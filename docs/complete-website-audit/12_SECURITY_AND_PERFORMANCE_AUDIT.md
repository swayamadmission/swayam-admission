# SWAYAM ADMISSION — COMPLETE TECHNICAL & FUNCTIONAL AUDIT
## 12. Security, Performance and Code Quality Audit

This document details the security vulnerabilities, performance bottlenecks, and code quality issues discovered during the audit. Every issue includes the affected file path, severity rating, and concrete remediation instructions.

---

### 1. Severity Classification

- **CRITICAL**: Immediate vulnerability enabling authentication bypass, privilege escalation, or arbitrary credential forgery.
- **HIGH**: Substantial flaw compromising system integrity, release gating, or sensitive student PII.
- **MEDIUM**: Significant performance bottleneck, architectural debt, or operational risk.
- **LOW**: Minor defect, localized redundancy, or missing best-practice configuration.
- **INFORMATIONAL**: Architectural observation regarding dependencies or hosting patterns.

---

### 2. Security Vulnerabilities Audit

#### Finding SEC-01: Hardcoded Fallback JWT Secret Key
- **Severity**: **CRITICAL**
- **Affected File**: `backend/src/auth/auth.module.ts` (lines 33-36)
- **Code Reference**:
  ```typescript
  JwtModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      secret: config.get<string>('JWT_SECRET') || 'swayam_super_secret_key',
      signOptions: { expiresIn: '7d' },
    }),
  })
  ```
- **Vulnerability Assessment**:
  If the `JWT_SECRET` environment variable fails to inject or is omitted during local/containerized deployments, the NestJS application falls back to `'swayam_super_secret_key'`. An attacker possessing this known string can craft valid JWT tokens with `role: "SUPER_ADMIN"`, granting complete administrative takeover.
- **Remediation**:
  Remove the fallback string. Require `JWT_SECRET` during bootstrap; throw an explicit fatal error (`Error('FATAL: JWT_SECRET must be configured.')`) if missing.

---

#### Finding SEC-02: Suppressed Test Failures in CI/CD Quality Gate
- **Severity**: **HIGH**
- **Affected File**: `.github/workflows/ci.yml` (line 69)
- **Code Reference**:
  ```yaml
  - name: Execute Deterministic Security & Reliability Tests
    working-directory: backend
    run: |
      npm test -- --passWithNoTests || true
  ```
- **Vulnerability Assessment**:
  The `|| true` operator forces an exit code of `0` even when all 18 test suites fail. Broken business logic, security regressions, or authorization bugs can be merged and deployed to production without failing the GitHub Actions build gate.
- **Remediation**:
  Remove `|| true`. Fix the underlying NestJS dependency injection mocks in `*.spec.ts` files so tests pass deterministically.

---

#### Finding SEC-03: Development OTP Bypass in Authentication Service
- **Severity**: **HIGH**
- **Affected File**: `backend/src/auth/auth.service.ts` (lines 412-425)
- **Code Reference**:
  ```typescript
  if (process.env.ENABLE_DEV_OTP === 'true' && (code === '123456' || code === '000000')) {
    // Static OTP bypass accepted without database verification
    return true;
  }
  ```
- **Vulnerability Assessment**:
  If `ENABLE_DEV_OTP` is accidentally set to `'true'` in staging or production, any account can be accessed via mobile OTP using `'123456'`.
- **Remediation**:
  Add an explicit environment guard:
  ```typescript
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_OTP === 'true')
  ```

---

#### Finding SEC-04: Helmet Middleware Installed but Unused in Bootstrap
- **Severity**: **HIGH**
- **Affected File**: `backend/src/main.ts` (lines 20-27)
- **Code Reference**:
  ```typescript
  // Security Headers Middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  ```
- **Vulnerability Assessment**:
  `helmet` is installed in `backend/package.json` (`"helmet": "^8.2.0"`), but `app.use(helmet())` is **not called**. While basic headers are manually added, critical defenses—including Content Security Policy (CSP), Strict-Transport-Security (HSTS), and X-XSS-Protection—are absent.
- **Remediation**:
  Initialize `app.use(helmet({ contentSecurityPolicy: false }))` (or with appropriate directives) in `main.ts`.

---

#### Finding SEC-05: Unbounded 7-Day Access Token Lifetime
- **Severity**: **MEDIUM**
- **Affected File**: `backend/src/auth/auth.module.ts` (line 36)
- **Code Reference**:
  `signOptions: { expiresIn: '7d' }`
- **Vulnerability Assessment**:
  Access tokens are valid for 7 continuous days. If an access token is compromised (via browser extension, XSS, or shared terminal), an attacker retains access for 168 hours regardless of whether the user logs out.
- **Remediation**:
  Reduce access token expiry to `15m` (15 minutes). Rely on the existing refresh token rotation mechanism (`/v1/auth/refresh`) for continuous session maintenance.

---

### 3. Performance & Resource Bottlenecks Audit

#### Finding PERF-01: Monolithic Frontend Bundles Without Code Splitting
- **Severity**: **MEDIUM**
- **Affected Files**: `frontend/admin/vite.config.ts`, `frontend/user/vite.config.ts`, `frontend/admin/src/app/App.tsx`
- **Evidence**:
  Production builds yield:
  - Admin Portal: **`dist/assets/index-B32YZKO3.js` — 3,158.48 kB (3.16 MB minified)**
  - Student Portal: **`dist/assets/index-Zlyiq-nN.js` — 1,563.14 kB (1.56 MB minified)**
  Vite reports warning: `(!) Some chunks are larger than 500 kB after minification.`
- **Impact**:
  Because all 39 admin components and all 28 user pages are imported eagerly via static `import` statements, users must download the entire 3.16 MB JavaScript bundle before rendering the initial login screen. On Indian 3G/4G networks, this results in an unacceptable 4-8 second First Contentful Paint (FCP).
- **Remediation**:
  Implement route-level dynamic code splitting using `React.lazy()` and `Suspense`:
  ```typescript
  const Dashboard = React.lazy(() => import('./components/Dashboard'));
  const CollegesPage = React.lazy(() => import('./components/CollegesPage'));
  ```

---

#### Finding PERF-02: Fixed 5-Second In-Process Outbox Polling Overhead
- **Severity**: **MEDIUM**
- **Affected File**: `backend/src/notifications/durable-outbox.service.ts` (lines 64-66)
- **Code Reference**:
  ```typescript
  this.workerInterval = setInterval(() => {
    void this.processQueue();
  }, 5000);
  ```
- **Impact**:
  Every 5 seconds ($17,280\text{ queries/day}$), the backend executes a database query against Neon PostgreSQL:
  `SELECT * FROM "CommunicationDelivery" WHERE status = 'QUEUED'`.
  When traffic is idle, this generates unnecessary database compute wake-ups and connection pool churn on serverless Neon PostgreSQL.
- **Remediation**:
  Implement exponential backoff polling: when the queue is empty, increase the polling interval to 30s; reduce to 2s immediately when a new notification is enqueued via `enqueueJob()`.

---

#### Finding PERF-03: Missing Gzip/Brotli Compression Middleware
- **Severity**: **LOW**
- **Affected File**: `backend/src/main.ts`
- **Evidence**:
  `compression` is present in `package.json` (`"compression": "^1.8.1"`), but `app.use(compression())` is never registered in `main.ts`.
- **Impact**:
  Large JSON API payloads (e.g. `GET /v1/colleges` returning 500KB of raw text) are transmitted uncompressed if proxy-level compression is bypassed.
- **Remediation**:
  Add `import compression from 'compression'; app.use(compression());` to `main.ts`.

---

### 4. Code Quality & Architectural Debt Audit

#### Finding CODE-01: Complete Abandonment of `frontend/shared`
- **Severity**: **MEDIUM**
- **Affected Directory**: `frontend/shared/`
- **Evidence**:
  Directory contains 5 empty subdirectories (`components`, `constants`, `hooks`, `types`, `utils`) containing **0 files**.
- **Impact**:
  Identical type definitions, API interfaces, date utilities, and Axios error transformers are manually copy-pasted across `frontend/admin` and `frontend/user`.
- **Remediation**:
  Migrate shared DTOs, API contracts, and utility functions into `frontend/shared/` and reference them via Vite aliases (`@shared/*`).

---

#### Finding CODE-02: 0-Byte Zombie Files in `backend/src/applications/`
- **Severity**: **LOW**
- **Affected Directory**: `backend/src/applications/`
- **Evidence**:
  Five completely empty 0-byte files exist on disk:
  - `applications.controller.ts` (0 bytes)
  - `applications.module.ts` (0 bytes)
  - `applications.service.ts` (0 bytes)
  - `dto/create-application.dto.ts` (0 bytes)
  - `dto/update-status.dto.ts` (0 bytes)
- **Impact**:
  Confuses developers navigating the codebase. The real module is singular (`backend/src/application/`).
- **Remediation**:
  Safely delete the `backend/src/applications/` directory.

---

#### Finding CODE-03: 17 Unmounted Duplicate / Abandoned Controllers
- **Severity**: **MEDIUM**
- **Affected Files**:
  - `career/career.controller.ts` (duplicate of `hr/careers.controller.ts`)
  - `exam/exam.controller.ts` (duplicate of `exams/exams.controller.ts`)
  - `scholarship/scholarship.controller.ts` (duplicate of `scholarships/scholarships.controller.ts`)
  - `admission-workflow/admission-workflow.controller.ts`
  - `modules/cms/cms.controller.ts`, `modules/homepage/homepage.controller.ts`, `modules/media/media.controller.ts`, `modules/navigation/navigation.controller.ts`, `modules/pages/pages.controller.ts`, `modules/seo/seo.controller.ts`
- **Impact**:
  Over 37 API endpoints exist in source code that are dead code, never mounted in `AppModule`, yet consume developer cognitive load and maintenance time.
- **Remediation**:
  Archive or delete unmounted duplicate controller trees.

