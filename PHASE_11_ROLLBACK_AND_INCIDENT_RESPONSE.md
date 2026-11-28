# SWAYAM ADMISSION — PHASE 11 ROLLBACK AND INCIDENT RESPONSE RUNBOOK
## Emergency Procedures, Failure Containment & Disaster Mitigation

**Document Version:** 1.0.0  
**Effective Date:** 2026-11-01  
**Incident Commander:** Principal Software Architect & DevSecOps Lead  
**Repository Location:** `c:\Users\mdosa\OneDrive\Desktop\swayam-admission`  

---

## 1. Incident Severity Classification & Escalation Matrix

| Severity Level | Definition | Response SLA | Examples | Escalation Target |
|---|---|---|---|---|
| **SEV-1 (Critical)** | Core service down for all users; data corruption; active security compromise. | **< 15 minutes** | Database down, auth failure, leaked production secrets, site unreachable. | Lead Architect, DevSecOps Lead, CTO |
| **SEV-2 (Major)** | Major business workflow degraded; partial outage; payment or notification failure. | **< 45 minutes** | Razorpay webhooks failing, SMS OTP delayed, counselor lead queue stalled. | Senior Backend Engineer, Payment Lead |
| **SEV-3 (Minor)** | Non-blocking feature impaired; workaround exists; isolated UI glitch. | **< 4 hours** | Marketing campaign stats lag, minor CSS layout bug, non-critical email delay. | Frontend Lead, Support Team |

---

## 2. Emergency Failure Playbooks

### 2.1 Playbook A: Failed Frontend Deployment (Vercel)
- **Triggers**: White screen on load, broken SPA routing, JavaScript bundle crash, CORS blocks.
- **Immediate Containment**:
  1. Open [Vercel Dashboard](https://vercel.com).
  2. Select the affected project (`swayam-admission` or `swayam-admission-eg2x`).
  3. Navigate to **Deployments**.
  4. Locate the immediately preceding production deployment.
  5. Click the three-dots menu (`...`) and select **Instant Rollback**.
- **Verification**: Refresh browser with cache bypass (`Ctrl + Shift + R`). Verify root page loads cleanly.
- **Estimated Recovery Time**: **< 1 minute**.

---

### 2.2 Playbook B: Failed Backend Deployment (Render)
- **Triggers**: Application crash loop on boot, 502 Bad Gateway, uncaught exception in startup hooks.
- **Immediate Containment**:
  1. Open [Render Dashboard](https://dashboard.render.com).
  2. Select the `swayam-admission` Web Service.
  3. Click **Events** tab.
  4. Find the last deployment that reported `Live`.
  5. Click **Rollback to this deploy**.
- **Post-Rollback Verification**:
  - Check `https://swayam-admission.onrender.com/v1/health/liveness` returns 200.
  - Review Render runtime logs for error root cause.
- **Estimated Recovery Time**: **~2 minutes**.

---

### 2.3 Playbook C: Database Connectivity Failure or Schema Corruption (Neon)
- **Triggers**: Backend returns 503 on `/health/readiness`, database pool timeout, accidental schema destruction.
- **Immediate Containment**:
  > [!CAUTION]
  > **NEVER run `npx prisma migrate reset` or `db push --force-reset`.**
  1. Check Neon service status at [status.neon.tech](https://status.neon.tech).
  2. If Neon cloud is operational but data was corrupted:
     - Open Neon Console > **Branches**.
     - Create recovery branch from the timestamp prior to corruption (Scenario A in Backup Runbook).
     - Update `DATABASE_URL` in Render Web Service environment variables to point to the recovery branch.
     - Trigger manual deploy / restart in Render.
- **Verification**: Query `/health/readiness` until status returns `UP`.
- **Estimated Recovery Time**: **< 10 minutes**.

---

### 2.4 Playbook D: Payment Webhook Failure (Razorpay)
- **Triggers**: Students complete payment on bank portal but application remains in `PENDING` state; webhook signature errors in logs.
- **Immediate Containment**:
  1. Check Razorpay Dashboard > **Webhooks** for failure rate.
  2. If HMAC signatures fail:
     - Verify `RAZORPAY_WEBHOOK_SECRET` in Render matches the exact secret configured in Razorpay Dashboard.
     - Ensure no leading/trailing whitespace exists in the environment variable.
  3. **Manual Reconciliation**:
     - Run the reconciliation endpoint: `POST /payments/:id/reconcile` (Role: `ADMIN`).
     - Razorpay payments can be manually synchronized via Razorpay Payment ID.
- **Estimated Recovery Time**: **< 15 minutes**.

---

### 2.5 Playbook E: Communication Gateway Outage (Email, SMS, WhatsApp)
- **Triggers**: OTP delivery delays, worker queue stalled, `/health/worker` returns `DEGRADED`.
- **Immediate Containment**:
  1. Check [`/health/providers`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/health/health.controller.ts#L115) to identify the impaired gateway.
  2. Because the backend utilizes a `DurableOutbox` queue:
     - Messages are safely stored in PostgreSQL and will not be lost.
     - The worker automatically applies exponential backoff and pauses if quota is exhausted.
  3. If Gmail SMTP quota is reached: Switch `EMAIL_PROVIDER=SES` or update SMTP credentials in Render.
- **Estimated Recovery Time**: **< 20 minutes**.

---

### 2.6 Playbook F: Security Incident & Credential Leakage
- **Triggers**: API key or secret exposed in public repository, unexpected administrative access, token forgery.
- **Immediate Containment**:
  1. **Revoke Exposed Credentials Immediately**:
     - Invalidate database user password in Neon console.
     - Revoke AWS SES IAM keys in AWS IAM Console.
     - Regenerate Razorpay API keys in Razorpay Dashboard.
  2. **Rotate JWT Secret**:
     - Generate a new 64-character random string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
     - Update `JWT_SECRET` and `REFRESH_TOKEN_SECRET` in Render.
     - This immediately invalidates all active sessions platform-wide, neutralizing any forged or stolen tokens.
  3. **Audit Trail Review**:
     - Query `AuditLog` table: `SELECT * FROM "AuditLog" WHERE "createdAt" > NOW() - INTERVAL '24 hours' ORDER BY "createdAt" DESC;`.
- **Estimated Recovery Time**: **< 15 minutes**.

---

## 3. Post-Incident Review (PIR) Protocol

Following the resolution of any SEV-1 or SEV-2 incident, the engineering team must publish an incident post-mortem within 48 hours containing:
1. **Incident Summary**: Exact duration, user impact, affected components.
2. **Timeline of Events**: Chronological breakdown from detection to resolution.
3. **Root Cause Analysis (RCA)**: Technical explanation using the "5 Whys" methodology.
4. **Corrective & Preventive Actions (CAPA)**: Code hardening, monitoring alerts, or process adjustments required to eliminate recurrence.

