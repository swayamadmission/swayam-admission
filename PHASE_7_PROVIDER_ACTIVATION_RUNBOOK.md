# SWAYAM ADMISSION — PHASE 7 PROVIDER ACTIVATION RUNBOOK
## Production & Staging Email Gateway Setup Guide

**Document Version:** 1.0.0  
**Phase:** 7 (Live Email Provider Activation, Webhook Security & Production Readiness)  
**Target Environments:** Render Staging (`swayam-admission.onrender.com`) & Future Production

---

### 1. OVERVIEW & CURRENT STATUS

The platform code natively supports three transactional email providers:
1. **Amazon Simple Email Service (SES)** via SMTP relay (Port 587 STARTTLS) — *Recommended for Production*
2. **Twilio SendGrid** via SMTP relay (`smtp.sendgrid.net:587`) or Web API
3. **Gmail SMTP Relay** (`smtp.gmail.com:587`) — *Staging/Development Only; currently BLOCKED by 550-5.4.5 daily quota*

Live outbound email delivery is currently **BLOCKED** because the temporary Gmail sender exceeded Google's personal account quota. To unblock email delivery, an administrator must configure one of the production providers in Render following the exact instructions below.

---

### 2. OPTION A: AMAZON SES ACTIVATION (RECOMMENDED)

#### Step 1: AWS SES Identity Verification
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/ses/).
2. Select your AWS Region (e.g., `ap-south-1` Mumbai or `us-east-1` N. Virginia).
3. Under **Configuration** -> **Identities**, click **Create Identity**:
   - If domain `swayamadmission.com` is ready: Choose **Domain**, enter `swayamadmission.com`, and publish the 3 CNAME DKIM records to your DNS provider.
   - For immediate staging activation prior to domain purchase: Choose **Email address**, enter an authorized administrator email (e.g. `swayamadmissions@gmail.com`), and click the verification link sent by AWS.

#### Step 2: Handle SES Sandbox Restriction
- New AWS SES accounts start in the **SES Sandbox**.
- In the sandbox, you can **only send to verified email addresses or the Amazon SES mailbox simulator**.
- For production: In the SES console, request production access (quota increase) providing use case details (transactional OTP, admissions notices).
- For staging testing inside the sandbox: Verify your test recipient emails (e.g., your personal testing address) under **Identities**.

#### Step 3: Generate SES SMTP Credentials
1. In the SES Console, go to **Account dashboard** -> **SMTP settings**.
2. Click **Create SMTP credentials**.
3. AWS IAM will generate:
   - **SMTP Username** (e.g., `AKIAIOSFODNN7EXAMPLE`)
   - **SMTP Password** (e.g., `BF5G+a7zX...`)
4. Download the credentials securely.

#### Step 4: Configure Render Web Service Environment Variables
In your Render Dashboard -> `swayam-admission` (Backend Service) -> **Environment**:

| Environment Variable | Value | Description |
| :--- | :--- | :--- |
| `EMAIL_PROVIDER` | `SES` | Provider identifier |
| `SMTP_HOST` | `email-smtp.ap-south-1.amazonaws.com` | Match your AWS region |
| `SMTP_PORT` | `587` | STARTTLS port |
| `SMTP_SECURE` | `false` | Explicit STARTTLS (do not use direct SSL) |
| `SMTP_USER` | `<Your SES SMTP Username>` | Generated in Step 3 |
| `SMTP_PASSWORD` | `<Your SES SMTP Password>` | Generated in Step 3 |
| `SMTP_FROM_EMAIL` | `swayamadmissions@gmail.com` | Must be an AWS-verified identity |
| `SMTP_FROM_NAME` | `Swayam Admission` | Sender display name |

---

### 3. OPTION B: TWILIO SENDGRID ACTIVATION

