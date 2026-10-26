# Swayam Admission — Phase 3 Production Manual Configuration Checklist

**Document Version:** 1.0.0  
**Target Environment:** Production (Render Backend, Neon PostgreSQL, Vercel / Cloudflare Admin & User Frontends)  
**Security Classification:** Highly Sensitive — Contains Zero Raw Secrets (Template & Procedure Only)  

---

## 1. Executive Overview & Purpose

Phase 3 transitions Swayam Admission from simulated/in-memory notification workflows to enterprise-grade, resilient, database-backed durable dispatching with genuine third-party delivery providers:
1. **Durable Database Outbox Worker:** Persistent transactional queueing (`CommunicationDelivery` + `Notification`) eliminating message loss on server restarts.
2. **Hardened Gmail SMTP (IPv4):** Forced IPv4 socket family (`family: 4`) with 10s connection/greeting timeouts and 15s socket timeout, eliminating Render/Docker IPv6 `ENETUNREACH` socket dropouts.
3. **Genuine Meta WhatsApp Business Cloud API:** Direct HTTP dispatch (`graph.facebook.com/v20.0`) with graceful `UNCONFIGURED` fallback.
4. **Genuine Fast2SMS Gateway:** Real SMS delivery (`fast2sms.com/dev/bulkV2`) with DLTRoute/Quick SMS support and graceful `UNCONFIGURED` fallback.
5. **Masking & Credential Protection:** Prevention of `'********'` masked placeholder persistence in the Admin OTP configuration portal.

Use this operational checklist to provision, configure, verify, and monitor notification providers across production environments.

---

## 2. Production Environment Variable Reference

Configure these variables in your deployment hosting dashboards (e.g., Render Environment Settings, Vercel Project Environment Variables) or `backend/.env`.

> [!CAUTION]
> Never commit actual passwords, App Passwords, or API tokens to source control. Always use environment variables or configure them securely via the Admin OTP Settings portal.

### 2.1 Core Application & Database

| Variable Name | Required | Default / Example | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enables production security policies (e.g. disables dev OTP exposure). |
| `PORT` | **Yes** | `5000` | Backend API port. |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@ep-xyz.neon.tech/swayam?sslmode=require` | Neon pooled PostgreSQL connection string. |
| `DIRECT_URL` | Optional | `postgresql://user:pass@ep-xyz.neon.tech/swayam?sslmode=require` | Direct PostgreSQL connection for migrations. |
| `PORTAL_URL` | **Yes** | `https://admin.swayamadmission.com` | Base URL for staff & employee portal activation links. |
| `FRONTEND_ADMIN_URL` | **Yes** | `https://admin.swayamadmission.com` | Administrator dashboard origin. |
| `FRONTEND_USER_URL` | **Yes** | `https://portal.swayamadmission.com` | Student application portal origin. |

---

### 2.2 Gmail SMTP Email Provider (Production-Hardened)

The backend uses Nodemailer with forced IPv4 (`family: 4`) and strict timeouts to guarantee delivery over cloud providers like Render.

| Variable Name | Required | Example | Notes |
| :--- | :---: | :--- | :--- |
| `SMTP_HOST` | **Yes** | `smtp.gmail.com` | Primary SMTP host. |
| `SMTP_PORT` | **Yes** | `465` (or `587`) | Port 465 uses SSL (`SMTP_SECURE=true`). Port 587 uses STARTTLS (`SMTP_SECURE=false`). |
| `SMTP_SECURE` | **Yes** | `true` | Must be `true` for port 465, `false` for port 587. |
| `SMTP_USER` | **Yes** | `admissions@swayamadmission.com` | Authoritative Gmail or Google Workspace sender address. |
| `SMTP_PASS` | **Yes** | `abcd efgh ijkl mnop` | **16-character Google App Password** (requires 2FA enabled on the Google Account). |
| `SMTP_FROM_EMAIL`| **Yes** | `admissions@swayamadmission.com` | From header email address. |
| `SMTP_FROM_NAME` | **Yes** | `Swayam Admission System` | Display sender name. |

---

### 2.3 Meta WhatsApp Business Cloud API

Direct integration with Meta Graph API for official WhatsApp OTP and transactional messages.

| Variable Name | Required | Example | Notes |
| :--- | :---: | :--- | :--- |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional* | `100654321098765` | Phone Number ID from Meta App Dashboard (WhatsApp > API Setup). |
| `WHATSAPP_ACCESS_TOKEN` | Optional* | `EAAB...` (Permanent System User Token) | System User Token with `whatsapp_business_messaging` permission. |
| `WHATSAPP_WABA_ID` | Optional | `100123456789012` | WhatsApp Business Account ID. |
| `WHATSAPP_API_VERSION` | Optional | `v20.0` | Meta Graph API Version (defaults to `v20.0`). |

*\* Can also be configured dynamically via the Admin OTP Settings UI (`/admin/settings/auth-otp`). If neither is configured, the system marks the channel as `UNCONFIGURED` and rejects mobile recovery safely.*

