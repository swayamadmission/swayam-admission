# SWAYAM ADMISSION — PHASE 4.1 DOMAIN CONFIGURATION & EMAIL READINESS REPORT

**Document ID:** SWAYAM-PHASE-4.1-DOMAINS-REPORT  
**Date:** October 20, 2026  
**Status:** VALIDATED (Automated Suite 15/16 Passed, 1 Blocked by Google Quota)  
**Author:** DeepMind Antigravity DevSecOps & Production Reliability Engineering  

---

## 1. Executive Summary

Phase 4.1 resolves domain mismatches, environment variable discrepancies, webhook vulnerabilities, and SMTP transport uncertainties across the Swayam Admission multi-app ecosystem.

Prior to Phase 4.1, the backend CORS allowed arbitrary `*.vercel.app` subdomains via broad wildcard regex, stale `.in` and `.org` domains existed in templates and services, Meta webhook challenge verification did not fail closed when verify tokens were missing, and environment variables were inconsistent across documentation and deployment.

All domain references, authentication routes, employee activation links, student verification links, and CORS headers have been calibrated to the **active Vercel testing domains** and the confirmed **Render backend API URL**. Future custom domains have been documented for subsequent configuration-only migration.

---

## 2. Active Testing Domains & Architecture

### 2.1 Live Testing Endpoints (Active Now)

| Component | Active Testing URL | Host / Provider | Status |
| :--- | :--- | :--- | :--- |
| **Admin & ERP Portal** | `https://swayam-admission-eg2x.vercel.app` | Vercel | Active |
| **Public Website & Student Portal** | `https://swayam-admission.vercel.app` | Vercel | Active |
| **Backend REST API** | `https://swayam-admission.onrender.com` | Render | Active |
| **Database** | PostgreSQL 16 (Serverless) | Neon | Active |

> [!IMPORTANT]
> **API Connectivity Trace:**  
> The backend API is hosted on Render at `https://swayam-admission.onrender.com`. Both Vercel frontends route API requests to this exact URL (configured via `VITE_API_URL` and `VITE_API_BASE_URL`). Frontends do not route API calls to Vercel serverless functions.

### 2.2 Environment Variable Mapping

The following environment variable hierarchy is configured across all backend services:

```env
# ─── SECTION 2: FRONTEND & PORTAL TESTING URLS ─────────────────────────────────
FRONTEND_URL=https://swayam-admission.vercel.app
FRONTEND_USER_URL=https://swayam-admission.vercel.app
ADMIN_URL=https://swayam-admission-eg2x.vercel.app
ADMIN_PORTAL_URL=https://swayam-admission-eg2x.vercel.app
ERP_PORTAL_URL=https://swayam-admission-eg2x.vercel.app
PORTAL_URL=https://swayam-admission-eg2x.vercel.app
PUBLIC_SITE_URL=https://swayam-admission.vercel.app

# ─── STRICT CORS ORIGINS (Exact HTTPS, No Trailing Slashes) ────────────────────
CORS_ORIGIN=https://swayam-admission-eg2x.vercel.app,https://swayam-admission.vercel.app
```

---

## 3. Security Hardening & Defect Remediations

### 3.1 CORS Whitelist Hardening (`backend/src/main.ts`)
- **Vulnerability Eliminated:** Replaced the permissive `host.endsWith('.vercel.app')` wildcard regex which previously permitted any malicious tenant on Vercel to perform credentialed requests against the backend.
- **Fail-Closed Whitelist:** CORS now strictly matches explicit origins:
  - `https://swayam-admission-eg2x.vercel.app`
  - `https://swayam-admission.vercel.app`
  - Origins defined in `FRONTEND_URL`, `FRONTEND_USER_URL`, `ADMIN_URL`, `ADMIN_PORTAL_URL`, `ERP_PORTAL_URL`, `PORTAL_URL`, and `CORS_ORIGIN`
  - Local development origins (`localhost:3000`, `localhost:5173`, `localhost:5174`)
