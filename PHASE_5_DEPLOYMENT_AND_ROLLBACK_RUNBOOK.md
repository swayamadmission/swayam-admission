# SWAYAM ADMISSION — PHASE 5 DEPLOYMENT & ROLLBACK RUNBOOK

**Document ID:** SWAYAM-PHASE-5-DEPLOYMENT-ROLLBACK-RUNBOOK  
**Date:** October 21, 2026  
**Audience:** Platform DevOps Engineer, Release Manager, System Administrator  

---

## 1. Overview & Baseline Release State

This runbook provides the operational deployment, verification, recovery, and rollback procedures for promoting the Swayam Admission platform to staging and production.

### Current Staging Endpoints
- **Admin & ERP Portal:** `https://swayam-admission-eg2x.vercel.app`
- **Public Website & Student Portal:** `https://swayam-admission.vercel.app`
- **Backend API:** `https://swayam-admission.onrender.com`
- **Database:** Serverless PostgreSQL 16 on Neon

---

## 2. Render & Vercel Dashboard Configuration Runbook

Because deployment dashboard settings are not modified via CLI, the following environment variables must be applied manually in the dashboard consoles:

### 2.1 Render Web Service (`swayam-admission`)
**Dashboard Path:** Render Dashboard → `swayam-admission` (Web Service) → **Environment**

Copy and paste the following environment variables:

```env
# ─── RUNTIME & DATABASE ────────────────────────────────────────────────────────
NODE_ENV=production
DATABASE_URL=postgresql://<user>:<password>@<neon-host>/swayam_admission?sslmode=require
DIRECT_URL=postgresql://<user>:<password>@<neon-host>/swayam_admission?sslmode=require

# ─── JWT & AUTHENTICATION SECRETS ──────────────────────────────────────────────
JWT_SECRET=<strong-random-32-char-secret>
JWT_REFRESH_SECRET=<distinct-strong-random-32-char-secret>
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
ENABLE_DEV_OTP=false

# ─── FRONTEND & PORTAL TESTING URLS ────────────────────────────────────────────
FRONTEND_URL=https://swayam-admission.vercel.app
FRONTEND_USER_URL=https://swayam-admission.vercel.app
ADMIN_URL=https://swayam-admission-eg2x.vercel.app
ADMIN_PORTAL_URL=https://swayam-admission-eg2x.vercel.app
ERP_PORTAL_URL=https://swayam-admission-eg2x.vercel.app
PORTAL_URL=https://swayam-admission-eg2x.vercel.app
PUBLIC_SITE_URL=https://swayam-admission.vercel.app

# ─── STRICT CORS ORIGINS (Exact HTTPS, No Trailing Slashes) ───────────────────
CORS_ORIGIN=https://swayam-admission-eg2x.vercel.app,https://swayam-admission.vercel.app

# ─── GMAIL TESTING SMTP ───────────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=swayamadmissions@gmail.com
SMTP_FROM_EMAIL=swayamadmissions@gmail.com
SMTP_FROM_NAME=Swayam Admission
SMTP_PASS=<16-character-google-app-password>

# ─── META WHATSAPP WEBHOOK SECURITY ───────────────────────────────────────────
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<secure-verify-token>
WHATSAPP_WEBHOOK_SECRET=<meta-app-secret>
```

> [!IMPORTANT]
> Save changes and click **Manual Deploy → Deploy latest commit** to restart the Render container.

---

### 2.2 Vercel Admin Frontend (`swayam-admission-eg2x`)
**Dashboard Path:** Vercel Dashboard → `swayam-admission-eg2x` → **Settings** → **Environment Variables**

| Variable Key | Environments | Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Production, Preview, Development | `https://swayam-admission.onrender.com` |
| `VITE_API_BASE_URL` | Production, Preview, Development | `https://swayam-admission.onrender.com` |
| `VITE_PUBLIC_URL` | Production, Preview, Development | `https://swayam-admission.vercel.app` |

*Click **Redeploy** on the latest deployment.*

---

### 2.3 Vercel Student Frontend (`swayam-admission`)
**Dashboard Path:** Vercel Dashboard → `swayam-admission` → **Settings** → **Environment Variables**

| Variable Key | Environments | Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Production, Preview, Development | `https://swayam-admission.onrender.com` |
| `VITE_API_BASE_URL` | Production, Preview, Development | `https://swayam-admission.onrender.com` |
| `VITE_ADMIN_URL` | Production, Preview, Development | `https://swayam-admission-eg2x.vercel.app` |

*Click **Redeploy** on the latest deployment.*

---

## 3. Deployment Verification Steps

After applying the environment variables and triggering redeployments, verify the live deployment:

1. **Verify Backend API Health:**
   ```bash
   curl -i https://swayam-admission.onrender.com/v1
   # Expected: HTTP 200 OK with "Hello World!"
   ```
