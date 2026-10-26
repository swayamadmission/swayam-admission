# SWAYAM ADMISSION — PHASE 4 PRODUCTION GO-LIVE CHECKLIST
## Pre-Flight Verification, Provider Credentials, Deployment Runbook & Operational Runbook

**System:** Swayam Admission Platform  
**Target Environment:** Production (Render Backend + Neon PostgreSQL + Vercel Frontends)  
**Version:** Phase 4 Release Candidate  
**Last Updated:** October 20, 2026  

---

## 1. Pre-Flight Configuration & Environment Secrets Audit

Before triggering a production build and deployment, verify all environment variables in the **Render Web Service Dashboard** (Environment tab).

### Mandatory Core Services:
- [ ] `NODE_ENV=production` (Critical: Disables development code disclosure, ensures secure cookie policies and production logging)
- [ ] `PORT=10000` (Render defaults to 10000; Ensure service listens on `0.0.0.0`)
- [ ] `DATABASE_URL` (Neon PostgreSQL pooled connection string with `?sslmode=require`)
- [ ] `JWT_SECRET` (Cryptographically secure random string, minimum 32 characters)
- [ ] `REFRESH_TOKEN_SECRET` (Cryptographically secure random string, distinct from `JWT_SECRET`)
- [ ] `ENABLE_DEV_OTP=false` (Must be false or unset in production)

### CORS & Frontend Domains:
- [ ] `CORS_ORIGIN` (Comma-separated production origins, e.g.: `https://admin.swayamadmission.in,https://swayamadmission.in`)
- [ ] `FRONTEND_URL=https://swayamadmission.in`
- [ ] `ADMIN_URL=https://admin.swayamadmission.in`
- [ ] `ADMIN_PORTAL_URL=https://admin.swayamadmission.in`
- [ ] `ERP_PORTAL_URL=https://admin.swayamadmission.in`

### Email Provider (Google Workspace / Gmail SMTP):
- [ ] `SMTP_HOST=smtp.gmail.com`
- [ ] `SMTP_PORT=587` (For TLS/STARTTLS) OR `465` (For direct SSL/TLS)
- [ ] `SMTP_SECURE=false` (Must be `false` if port 587; `true` if port 465)
- [ ] `SMTP_USER=swayamadmissions@gmail.com` (Or your authorized workspace sender email)
- [ ] `SMTP_PASSWORD` (16-character Google App Password with 2-Step Verification active; spaces stripped)
- [ ] `SMTP_FROM_EMAIL=swayamadmissions@gmail.com`
- [ ] `SMTP_FROM_NAME="Swayam Admission"`