---

### 2.4 Fast2SMS SMS Gateway

Direct integration with Fast2SMS Bulk V2 API for OTP and transactional SMS delivery in India.

| Variable Name | Required | Example | Notes |
| :--- | :---: | :--- | :--- |
| `FAST2SMS_API_KEY` | Optional* | `f8a9b0c...` | Fast2SMS authorization key. |
| `FAST2SMS_ROUTE` | Optional | `otp` (or `dlt`) | Route type (`otp` for quick OTP, `dlt` for registered DLT templates). |
| `FAST2SMS_SENDER_ID`| Optional | `SWAYAM` | 6-character approved DLT Sender Header (if using `dlt` route). |

*\* Can also be configured dynamically via the Admin OTP Settings UI (`/admin/settings/auth-otp`).*

---

## 3. Provider Setup & Procurement Guides

### 3.1 Google Workspace / Gmail SMTP App Password Setup

1. Log into your Google Workspace or Gmail administrative account (e.g. `admissions@swayamadmission.com`).
2. Navigate to **Google Account Settings** (`myaccount.google.com`) > **Security**.
3. Under **How you sign in to Google**, ensure **2-Step Verification** is turned **ON**.
4. In the search bar at the top, search for **App passwords**.
5. Create a new App Password:
   - **App name:** `Swayam Admission Production Outbox`
   - Click **Create**.
6. Copy the generated **16-character password** (format: `xxxx xxxx xxxx xxxx`).
7. Enter this into Render under `SMTP_PASS` (remove spaces or keep as 16 characters) and set `SMTP_USER` to your Gmail address.

> [!NOTE]
> The Phase 3 codebase automatically forces IPv4 (`family: 4`) in `EmailChannel.getTransporter()`. This prevents the known issue where Render or Linux container egress attempts to route SMTP through IPv6 and encounters `connect ENETUNREACH 2607:f8b0:400e:c06::6d:465`.

---

### 3.2 Meta WhatsApp Business Cloud API Setup