2. **Verify CORS Headers for Admin Portal:**
   ```bash
   curl -i -X OPTIONS https://swayam-admission.onrender.com/v1 \
     -H "Origin: https://swayam-admission-eg2x.vercel.app" \
     -H "Access-Control-Request-Method: GET"
   # Expected: access-control-allow-origin: https://swayam-admission-eg2x.vercel.app
   # Expected: access-control-allow-credentials: true
   ```
3. **Verify CORS Rejection for Unapproved Origins:**
   ```bash
   curl -i -X OPTIONS https://swayam-admission.onrender.com/v1 \
     -H "Origin: https://unapproved-hacker-site.com" \
     -H "Access-Control-Request-Method: GET"
   # Expected: No access-control-allow-origin header returned (fail-closed HTTP 404)
   ```
4. **Verify Database Connectivity via Public Catalog:**
   ```bash
   curl -i "https://swayam-admission.onrender.com/v1/colleges?page=1&limit=1"
   # Expected: HTTP 200 OK with college data JSON array
   ```

---

## 4. Database Migration Safety Rules

1. **Non-Destructive Migrations Only:**
   - Always run `npx prisma migrate deploy` in CI/CD or staging.
   - **NEVER** run `prisma migrate reset`, `prisma db push --force-reset`, or drop production tables.
2. **Neon Connection Pooling:**
   - `DATABASE_URL` uses the pooled endpoint (PgBouncer) with connection limits suitable for serverless runtimes.
   - `DIRECT_URL` points to the unpooled direct port for migrations.

---

## 5. SMTP Quota Recovery & Provider Migration Procedure

### 5.1 When Google 24-Hour Quota Resets:
1. Verify the quota has reset by logging into `swayamadmissions@gmail.com`.
2. Admin resets the outbox cooldown and re-enqueues blocked deliveries via the backend service method `retryQuotaBlockedDeliveries()` or via the Admin OTP Settings dashboard test button.
3. The queue worker will resume dispatching pending messages according to exponential backoff and auth TTL rules.

### 5.2 Transitioning to Amazon SES or SendGrid (Recommended for Production):
1. Create a verified domain identity in Amazon SES or SendGrid for `swayamadmission.com`.
2. Obtain SMTP credentials (host, port 587, username, password).
3. Update Render environment variables:
   ```env
   SMTP_HOST=email-smtp.ap-south-1.amazonaws.com # (or smtp.sendgrid.net)
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=<ses-smtp-username>
   SMTP_PASS=<ses-smtp-password>
   SMTP_FROM_EMAIL=admin@swayamadmission.com
   SMTP_FROM_NAME=Swayam Admission
   ```
4. Trigger container redeployment in Render. **Zero codebase modifications required.**

---

## 6. Rollback Runbook

If a critical defect or regression is detected in staging or production:

1. **Git Commit Rollback:**
   ```bash
   # Revert to the previously verified stable commit
   git checkout <last-stable-commit-hash>
   ```
2. **Render Rollback:**
   - In Render Dashboard → `swayam-admission` → **Deploys**.
   - Locate the previous successful deploy and click **Rollback to this deploy**.
   - Render restarts the previous Docker image within 60 seconds without rebuild time.
3. **Vercel Rollback:**
   - In Vercel Dashboard → `swayam-admission-eg2x` / `swayam-admission` → **Deployments**.
   - Click the three dots on the previous deployment and select **Assign Domain to this Deployment**.
   - Traffic instantly switches back to the previous build artifact.
4. **Database Rollback Precautions:**
   - Phase 5 changes are fully backward-compatible with the existing database schema.
   - Rollback requires **zero database schema modifications**.

---

## 7. Future Custom Domain Cutover Prerequisites (Reference Only)

When `swayamadmission.com` is purchased and ready for activation:

1. **Vercel Custom Domains:**
   - Add `swayamadmission.com` to project `swayam-admission`.
   - Add `admin.swayamadmission.com` and `erp.swayamadmission.com` to project `swayam-admission-eg2x`.
   - Configure DNS CNAME records to `cname.vercel-dns.com`.
2. **Render Custom Environment:**
   ```env
   FRONTEND_URL=https://swayamadmission.com
   FRONTEND_USER_URL=https://swayamadmission.com
   ADMIN_URL=https://admin.swayamadmission.com
   ADMIN_PORTAL_URL=https://admin.swayamadmission.com
   ERP_PORTAL_URL=https://erp.swayamadmission.com
   PORTAL_URL=https://admin.swayamadmission.com
   PUBLIC_SITE_URL=https://swayamadmission.com
   CORS_ORIGIN=https://swayamadmission.com,https://admin.swayamadmission.com,https://erp.swayamadmission.com
   ```
3. **Mailbox Creation:**
   - Set up `admin@swayamadmission.com` in Google Workspace or Zoho.
   - Configure SPF (`v=spf1 include:... ~all`), DKIM, and DMARC TXT records.