- **Origin Normalization:** Automatically trims whitespace and strips trailing slashes (`/`) so that origins like `https://swayam-admission.vercel.app/` match without error.
- **Credentialed Requests:** Preserved `credentials: true` for Bearer token and header exchanges.

### 3.2 Meta WhatsApp Webhook Fail-Closed & HMAC Security (`backend/src/notifications/communication-campaign.controller.ts`)
- **GET Verification Challenge:** Updated `verifyWebhook` to fail closed with `UnauthorizedException('Invalid or unconfigured webhook verify token')` whenever:
  - `WHATSAPP_WEBHOOK_VERIFY_TOKEN` is unset or blank in the environment.
  - The inbound `hub.verify_token` does not match the configured token.
  - The mode is not `subscribe`.
- **POST Webhook HMAC Validation:** Added HMAC SHA256 signature verification supporting `x-hub-signature-256` and `x-webhook-signature`. When `WHATSAPP_WEBHOOK_SECRET` or `META_APP_SECRET` is configured, unsigned or signature-mismatched requests are immediately rejected (`401 Unauthorized`).

### 3.3 Cookie Domain & Authentication Compatibility
- **Architecture Inspection:** Authenticated sessions in both the Admin and Student frontends utilize JWT tokens stored in `localStorage` (`swayam_token`, `swayam_refresh_token`) and dispatched via the `Authorization: Bearer <token>` HTTP header.
- **No Cross-Origin Cookie Pitfalls:** Neither frontend relies on shared `.swayamadmission.com` domain cookies. Setting a cookie domain such as `.swayamadmission.com` on Vercel preview domains (`*.vercel.app`) would cause browser rejection under the Public Suffix List (PSL). Because token-based bearer authentication is used, cross-origin communication between the Vercel frontends and the Render backend functions seamlessly.

### 3.4 Email & Link Fallbacks
Eliminated all hardcoded references to stale domains (`swayamadmission.in`, `swayamadmission.org`) in:
- `backend/src/notifications/notification-channels.service.ts`
- `backend/src/notifications/email-templates.ts`
- `backend/src/notifications/durable-outbox.service.ts`
- `backend/src/notifications/template-engine.service.ts`
- `backend/src/employees/employees.service.ts`
- `backend/src/staff-onboarding/staff-onboarding.service.ts`
- `backend/src/hr/hr.service.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/blog/geo-seo.utility.ts`
- `backend/src/faq/faq.service.ts`
- `backend/src/settings/settings.service.ts`
- `frontend/admin/src/app/components/BlogDetailDrawer.tsx`
- `frontend/admin/src/app/components/FAQFormModal.tsx`
- `frontend/user/src/context/PublicSettingsContext.tsx`

All employee activation and employee password recovery links consistently resolve to `https://swayam-admission-eg2x.vercel.app/activate?token=...`.  
All student welcome and verification links consistently resolve to `https://swayam-admission.vercel.app/...`.

---

## 4. Email Sender & SMTP Readiness Audit

### 4.1 Configuration Status
The official domain mailbox `admin@swayamadmission.com` has not yet been provisioned because domain registration and Google Workspace / Zoho mail setup will occur during custom domain cutover.