1. Go to [developers.facebook.com](https://developers.facebook.com) and sign in.
2. Under **My Apps**, create a new App:
   - Type: **Business**
   - Name: `Swayam Admission Messaging`
3. In the App Dashboard, find **WhatsApp** and click **Set up**.
4. Link or select your **Meta Business Account**.
5. In the left sidebar, navigate to **WhatsApp > API Setup**:
   - Note the **Phone number ID**.
   - Note the **WhatsApp Business Account ID**.
6. Generate a **Permanent System User Access Token**:
   - Go to **Meta Business Suite** (`business.facebook.com`) > **Settings** > **System Users**.
   - Click **Add** to create a system user (Name: `Swayam Backend Worker`, Role: `Admin`).
   - Click **Generate new token**:
     - Select your WhatsApp Business App.
     - Grant permissions: `whatsapp_business_messaging`, `whatsapp_business_management`.
     - Set Token Expiration to **Never**.
   - Copy the generated token.
7. Configure in Render/backend environment or navigate to **Admin Portal > Settings > Authentication & OTP** to enter the credentials.

---

### 3.3 Fast2SMS Gateway Setup

1. Create and verify an account on [fast2sms.com](https://www.fast2sms.com).
2. Go to **Dev API** in the sidebar.
3. Copy your **API Authorization Key**.
4. Add funds to your Fast2SMS wallet for production credit.
5. (Optional for DLT): If you have DLT registration with Telecom operators in India:
   - Add your DLT Sender ID under **DLT Sender ID**.
   - Submit your OTP templates under **DLT Templates**.
6. Enter the API Key into Render/backend or via the Admin OTP Settings portal.

---

## 4. Admin OTP Settings Portal Configuration

The Admin Portal provides a real-time UI for configuring, testing, and managing communication channels without restarting backend services:

1. Log into the Swayam Admission Admin Portal as an **ADMIN** or **SUPER_ADMIN**.
2. Navigate to **Settings > Authentication & OTP** (`/admin/settings/auth-otp`).
3. For each channel tab (**Email**, **WhatsApp**, **SMS**):
   - **Status Toggle:** Toggle **Enabled** to activate/deactivate the channel.
   - **Cooldown & Expiry:** Set resend cooldown (default: 60s) and OTP validity (default: 600s).
   - **Credentials:** Enter the API Key / Access Token and Provider identifiers.
   - Click **Save Channel Settings**.
4. **Credential Masking Protection:**
   - Stored credentials display as `••••••••••••••••` or masked strings for security.
   - When submitting updates, the backend explicitly verifies:
     ```typescript
     if (updateData.apiKey && !updateData.apiKey.includes('****')) {
       // Only updates when a real new key is supplied
     }
     ```
   - Saving other settings (e.g., expiry or cooldown) **will never overwrite** your stored secret with asterisks.
5. **Provider Test Connection:**
   - Use the **Test Connection** button on each channel card.
   - For Email: Sends a verification probe via the durable outbox and returns SMTP status.
   - For WhatsApp: Performs an authorization test against Meta Graph API.
   - For SMS: Checks Fast2SMS wallet balance and API route connectivity.

---

## 5. Pre-Deployment Verification Protocol

Before opening the portal to students and staff, run the following automated verification suite against your staging or production database.

### 5.1 Run the Phase 3 Automated Verification Suite

Run directly from the `backend/` directory:

```bash
cd backend
node -r ts-node/register/transpile-only scripts/test_phase3_verification.ts
```

**Expected Output Checklist:**
- [x] `[Scenario 1] PASS: Durable Outbox Queueing & PostgreSQL Persistence`
- [x] `[Scenario 2] PASS: Durable Worker Processing & Safe Lifecycle Tracking`
- [x] `[Scenario 3] PASS: Worker Crash Recovery (Stale SENDING -> QUEUED)`
- [x] `[Scenario 4] PASS: Student Registration Email Verification Strictness`
- [x] `[Scenario 5] PASS: Production OTP / Secret Disclosure Elimination`
- [x] `[Scenario 6] PASS: Cross-Account Email Change Conflict Handling (HTTP 409)`
- [x] `[Scenario 7] PASS: Mobile Password Recovery Strictness (No Fake Success)`
- [x] `[Scenario 8] PASS: Nodemailer Transport IPv4 Enforcement & Socket Timeouts`
- [x] `[Scenario 9] PASS: WhatsApp Business Cloud API Real Provider Status & Error Handling`
- [x] `[Scenario 10] PASS: Notification Template Missing Resilience (Observable Failure Audit)`
- [x] `TOTAL SCENARIOS: 10 | PASSED: 10 | FAILED: 0`

---

### 5.2 End-to-End Employee Activation & Recovery Smoke Test

Run the full end-to-end employee lifecycle regression script:

```bash
cd backend
node -r ts-node/register/transpile-only scripts/test_employee_recovery_full_e2e.ts
```

**Verification Criteria:**
- Employee profile is created in PostgreSQL with `STATUS: PENDING_ACTIVATION`.
- Activation email is durably stored in `CommunicationDelivery` with status `QUEUED`.
- Outbox worker picks up the job and transitions to `SENT` with genuine Nodemailer message ID.
- Single-use token activates account and sets permanent password.
- Subsequent token reuse returns HTTP 400 Bad Request.

---

## 6. Production Maintenance & Monitoring Runbook

### 6.1 Inspecting the Outbox Queue in PostgreSQL

Query the `CommunicationDelivery` table to inspect the status of deliveries:

```sql
-- Check delivery summary by status across channels
SELECT channel, status, COUNT(*) 
FROM "CommunicationDelivery" 
GROUP BY channel, status;

-- Find any failed deliveries requiring investigation
SELECT id, channel, "recipientEmail", "failureReason", "errorMessage", "retryCount", "updatedAt"
FROM "CommunicationDelivery"
WHERE status = 'FAILED'
ORDER BY "updatedAt" DESC
LIMIT 20;

-- Check for jobs stuck in SENDING (handled automatically by crash recovery after 2 mins)
SELECT id, channel, "recipientEmail", "updatedAt"
FROM "CommunicationDelivery"
WHERE status = 'SENDING' AND "updatedAt" < NOW() - INTERVAL '2 minutes';
```

### 6.2 Automatic Crash Recovery

The `DurableOutboxService` automatically invokes `recoverStaleSendingJobs()` at the beginning of each polling cycle and upon application boot:
- Any delivery record in `status = 'SENDING'` with `updatedAt > 2 minutes old` is reset back to `QUEUED`.
- This ensures that if Render restarts the backend container or a dyno crashes mid-send, no messages are permanently lost or stuck in flight.

---

## 7. Configuration Sign-Off Checklist

| Verification Item | Responsible | Status | Notes |
| :--- | :---: | :---: | :--- |
| `DATABASE_URL` configured with valid SSL mode | DevOps | [ ] | Neon connection operational |
| Gmail 2FA enabled & 16-char App Password generated | System Admin | [ ] | Tested with IPv4 Nodemailer |
| `SMTP_HOST`, `SMTP_PORT=465`, `SMTP_SECURE=true` in Render | DevOps | [ ] | Verified in Render dashboard |
| Meta WhatsApp Business Account created & Phone ID obtained | Product Ops | [ ] | Configured in Admin Portal |
| Fast2SMS API Key generated & wallet funded | Finance / Ops | [ ] | Configured in Admin Portal |
| Phase 3 Verification Suite executed (`10/10 passed`) | Engineering | [x] | Verified in automated runner |
| Production builds verified (`backend`, `admin`, `user`) | Engineering | [x] | All exit code 0 |

---
*End of Phase 3 Manual Configuration Checklist.*
