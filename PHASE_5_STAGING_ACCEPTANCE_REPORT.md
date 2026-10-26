# SWAYAM ADMISSION — PHASE 5 STAGING ACCEPTANCE REPORT

**Document ID:** SWAYAM-PHASE-5-STAGING-ACCEPTANCE  
**Date:** October 21, 2026  
**Staging Decision:** **READY FOR STAGING ACCEPTANCE** (Production Go-Live on Hold Pending Dedicated Email Relay)  
**Evaluator:** Antigravity Senior DevOps, Security & QA Reliability Engineering  

---

## 1. Staging Target Environments & Connectivity Status

| Component | Target URL | Hosting Provider | Connectivity Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Backend REST API** | `https://swayam-admission.onrender.com/v1` | Render | HTTP 200 OK, latency ~320ms, database queries operational | **PASS** |
| **Admin & ERP Portal** | `https://swayam-admission-eg2x.vercel.app` | Vercel | Production bundle builds cleanly, assets mapped | **PASS** |
| **Public & Student Portal** | `https://swayam-admission.vercel.app` | Vercel | Production bundle builds cleanly, catalog routes mapped | **PASS** |
| **Database** | PostgreSQL 16 (Serverless) | Neon | Connection pool operational, zero schema drift | **PASS** |

---

## 2. CORS Preflight & Security Allowlist Validation

Live preflight tests were dispatched directly against the deployed Render backend API (`https://swayam-admission.onrender.com/v1`):

| Tested Origin | Request Method | Expected Behavior | Actual Response Headers | Status |
| :--- | :--- | :--- | :--- | :--- |
| `https://swayam-admission-eg2x.vercel.app` | `OPTIONS` | Allowed with credentials | `access-control-allow-origin: https://swayam-admission-eg2x.vercel.app`, `access-control-allow-credentials: true` | **PASS** |
| `https://swayam-admission.vercel.app` | `OPTIONS` | Allowed with credentials | `access-control-allow-origin: https://swayam-admission.vercel.app`, `access-control-allow-credentials: true` | **PASS** |
| `https://unapproved-hacker-site.com` | `OPTIONS` | Denied | No `access-control-allow-origin` header returned (fail-closed HTTP 404) | **PASS** |
| Arbitrary `*.vercel.app` Subdomain | `OPTIONS` | Denied | Insecure wildcard regex removed; rejected | **PASS** |

---

## 3. Authentication & Employee Lifecycle Workflows

| Scenario | Scope | Expected Behavior | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Employee Activation Link** | Employee | Activation URL generated on `https://swayam-admission-eg2x.vercel.app` without temporary plaintext password | 24-hour single-use token generated; temporary password omitted | **PASS** |
| **Employee Account Activation** | Employee | Password setup with bcrypt hashing; account becomes ACTIVE | Verified, status transitions to ACTIVE, hash verified | **PASS** |
| **Employee Password Reset (Self-service)** | Employee | OTP sent to registered personal email; masked confirmation | Anti-enumeration message returned, personal email masked | **PASS** |
| **Protected Account Recovery** | Admin | Admins blocked from self-service reset; requires IAM admin | Rejection enforced with explicit error message | **PASS** |
| **Session Invalidation on Reset** | Auth | All refresh tokens and active sessions revoked upon password change | Active refresh tokens count = 0, device sessions = 0 | **PASS** |
| **Single-Use Link Enforcement** | Auth | Used or expired links cannot be re-used | Second attempt rejected with UnauthorizedException | **PASS** |
| **Student Registration Strictness** | Student | Unverified email cannot log in where verification required | `emailVerified: false`, `emailVerifiedAt: null` | **PASS** |
| **Duplicate Email Conflict** | Student | Attempt to change email to existing user rejected | Throws ConflictException (HTTP 409) | **PASS** |
| **Dev Secret Disclosure Prevention** | Security | In `NODE_ENV=production`, OTPs and reset tokens never leaked in API response | `shouldExposeDevSecret()` returns `false` | **PASS** |

---

## 4. Notifications, Outbox & Provider Verification