#### Step 1: Create API Key in SendGrid
1. Log in to [SendGrid](https://app.sendgrid.com/).
2. Navigate to **Settings** -> **API Keys**.
3. Click **Create API Key** -> Name it `Swayam-Admissions-Backend`.
4. Grant **Full Access** or restricted **Mail Send** permissions.
5. Copy the generated API key (starts with `SG.`).

#### Step 2: Sender Identity Verification
1. In SendGrid, go to **Settings** -> **Sender Authentication**.
2. Complete **Single Sender Verification** for `swayamadmissions@gmail.com` (or **Domain Authentication** once `swayamadmission.com` DNS is available).
3. Confirm the verification email sent by SendGrid.

#### Step 3: Configure Render Web Service Environment Variables
In Render Dashboard -> `swayam-admission` -> **Environment**:

| Environment Variable | Value | Description |
| :--- | :--- | :--- |
| `EMAIL_PROVIDER` | `SENDGRID` | Provider identifier |
| `SMTP_HOST` | `smtp.sendgrid.net` | SendGrid SMTP host |
| `SMTP_PORT` | `587` | STARTTLS port |
| `SMTP_SECURE` | `false` | Explicit STARTTLS |
| `SMTP_USER` | `apikey` | Literal string `apikey` |
| `SMTP_PASSWORD` | `<Your SendGrid API Key>` | `SG.xxxxxxxx...` |
| `SMTP_FROM_EMAIL` | `swayamadmissions@gmail.com` | Verified Single Sender email |
| `SMTP_FROM_NAME` | `Swayam Admission` | Sender display name |

---

### 4. OPTION C: GMAIL APP PASSWORD RECOVERY (TEMPORARY STAGING ONLY)

If retaining Gmail SMTP temporarily while testing:
1. Google's daily sending limit resets at **12:00 AM Pacific Time (1:30 PM IST)**.
2. Ensure 2-Step Verification is enabled on `swayamadmissions@gmail.com`.
3. In Google Account Security -> **App passwords**, generate a fresh 16-character App Password.
4. Set in Render:
   - `EMAIL_PROVIDER=SMTP`
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_SECURE=false`
   - `SMTP_USER=swayamadmissions@gmail.com`
   - `SMTP_PASSWORD=<16-character-app-password-without-spaces>`
   - `SMTP_FROM_EMAIL=swayamadmissions@gmail.com`
5. After updating, use the Admin Diagnostics endpoint to reset the circuit breaker:
   ```bash
   POST https://swayam-admission.onrender.com/v1/notifications/campaigns/outbox/reset-cooldown
   Authorization: Bearer <ADMIN_JWT_TOKEN>
   ```

---

### 5. CONTROLLED LIVE TEST & RECOVERY PROCEDURE

Once credentials are saved in Render and the service redeploys:

#### 1. Verify Diagnostic Health
Call the diagnostic health endpoint:
```bash
GET https://swayam-admission.onrender.com/v1/notifications/campaigns/diagnostics
Authorization: Bearer <ADMIN_JWT_TOKEN>
```
Expected response:
```json
{
  "email": {
    "status": "CONFIGURED",
    "provider": "SES",
    "host": "email-smtp.ap-south-1.amazonaws.com",
    "port": 587,
    "user": "AKI***",
    "quotaBlocked": false
  }
}
```

#### 2. Run Test Connection Probe
```bash
POST https://swayam-admission.onrender.com/v1/notifications/campaigns/diagnostics/test-connection
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{ "channel": "EMAIL" }
```
Expected response:
```json
{
  "success": true,
  "status": "READY",
  "message": "SMTP connection established and verified successfully with SES",
  "provider": "SES"
}
```

#### 3. Send Single Controlled Test Email
Send one controlled message to an authorized recipient (such as the admin mailbox):
```bash
POST https://swayam-admission.onrender.com/v1/notifications/campaigns/diagnostics/send-test
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "channel": "EMAIL",
  "recipient": "swayamadmissions@gmail.com",
  "message": "Phase 7 Live Delivery Verification Test"
}
```

#### 4. Confirm Inbox Receipt & Release Quota-Blocked Outbox Messages
Inspect the recipient inbox to confirm physical receipt. Once confirmed:
```bash
POST https://swayam-admission.onrender.com/v1/notifications/campaigns/outbox/retry-quota-blocked
Authorization: Bearer <ADMIN_JWT_TOKEN>
```
This safely resets previously retained outbox jobs back to `QUEUED` without duplicating already delivered messages.