Current testing continues on the authorized Gmail transport:
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false` (Port 587 uses STARTTLS; Port 465 uses SSL `SMTP_SECURE=true`)
- `SMTP_USER=swayamadmissions@gmail.com`
- `SMTP_FROM_EMAIL=swayamadmissions@gmail.com`
- `SMTP_FROM_NAME=Swayam Admission`

### 4.2 Credential Inspection & Compatibility
- **Backward Compatibility:** Code in `notification-channels.service.ts` and scripts inspects both `SMTP_PASSWORD` and `SMTP_PASS` interchangeably and trims all whitespace.
- **App Password Verification:** The 16-character Google App Password in `.env` authenticates successfully against Google SMTP (`transporter.verify()` passes).

### 4.3 Real SMTP Live Transmission Finding
During the live transmission probe to the authorized recipient (`swayamadmissions@gmail.com`), Google SMTP rejected the message with:
```
Error: 550-5.4.5 Daily user sending limit exceeded on swayamadmissions@gmail.com
```
- **Root Cause:** Personal/free `@gmail.com` accounts are constrained by Google's strict rolling 24-hour dispatch limit (approx. 100-500 recipients per day depending on account age and IP reputational scoring). High-volume automated integration tests during Phase 3 and Phase 4 exhausted this rolling quota.
- **Classification:** **`BLOCKED`** (Provider Quota Rate-Limit).
- **Required Action:**
  1. For staging/testing: Wait 24 hours for Google's rolling quota window to reset.
  2. For production: Provision a transactional email service (Amazon SES, SendGrid, or Google Workspace SMTP relay with domain SPF/DKIM/DMARC) when purchasing `swayamadmission.com`.

---

## 5. Automated Verification Results

A dedicated automated verification suite (`backend/scripts/test_phase4_1_domains_and_email.ts`) was executed against the active codebase.

```
================================================================
🚀 RUNNING PHASE 4.1 AUTOMATED VERIFICATION SUITE
================================================================

--- SUITE 1: CORS Allowed Origins & Security Whitelist ---
✅ [CORS] Admin Testing Domain Whitelisted: https://swayam-admission-eg2x.vercel.app is allowed
✅ [CORS] Student Testing Domain Whitelisted: https://swayam-admission.vercel.app is allowed
✅ [CORS] Trailing Slash Normalization: https://swayam-admission.vercel.app/ normalized and allowed
✅ [CORS] Wildcard .vercel.app Disallowed: https://malicious-app.vercel.app correctly rejected (fail closed)
✅ [CORS] Stale swayamadmission.in Disallowed: swayamadmission.in correctly rejected from CORS whitelist

--- SUITE 2: Meta WhatsApp Webhook Security ---
✅ [Webhook] Unconfigured Token Rejection (Fail-Closed): UnauthorizedException thrown when WHATSAPP_WEBHOOK_VERIFY_TOKEN is unset
✅ [Webhook] Mismatched Token Rejection: UnauthorizedException thrown when verify token does not match configured token
✅ [Webhook] Valid Token Challenge Return: Returned raw challenge string on valid token
✅ [Webhook] Missing HMAC Signature Rejection: Rejected webhook with missing signature when secret configured
✅ [Webhook] Valid HMAC Signature Accepted: Successfully verified sha256 HMAC payload signature

--- SUITE 3: Link Generation & Routing ---
✅ [Links] Employee Activation Email Domain: Points to https://swayam-admission-eg2x.vercel.app with zero stale domains
✅ [Links] Employee Password Recovery Domain: Points to https://swayam-admission-eg2x.vercel.app
✅ [Links] Student Portal Welcome Email Domain: Points to https://swayam-admission.vercel.app with zero stale domains

--- SUITE 4: Real SMTP Connection & Sender Readiness ---
[SMTP Probe] Host=smtp.gmail.com, Port=587, Secure=false, User=swayamadmissions@gmail.com
✅ [SMTP] Credentials Present: User swayamadmissions@gmail.com configured; password length=16 chars (spaces stripped)
✅ [SMTP] SMTP Handshake & Authentication: Successfully authenticated with smtp.gmail.com:587 as swayamadmissions@gmail.com
⚠️ [SMTP] Live Email Transmission Probe: Google SMTP 550-5.4.5: Daily user sending limit exceeded on swayamadmissions@gmail.com.

================================================================
📊 PHASE 4.1 TEST RESULTS SUMMARY
================================================================
TOTAL TESTS : 16
PASSED      : 15 ✅
FAILED      : 0 ❌
BLOCKED     : 1 ⚠️
================================================================
```

---

## 6. Build Verification

All three application packages compile cleanly with zero errors:

| Component | Build Command | Exit Code | Result |
| :--- | :--- | :--- | :--- |
| **Backend API** | `nest build` | `0` | Clean TypeScript compilation, dist generated |
| **Admin Frontend** | `npm run build` (`vite build`) | `0` | Built in 4.98s, assets bundled in `dist/` |
| **User/Student Frontend** | `npm run build` (`vite build`) | `0` | Built in 4.60s, assets bundled in `dist/` |

---

## 7. Future Custom Domain Migration Plan (Documentation Only)

The custom domains planned for official production launch are:
- Public Website & Student Frontend: `https://swayamadmission.com`
- Admin Portal: `https://admin.swayamadmission.com`
- Employee / ERP Portal: `https://erp.swayamadmission.com`