| Component / Scenario | Verification Mode | Expected Behavior | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SMTP Handshake** | Live Provider | Authenticate with `smtp.gmail.com:587` via STARTTLS | Successful authentication with Google SMTP | **PASS** |
| **SMTP Live Transmission** | Live Provider | Deliver test message to authorized mailbox | Google SMTP 550-5.4.5: Daily user sending limit exceeded on personal `@gmail.com` tier | **BLOCKED** |
| **Outbox Quota Circuit Breaker** | Automated / Live | Trigger 15-minute cooldown on 550 error; retain queued messages without burning retries | 15m cooldown activated; delivery preserved in QUEUED with `PROVIDER_QUOTA_EXCEEDED` | **PASS** |
| **Exponential Backoff** | Automated | Retry attempts enforce increasing backoff delay (30s, 2m, 10m) | Outbox worker skips jobs whose backoff delay has not elapsed | **PASS** |
| **Auth Message Expiry (TTL)** | Automated | Messages older than validity TTL (5m/15m/60m) suppressed | Marked FAILED with `AUTH_MESSAGE_EXPIRED` | **PASS** |
| **Superseded Code Suppression** | Automated | Older authentication requests superseded by newer requests | Older job marked FAILED with `AUTH_MESSAGE_SUPERSEDED` | **PASS** |
| **Admin Outbox Recovery** | Automated | Manual cooldown reset and recovery of quota-blocked deliveries | Deliveries reset to QUEUED, cooldown cleared | **PASS** |
| **Webhook Challenge Token** | Automated | Fail-closed GET challenge rejection when verify token is wrong or absent | Throws UnauthorizedException (HTTP 401) | **PASS** |
| **Webhook POST Signature** | Automated | Reject invalid signature; accept valid HMAC SHA256 header | Verified sha256 HMAC payload signature | **PASS** |
| **Fast2SMS Gateway** | Config Check | Detect if API key is present in DB or environment | Configured when DB record populated; UNCONFIGURED otherwise | **PASS** |
| **Meta WhatsApp Cloud API** | Config Check | Detect phone number ID & access token | Verified UNCONFIGURED in test environment | **NOT TESTED (UNCONFIGURED)** |

---

## 5. Admin Monitoring & Observability

Live testing of admin endpoints (`/admin/otp-settings/dashboard`, `/admin/otp-settings/delivery-stats`) confirmed:
- **Queue Depth:** Live count of pending jobs in `CommunicationDelivery`.
- **Stuck Jobs in SENDING:** Monitored and reconciled via crash recovery worker.
- **24-Hour Statistics:** Accurate aggregation of sent, delivered, and failed counts.
- **PII Masking:** Recipient emails masked as `r***a@example.com`; recipient phone numbers masked as `+91****3210`.
- **Audit Logging:** Every configuration change, test dispatch, and recovery event persists to `AuditLog`.

---

## 6. Comprehensive Test Summary Table

| Category | Total | PASS | FAIL | BLOCKED | NOT TESTED |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Live Staging Connectivity & CORS** | 4 | 4 | 0 | 0 | 0 |
| **Public Catalog & Data APIs** | 1 | 1 | 0 | 0 | 0 |
| **Authentication & Employee E2E** | 16 | 16 | 0 | 0 | 0 |
| **Queue Safety, TTL & Circuit Breakers** | 5 | 5 | 0 | 0 | 0 |
| **Admin Controls & PII Masking** | 2 | 2 | 0 | 0 | 0 |
| **Webhooks & Provider Health** | 4 | 3 | 0 | 0 | 1 (Meta Cloud API live) |
| **Live SMTP Outbound Dispatch** | 1 | 0 | 0 | 1 (Google Quota) | 0 |
| **Production Package Builds** | 3 | 3 | 0 | 0 | 0 |
| **TOTAL** | **36** | **34** | **0** | **1** | **1** |

---

## 7. Release Recommendation

### **STATUS: READY FOR STAGING ACCEPTANCE**

**Justification:**
1. All three application packages (Backend API, Admin Frontend, User Frontend) compile cleanly with **zero errors**.
2. Live staging connectivity between Render backend and Vercel frontends was verified with strict, credentialed CORS allowlists and zero wildcards.
3. Critical outbox safety mechanisms (exponential backoff, quota circuit breaker, auth TTL expiry, superseded code suppression) prevent retry storms and credential replay.
4. **Production Go-Live Precondition:** Live outbound email delivery remains blocked solely by Google's personal free-tier daily sending quota (`550-5.4.5`). Before official production launch, provision a dedicated transactional mail relay (Amazon SES or SendGrid).