### Meta WhatsApp Business Cloud API:
- [ ] `WHATSAPP_PHONE_NUMBER_ID` (Found in Meta Developer Portal -> WhatsApp -> API Setup)
- [ ] `WHATSAPP_ACCESS_TOKEN` (Permanent System User Access Token with `whatsapp_business_messaging` permissions)
- [ ] `WHATSAPP_API_VERSION=v20.0`
- [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (Secret string configured in Meta Webhooks subscription)
- [ ] `WHATSAPP_APP_SECRET` (Meta App Secret for `X-Hub-Signature-256` payload validation)

### Fast2SMS Gateway (SMS Delivery):
- [ ] `FAST2SMS_API_KEY` (Production API key from Fast2SMS Dev API console)
- [ ] `FAST2SMS_ROUTE=q` (Quick SMS) OR `dlt` (if registered DLT template and sender ID are active)
- [ ] `FAST2SMS_SENDER_ID` (Registered 6-character DLT sender ID, e.g., `SWAYAM`)
- [ ] `FAST2SMS_WEBHOOK_SECRET` (Optional shared callback signature secret)

---

## 2. Database Migration & Schema Integrity (Neon PostgreSQL)

- [ ] **Verify Connection Pooling:** Verify that the Render service connects through Neon's connection pooler (`-pooler` endpoint on port 5432 or 6543) to prevent connection starvation during peak traffic.
- [ ] **Run Safe Prisma Migrations:**
  ```bash
  npx prisma migrate deploy
  ```
  *(Never execute `prisma migrate reset` or `db push --force-reset` in production).*
- [ ] **Verify Table Indices:**
  Ensure composite indices exist for outbox performance:
  - `CommunicationDelivery` indexes: `[status]`, `[channel]`, `[createdAt]`, `[recipientId]`, `[providerMessageId]`.
  - `Notification` indexes: `[receiverId]`, `[createdAt]`.
  - `AuditLog` indexes: `[userId]`, `[action]`, `[createdAt]`.

---

## 3. Webhook Endpoint Registration & Verification

### Meta WhatsApp Cloud API Webhooks:
1. Navigate to **Meta for Developers** -> Your App -> **WhatsApp** -> **Configuration**.
2. Set **Callback URL**:  
   `https://api.swayamadmission.in/v1/webhook/whatsapp` (or your Render service domain).
3. Set **Verify Token**:  
   Input the value matching `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
4. Click **Verify and Save**. (Meta executes a GET request with `hub.challenge`; the controller responds with HTTP 200 echoing the challenge).
5. In **Webhook Fields**, subscribe to `messages`.

### Fast2SMS Delivery Callbacks:
1. Navigate to the Fast2SMS Dashboard -> Developer API Settings -> Delivery Report Webhook.
2. Enter Callback URL:  
   `https://api.swayamadmission.in/v1/webhook/fast2sms`
3. Save and send a test dispatch to confirm receipt.

---

## 4. Outbox Worker & Background Process Verification

- [ ] **Worker Initialization:** On backend startup, verify the application log includes:  
  `[DurableOutboxService] Starting Durable Outbox Worker background processor...`
- [ ] **Process Interval:** The background worker polls the PostgreSQL queue every 5 seconds.
- [ ] **Stale Crash Recovery:** Confirm that `recoverStaleSendingJobs()` executes periodically without throwing database deadlocks.
- [ ] **Zero Worker Crashing on P2025:** Confirm that concurrent record updates or deletions are caught safely with warning log:  
  `[OUTBOX UPDATE] Delivery ID ... no longer exists; skipped post-send update.`

---

## 5. Admin Monitoring & Provider Verification Runbook

Log into the Admin Portal (`https://admin.swayamadmission.in`) with an `ADMIN` or `SUPER_ADMIN` account.

1. **Navigate to Settings -> OTP & Notifications Settings (`/admin/otp-settings`):**
   - [ ] Verify **Email Gateway Status** displays `CONFIGURED` with host and port.
   - [ ] Verify **WhatsApp Gateway Status** displays `CONFIGURED` with Phone Number ID.
   - [ ] Verify **SMS Gateway Status** displays `CONFIGURED` with route and sender ID.
2. **Execute Live Provider Tests:**
   - [ ] Click **Test Email Delivery** -> Enter your authorized email -> Confirm receipt of test OTP in inbox.
   - [ ] Click **Test SMS Delivery** -> Enter a test 10-digit mobile number -> Confirm Fast2SMS delivery.
   - [ ] Click **Test WhatsApp Delivery** -> Enter a WhatsApp mobile number -> Confirm template delivery.
3. **Verify Observability Dashboard (`/api/v1/admin/otp-settings/delivery-stats`):**
   - [ ] Confirm `queueDepth` displays active pending queue count.
   - [ ] Confirm `oldestQueuedAgeSeconds` is below 30s during normal operation.
   - [ ] Confirm `stuckSendingCount` is 0.
   - [ ] Confirm the 10 recent delivery audit rows display properly masked emails (`u***r@domain.com`) and phone numbers (`+91****3210`).

---

## 6. Security Posture & Zero-Leakage Policy

- [ ] **Zero Dev Secret Disclosure:** Ensure API responses for `/auth/login`, `/auth/verify-otp`, and `/auth/register` never contain `devOtp`, `devCode`, or plaintext passwords.
- [ ] **Audit Trail Retention:** Verify that all authentication, provider test, and password reset actions generate persistent rows in `AuditLog` with IP addresses and user agents.
- [ ] **Rate Limiting & Cooldowns:**
  - 30-second resend cooldown strictly enforced for registration and verification OTPs.
  - 60-second cooldown strictly enforced for password recovery OTPs.
  - 5-attempt limit per OTP before requiring regeneration.

---

## 7. Post-Deployment Smoke Test Commands

Run the automated verification suite against the staging/production instance or execute via Render Shell:

```bash
# 1. Run Phase 4 Go-Live Verification Suite
node -r ts-node/register/transpile-only scripts/test_phase4_verification.ts

# 2. Run Phase 3 Regression Verification Suite
node -r ts-node/register/transpile-only scripts/test_phase3_verification.ts

# 3. Run Employee Recovery End-to-End Suite
node -r ts-node/register/transpile-only scripts/test_employee_recovery_full_e2e.ts
```

All suites must complete with:
```
TOTAL SCENARIOS: 10/10 (or 16/16)
PASSED: 100%
FAILED: 0
```

---

## 8. Rollback & Contingency Plan

In the event of an unrecoverable provider outage or deployment failure:
1. **Rollback Release:** In the Render dashboard, click **Deploys** -> Select the previous stable commit -> Click **Rollback**.
2. **Fallback to Outbox Retention:** If SMTP or WhatsApp gateways degrade, emails remain safely persisted in the PostgreSQL `CommunicationDelivery` table with `status: QUEUED` or `status: SENDING`. Once provider connectivity restores, the outbox worker automatically retries with exponential backoff without message loss.
3. **Emergency Support Contacts:**
   - Fast2SMS Support: https://www.fast2sms.com/support
   - Meta Business Support: https://business.facebook.com/support
   - Google Cloud / Workspace Admin: https://admin.google.com