When migrating to these domains, **zero code rewrites are required**. The migration is performed purely by updating environment variables:

1. **Vercel DNS & Custom Domains:**
   - Add `swayamadmission.com` to the Student frontend Vercel project.
   - Add `admin.swayamadmission.com` and `erp.swayamadmission.com` to the Admin frontend Vercel project.
   - Configure DNS CNAME records pointing to `cname.vercel-dns.com`.
2. **Render Backend Environment Variables:**
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
3. **Frontend Vercel Environment Variables:**
   - Both frontends retain `VITE_API_URL=https://swayam-admission.onrender.com` (or custom API subdomain `https://api.swayamadmission.com` if CNAME is configured).
4. **Email & Webhooks:**
   - Provision `admin@swayamadmission.com` mailbox on Google Workspace or Zoho.
   - Update `SMTP_USER=admin@swayamadmission.com` and `SMTP_FROM_EMAIL=admin@swayamadmission.com`.
   - Update Meta WhatsApp Webhook callback URL in the Meta Developer Portal to `https://swayam-admission.onrender.com/api/v1/notifications/webhook/whatsapp`.

---

## 8. Summary of Files Changed

| File Path | Description of Changes |
| :--- | :--- |
| `backend/src/main.ts` | Hardened CORS whitelist; eliminated wildcard `.vercel.app`; normalized trailing slashes; removed stale domains. |
| `backend/src/notifications/communication-campaign.controller.ts` | Implemented fail-closed Meta webhook verification; added HMAC SHA256 signature verification. |
| `backend/src/notifications/notification-channels.service.ts` | Updated employee activation/reset links to active admin testing domain; confirmed `SMTP_PASSWORD`/`SMTP_PASS` parsing. |
| `backend/src/notifications/email-templates.ts` | Replaced fallback domain references with active admin testing domain. |
| `backend/src/notifications/durable-outbox.service.ts` | Updated default fallback notification portal URL to admin testing domain. |
| `backend/src/notifications/template-engine.service.ts` | Removed stale `.in` domain from template engine preview generation. |
| `backend/src/employees/employees.service.ts` | Updated onboarding and password reset email generation to active testing domains. |
| `backend/src/staff-onboarding/staff-onboarding.service.ts` | Updated staff activation URLs to use active testing domains. |
| `backend/src/hr/hr.service.ts` | Updated candidate notifications and job application confirmation links. |
| `backend/src/auth/auth.service.ts` | Updated admin and student password recovery link resolution. |
| `backend/src/blog/geo-seo.utility.ts` | Updated SEO canonical site URL fallback to active testing domain. |
| `backend/src/faq/faq.service.ts` | Updated FAQ schema breadcrumbs to dynamic site URL. |
| `backend/src/settings/settings.service.ts` | Updated system default contact email and website URL fallbacks. |
| `backend/src/students/students.service.ts` | Updated notification contact email fallback. |
| `frontend/admin/src/app/components/BlogDetailDrawer.tsx` | Updated blog canonical preview link to student testing domain. |
| `frontend/admin/src/app/components/FAQFormModal.tsx` | Updated FAQ canonical placeholder to student testing domain. |
| `frontend/user/src/context/PublicSettingsContext.tsx` | Updated fallback support email to `swayamadmissions@gmail.com`. |
| `backend/.env.example` | Updated configuration documentation with testing Vercel URLs, CORS whitelist, and SMTP parameters. |
| `backend/.env` | Updated local backend environment variables for Phase 4.1 testing. |
| `backend/scripts/test_phase4_1_domains_and_email.ts` | Created automated test suite verifying CORS, webhooks, link generation, and SMTP transport. |
