# SWAYAM ADMISSION — PHASE 8 PLATFORM-WIDE SECURITY AUDIT REPORT
## Authentication, Authorization, Webhook Defense, Rate Limiting & Session Security

**Document Version:** 1.0.0  
**Phase:** Phase 8 — DevSecOps & Security Hardening  
**Audit Scope:** Backend (NestJS), Database (Neon PostgreSQL), Frontends (React + Vite), Webhook Endpoints  
**Audit Date:** October 22, 2026  

---

## 1. Executive Summary

A comprehensive platform-wide security audit was conducted covering all operational layers: authentication, role-based access control (RBAC), API boundary security, rate limiting, cryptographic webhook signatures, Server-Side Request Forgery (SSRF) defense, and frontend session management.

All critical vulnerabilities identified during audit reviews have been remediated with verified fail-closed defenses.

---

## 2. Authentication & Authorization Security Findings

### 2.1 JWT Signature & Expiry Validation
- **Access Tokens:** Signed using `JWT_SECRET` with 15-minute expiration (`15m`). Evaluated via NestJS `JwtAuthGuard`.
- **Refresh Tokens:** Signed using `REFRESH_TOKEN_SECRET` with 7-day expiration (`7d`). Stored in database table `UserDeviceSession`.
- **Session Revocation:** Verified in Scenario 11 of `test_employee_recovery_full_e2e.ts`. Upon password reset or account recovery, all active device sessions and refresh tokens are atomically revoked (`revokedAt: new Date()`), terminating all existing sessions immediately.

### 2.2 Employee ID & Password Authentication
- **Multi-Identifier Login:** Employees can authenticate using either their official email or their canonical Employee ID (e.g., `SWY-EMP-0204`).
- **Password Hashing:** Passwords hashed using `bcrypt` with work factor 10.
- **Account Status Enforced:** Inactive (`isActive: false`) or unverified accounts are strictly rejected with HTTP 401 Unauthorized.

### 2.3 Role-Based Access Control (RBAC)
- Enforced via `@Roles()` decorator and `RolesGuard`.
- Strict hierarchical permissions:
  - `SUPER_ADMIN`: System-wide access, provider configuration, audit log overrides.
  - `ADMIN`: User management, campaign review, employee activation.
  - `COUNSELOR` / `SENIOR_COUNSELOR`: Assigned student applications, leads, counseling records.
  - `STUDENT`: Read-only access to own profile, applications, and documents.
- **Anti-Privilege Escalation:** Verified in test suites: counselors attempting to trigger administrative recovery APIs or alter provider settings receive HTTP 403 Forbidden.

### 2.4 OTP & Account Recovery Hardening
- **OTP Expiration:** 10 minutes strictly enforced via `DurableOutboxService` TTL logic.
- **Resend Cooldown:** 60-second cooldown strictly enforced. Attempting to resend before 60s triggers HTTP 429 Too Many Requests.
- **Max Attempt Limit:** Maximum 5 failed validation attempts before the OTP is permanently invalidated.
- **Single-Use Semantics:** Once an OTP or reset token is consumed, its `usedAt` timestamp is set in a database transaction; replay attempts return HTTP 400 Bad Request.
- **Anti-Enumeration:** Requesting OTP or recovery for a non-existent email returns a generic success message without leaking account existence.

---

## 3. Webhook Cryptographic Security & SSRF Defense

### 3.1 AWS SNS Webhook Validation (`Workstream E`)
- **Vulnerability Addressed:** Attackers could send spoofed SNS notifications with arbitrary `SigningCertURL` or `SubscribeURL` pointing to malicious servers or AWS Instance Metadata Service (`169.254.169.254`).
- **Remediation Implemented in Phase 8:**
  1. `validateSnsCertificateUrl(urlStr)`:
     - Enforces `https:` scheme.
     - Enforces hostname regex `^sns\.[a-zA-Z0-9-]+\.amazonaws\.com(\.cn)?$`.
     - Enforces `.pem` file extension.
     - **Rejects query parameters (`?token=...`) and hash fragments**, defeating URL injection.
  2. `fetchSnsCertificate(urlStr)`:
     - Fetches certificate dynamically over HTTPS with 5,000ms timeout.
     - **Limits certificate payload to 128 KB** to prevent memory exhaustion / compression bombs.
     - Caches certificates in-memory to prevent external network request loops.
  3. `validateSnsSubscribeUrl(urlStr)`:
     - Enforces HTTPS and official AWS SNS domain before allowing any subscription confirmation request.
  4. Safe Subscription Confirmation:
     - Automatically rejects arbitrary GET auto-navigation unless explicitly enabled via `AWS_SNS_AUTO_CONFIRM_SUBSCRIPTION=true`. Returns `SUBSCRIPTION_CONFIRMATION_RECEIVED` for administrative audit.

