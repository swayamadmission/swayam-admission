# SWAYAM ADMISSION — PHASE 8 MONITORING & INCIDENT RESPONSE RUNBOOK
## Operational Signals, SRE Alerts, Outbox Diagnostics & Incident Remediation

**Document Version:** 1.0.0  
**Phase:** Phase 8 — SRE & Operational Monitoring  
**Target Architecture:** NestJS Backend, Render Hosting, Neon PostgreSQL, Outbox Worker  

---

## 1. Structured Logging Standards & Secret Sanitization

All backend logging complies with strict security and operational guidelines:

### Standards
1. **Sanitized Output:**
   - **Never Log Passwords:** Passwords, OTP codes, reset tokens, and API keys are strictly excluded or redacted (`***`).
   - **Masked PII:** Email addresses in logs are masked (e.g., `swa***@gmail.com`), phone numbers masked (e.g., `+91****3210`).
   - **Masked Connection Strings:** Connection strings strip credentials (`postgresql://****:****@...`).
2. **Severity Levels:**
   - `DEBUG`: Verbose query execution and outbox loop inspection (disabled in production).
   - `LOG`: Normal operational events (campaign created, delivery dispatched, user authenticated).
   - `WARN`: Recoverable anomalies (superseded OTP suppressed, soft bounce received, quota limit reached).
   - `ERROR`: Unhandled exceptions, database disconnects, or cryptographic webhook signature failures.
3. **Error Categorization:**
   - Distinction between **User Errors** (HTTP 4xx: invalid credentials, expired token) and **Infrastructure Failures** (HTTP 5xx: DB disconnect, SMTP handshake failure).

---

## 2. Health Check Monitoring Probes & Diagnostic Signals

| Endpoint | Probe Frequency | Expected Response | Alert Condition |
| :--- | :---: | :---: | :--- |
| **`/v1/health/liveness`** | Every 1–2 min | HTTP 200 `{ status: "UP" }` | 3 consecutive failures: Process crashed or OOM. |
| **`/v1/health/readiness`** | Every 1–2 min | HTTP 200 `{ status: "UP", database: "CONNECTED" }` | HTTP 503: Database unreachable or network severed. |
| **`/v1/health/worker`** | Every 5 min | HTTP 200 `{ status: "HEALTHY", queueStalled: false }` | `queueStalled: true` OR `stuckSendingCount > 5`: Outbox stalled. |
| **`/v1/health/providers`** | Every 15 min | HTTP 200 `{ email: { status: "CONFIGURED" } }` | `quotaBlocked: true`: Email sending halted by ESP. |

---

## 3. Incident Response Playbooks

---

### Incident 1: Backend Outage (Process Crash / 502 Bad Gateway)
**Symptoms:** Render returns `502 Bad Gateway`; `/v1/health/liveness` fails or times out.

**Diagnosis Steps:**
1. Check Render dashboard: `swayam-admission-backend` > **Logs**.
2. Look for exit codes (`SIGTERM`, `SIGKILL`, or `Out of memory: Kill process`).
3. Verify if recent deployment introduced unhandled startup exceptions.

**Remediation:**
1. **Restart Service:** Click **Manual Deploy** > **Restart Service** in Render.
2. **If Startup Exception:** Roll back to previous stable deploy immediately (see [CI/CD & Release Runbook](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/PHASE_8_CI_CD_AND_RELEASE_RUNBOOK.md)).
3. **If Out of Memory:** Verify `--max-old-space-size=4096` flag and upgrade instance memory tier.

---

### Incident 2: Database Connectivity Failure (`P1001` / Connection Timeout)
**Symptoms:** `/v1/health/readiness` returns HTTP 503; logs contain `Can't reach database server at ep-billowing-feather...`.

