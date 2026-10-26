# PHASE 2 — Manual Configuration Checklist: Production SMTP, OTP & Portals

**System:** Swayam Admission Platform  
**Target Environments:** Render (Backend API), Vercel (Admin & Student Frontends), Neon PostgreSQL  
**Audit Reference:** [PHASE_2_IMPLEMENTATION_REPORT.md](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/PHASE_2_IMPLEMENTATION_REPORT.md)  
**Security Notice:** Never enter real passwords or app passwords into source files or version control. Populate production credentials strictly via the secure dashboard environment settings detailed below.

---

## 1. Render Backend Web Service Environment Variables

Navigate to: **Render Dashboard → Swayam Admission Backend Web Service → Environment → Environment Variables**

Ensure the following variables are configured:

| Variable Name | Required Value / Recommended Setting | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enforces production security policies and disables developer secret output. |
| `ENABLE_DEV_OTP` | `false` (or unset) | Guarantees plaintext OTPs (`devOtp`/`devCode`) are never exposed in JSON responses. |
| `SMTP_HOST` | `smtp.gmail.com` | Primary SMTP host for Gmail delivery. |
| `SMTP_PORT` | `587` | STARTTLS port for Gmail SMTP. |
| `SMTP_SECURE` | `false` | Must be `false` for port 587 (uses STARTTLS upgrade). |
| `SMTP_USER` | `swayamadmissions@gmail.com` | Authorized Gmail sender mailbox. |
| `SMTP_PASSWORD` | `[16-character Google App Password]` | Generated App Password from Google Account Security (see Section 2). |
| `SMTP_FROM_EMAIL` | `swayamadmissions@gmail.com` | Envelope sender address for all outgoing transactional mail. |
| `SMTP_FROM_NAME` | `Swayam Admission` | Sender display name shown in student and staff inboxes. |
| `ADMIN_PORTAL_URL` | `https://admin.swayamadmission.com` | Base URL used to construct employee activation links (`/activate?token=...`). |
| `ERP_PORTAL_URL` | `https://erp.swayamadmission.com` | Portal URL included in staff onboarding welcome notifications. |
| `FRONTEND_URL` | `https://www.swayamadmission.com` | Student frontend base URL used for password reset links (`/reset-password?token=...`). |
| `CORS_ORIGIN` | `https://www.swayamadmission.com,https://admin.swayamadmission.com,https://erp.swayamadmission.com` | Authorized frontend origins permitted to access the backend API. |

---

## 2. Gmail SMTP & Google App Password Setup

If you need to generate or regenerate the authorized sender's Google App Password:

1. Log into the sender Google Account: **`swayamadmissions@gmail.com`**.
2. Go to: **[Google Account Security](https://myaccount.google.com/security)**.
3. Confirm that **2-Step Verification (2SV)** is turned **ON**.
4. In the search bar at the top of the Google Account page, search for **App passwords**.
5. Create a new App Password:
   - **App name:** `Swayam Admission Backend (Render)`
6. Google will generate a unique 16-character password (e.g. `abcd efgh ijkl mnop`).
7. Copy the 16 characters (remove spaces) and set as the `SMTP_PASSWORD` variable in Render.
8. Click **Save Changes** in Render to trigger a redeployment.

---

## 3. Admin-Managed Configuration in Admin Portal

An authorized Administrator can also inspect or override the email and WhatsApp settings directly from the Admin Portal:

1. Log into the Admin Portal (`https://admin.swayamadmission.com`).
2. Navigate to: **Settings → Authentication & OTP Settings** (`/settings/otp` or tab).
3. Select the **Email OTP** tab:
   - **Enable Email OTP:** Checked (Active).
   - **Provider Name:** `SMTP`
   - **SMTP Host:** `smtp.gmail.com`
   - **Port:** `587`
   - **SMTP Username:** `swayamadmissions@gmail.com`
   - **SMTP Password / App Password:** Enter the 16-character App Password (leave blank if retaining current saved secret).
   - **Sender Email:** `swayamadmissions@gmail.com`
   - **Sender Name:** `Swayam Admission`
4. Click **Save Configuration**. A green confirmation alert will indicate successful persistence.

---

## 4. Controlled Testing of Email Delivery

To verify email delivery without affecting live users:

1. In **Authentication & OTP Settings**, scroll to **Test Configuration**.
2. Enter an authorized test email address that you monitor (e.g. your personal test mailbox).
3. Click **Send Test OTP**.
4. Check your test inbox:
   - **Sender Name:** `Swayam Admission`
   - **Sender Address:** `swayamadmissions@gmail.com`
   - **Subject:** `Swayam Admission Verification Test`
   - **Content:** Branded HTML email containing a 6-digit test OTP code.
5. Confirm that the email is delivered to the test inbox and **NOT** back to `swayamadmissions@gmail.com`.

---

## 5. How to Interpret Communication Delivery Records in Neon PostgreSQL

When troubleshooting transactional deliveries, query the `CommunicationDelivery` table in Neon PostgreSQL:

```sql
SELECT 
  id, 
  channel, 
  recipientEmail, 
  recipientName, 
  status, 
  attempts, 
  failureReason, 
  errorMessage, 
  createdAt, 
  sentAt 
FROM "CommunicationDelivery" 
ORDER BY "createdAt" DESC 
LIMIT 20;
```

### Status Definitions
- `QUEUED`: The delivery job has been registered in the database and is queued for dispatch.
- `SENDING`: The job is actively negotiating connection with the SMTP server.
- `SENT`: Nodemailer received an `accepted: [recipient]` confirmation from Gmail SMTP.
- `FAILED`: Delivery failed after socket timeout or authentication rejection. The exact reason is recorded in `failureReason` and `errorMessage`.
- `SKIPPED`: The recipient lacked a valid email address, preventing invalid delivery attempts.

---

## 6. Pre-Release Verification Sign-Off

Before publishing new frontend or backend deployments:

- [x] All automated regression test suites pass (`npm run build` and `npx ts-node --transpile-only scripts/test_employee_recovery_full_e2e.ts`).
- [x] `ENABLE_DEV_OTP=false` is confirmed in the production environment.
- [x] Test email dispatch to an external test inbox succeeds.
- [x] Employee activation links point to `https://admin.swayamadmission.com/activate?token=...`.
- [x] Student password reset links point to `https://www.swayamadmission.com/reset-password?token=...`.
- [x] No plaintext passwords, app passwords, or JWT secrets exist in repository code or Git history.