### 3.2 SendGrid Signed Webhook Validation
- Validates SendGrid webhook signatures against `SENDGRID_WEBHOOK_VERIFICATION_KEY` using ECDSA (or HMAC-SHA256 for standard webhooks).
- **Anti-Replay Protection:** Rejects any webhook payload with timestamp older than 10 minutes (`> 600 seconds`), defeating replay attacks.
- **Missing Header Fail-Closed:** Missing `X-Twilio-Email-Event-Webhook-Signature` immediately returns HTTP 401 Unauthorized.

### 3.3 Recipient Cross-Attribution Guard
- When a delivery callback arrives with `providerMessageId`, the system queries the internal `CommunicationDelivery` record and verifies that `recipientEmail` on the delivery record matches the incoming callback recipient.
- Prevents malicious actors from reporting fake delivery successes or bounces for unrelated users.

---

## 4. API & Network Security

### 4.1 CORS Enforcement
- Live deployed API allows only whitelisted frontend testing domains:
  - `https://swayam-admission-eg2x.vercel.app` (Admin portal)
  - `https://swayam-admission.vercel.app` (Student portal)
- Configured with `credentials: true`.
- Unapproved origins (e.g., `https://unapproved-hacker-site.com`) are denied CORS headers with fail-closed behavior (verified live in Phase 5 test suite).

### 4.2 Application-Wide Rate Limiting
- Configured `@nestjs/throttler` in `AppModule` with global `ThrottlerGuard`.
- Default: **120 requests per 60-second window** per IP address.
- Sensitive endpoints (login, OTP send/verify, password recovery) are protected against automated brute-force attacks.
- Internal health checks (`/v1/health`, `/v1/health/liveness`, `/v1/health/readiness`, `/v1/health/providers`, `/v1/health/worker`) are decorated with `@SkipThrottle()` to ensure Render health check probes are never blocked.

### 4.3 Database SQL Injection Protection
- The backend relies exclusively on **Prisma ORM**, which generates parameterized SQL queries across all relational operations.
- The single raw SQL query in `HealthController` uses tagged template literal:
  `this.prismaService.$queryRaw\`SELECT 1\``
  which Prisma automatically parameterizes, guaranteeing 0% SQL injection exposure.

---

## 5. Frontend Session Security Assessment

### Findings
- Current frontend architectures (`@swayam/admin` and `@swayam/user`) store JWT access tokens in browser `localStorage` to persist user sessions across page reloads.
- **Risk Assessment:**
  - `localStorage` is accessible to JavaScript running within the same origin. In the presence of a cross-site scripting (XSS) vulnerability, an injected script could read the token.
  - However, both applications use React 18, which automatically escapes rendered text, and neither frontend employs `dangerouslySetInnerHTML`.
- **Recommended Roadmap Enhancement:**
  - Transition authentication refresh tokens to `httpOnly`, `Secure`, `SameSite=Lax` cookies set by the backend NestJS server.
  - Retain short-lived access tokens (15m TTL) in memory (React State / Context) to eliminate XSS token persistence entirely.
  - This migration should be scheduled during custom domain cutover when both frontends and backend share a common top-level domain (`*.swayamadmission.com`), enabling straightforward cross-subdomain cookie sharing.

---

## 6. Security Audit Matrix

| Security Control | Implementation | Verification Status | Severity |
| :--- | :--- | :---: | :---: |
| **JWT Expiry & Signature** | 15m access, 7d refresh | **VERIFIED** | High |
| **Session Revocation on Reset** | All active sessions revoked | **VERIFIED** | High |
| **RBAC Route Guards** | `RolesGuard` on sensitive routes | **VERIFIED** | Critical |
| **OTP Cooldown & Attempt Limit** | 60s cooldown, 5 attempts max | **VERIFIED** | High |
| **Anti-Enumeration on Recovery** | Generic response on unknown email | **VERIFIED** | Medium |
| **AWS SNS Certificate SSRF Defense** | Domain regex, HTTPS, 128KB max | **VERIFIED** | Critical |
| **SendGrid Webhook Verification** | Cryptographic signature & anti-replay | **VERIFIED** | High |
| **Cross-Attribution Protection** | Recipient matching on delivery callbacks | **VERIFIED** | High |
| **CORS Allowlist Enforcement** | Strict origin matching (no wildcard) | **VERIFIED** | High |
| **Global Throttling** | 120 req/min via `ThrottlerGuard` | **VERIFIED** | Medium |
| **PII Masking in Logs & APIs** | Email & phone numbers masked | **VERIFIED** | Medium |