**Diagnosis Steps:**
1. Check Neon status at [status.neon.tech](https://status.neon.tech) for region `us-east-2`.
2. Inspect connection pool saturation in Neon Console > **Metrics**.
3. Verify Render environment variable `DATABASE_URL` matches the active branch.

**Remediation:**
1. **Restart Neon Compute:** In Neon Console, toggle compute endpoint to resume suspended instance.
2. **Recycle Backend Connections:** Restart Render service to flush stale pooled sockets.
3. **If Database Corrupted:** Execute point-in-time branch recovery to 15 minutes prior (see [Database Backup & Recovery Runbook](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/PHASE_8_DATABASE_BACKUP_AND_RECOVERY_RUNBOOK.md)).

---

### Incident 3: Outbox Queue Worker Stall (`status: DEGRADED`)
**Symptoms:** `/v1/health/worker` reports `queueStalled: true` or `oldestQueuedAgeSeconds > 3600`; notifications are not being received.

**Diagnosis Steps:**
1. Inspect outbox status via API:
   `curl https://swayam-admission.onrender.com/v1/health/worker`
2. Check if a delivery job is stuck in `SENDING` status without a timeout callback.
3. Check if `isQuotaCooldownActive: true`.

**Remediation:**
1. **Recover Stuck Jobs via Admin Endpoint:**
   Authenticate as Admin and call:
   `POST /v1/campaigns/outbox/recover-stuck`
   *(Automatically transitions jobs stuck in `SENDING` for > 15m back to `QUEUED`)*.
2. **If Quota Cooldown Active:**
   Review provider status before resetting:
   `POST /v1/campaigns/outbox/reset-cooldown`
3. **Retry Quota-Blocked Deliveries:**
   `POST /v1/campaigns/outbox/retry-quota-blocked`

---

### Incident 4: Email Provider Quota Exhaustion (`550-5.4.5`)
**Symptoms:** Outbox logs record `Daily user sending limit exceeded`; `EmailChannel` enters 15-minute persistent cooldown.

**Diagnosis Steps:**
1. Identify current provider: `curl https://swayam-admission.onrender.com/v1/health/providers`.
2. If `provider: GMAIL`, the consumer sending cap has been reached on `swayamadmissions@gmail.com`.
3. Verify that pending messages are safely retained in `QUEUED` status (not burning retries).

**Remediation:**
1. **Temporary:** Allow the 15-minute cooldown to hold, or wait for Google's 24-hour quota reset window.
2. **Permanent Resolution:** Cut over to **Amazon SES** or **SendGrid**:
   - Update Render environment variables with `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`, and `AWS_REGION` (or `SENDGRID_API_KEY`).
   - Trigger deployment. Outbox immediately resumes processing pending queue.

---

### Incident 5: Webhook Signature Rejection / Attack Spike
**Symptoms:** Logs show repeated `[SNS SSRF ATTEMPT] Blocked untrusted SigningCertURL` or `UnauthorizedException: Missing SendGrid signature`.

**Diagnosis Steps:**
1. Inspect source IP address and payload in Render logs.
2. Verify if legitimate provider webhook is misconfigured (e.g., SendGrid verification key changed in Twilio dashboard).
3. If an attacker is probing endpoints, verify that the fail-closed defense is rejecting them with 400/401.

**Remediation:**
1. **Confirm Fail-Closed:** The application handles untrusted webhooks safely without crash or SSRF.
2. **If Legitimate Key Changed:** Update `SENDGRID_WEBHOOK_VERIFICATION_KEY` or `WHATSAPP_WEBHOOK_SECRET` in Render dashboard.
3. **If Distributed Attack:** Add IP rate-limiting or Cloudflare WAF protection in front of Render domain.

---

### Incident 6: Suspicious Authentication Flood / Brute-Force
**Symptoms:** Rapid spikes in failed login attempts for employee or student accounts.

**Diagnosis Steps:**
1. Check `AuditLog` table for multiple `AUTH_LOGIN_FAILED` entries from identical IP or targeting single identifier.
2. Verify that `@nestjs/throttler` has engaged (returning HTTP 429 Too Many Requests).

**Remediation:**
1. Global `ThrottlerGuard` automatically clamps requests at 120 req/min.
2. Administrative accounts have self-service recovery disabled (`isProtected: true`), preventing automated account takeovers.
3. If necessary, lock compromised user account via Admin portal: set `isActive: false`.
