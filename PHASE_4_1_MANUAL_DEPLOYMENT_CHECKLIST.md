# SWAYAM ADMISSION — PHASE 4.1 MANUAL DEPLOYMENT CHECKLIST

**Document ID:** SWAYAM-PHASE-4.1-MANUAL-DEPLOYMENT-CHECKLIST  
**Date:** October 20, 2026  
**Audience:** Platform Administrator / DevOps Engineer  

---

## 1. Overview

Because external deployment dashboard access (Render and Vercel) is restricted from direct agent CLI modification, the following environment variable updates must be applied manually in the respective web dashboards to bring the live staging and production environments into sync with Phase 4.1.

---

## 2. Render Backend Environment Checklist

**Service:** Swayam Admission Backend API (`swayam-admission.onrender.com`)  
**Dashboard Path:** Render Dashboard → `swayam-admission` Web Service → **Environment**

Copy and paste the following key-value pairs into Render's Environment settings:

| Variable Key | Required Value | Purpose |
| :--- | :--- | :--- |
| `FRONTEND_URL` | `https://swayam-admission.vercel.app` | Base student portal URL |
| `FRONTEND_USER_URL` | `https://swayam-admission.vercel.app` | Student portal routing & email links |
| `ADMIN_URL` | `https://swayam-admission-eg2x.vercel.app` | Admin portal base URL |
| `ADMIN_PORTAL_URL` | `https://swayam-admission-eg2x.vercel.app` | Admin activation & invitation links |
| `ERP_PORTAL_URL` | `https://swayam-admission-eg2x.vercel.app` | Employee ERP portal links |
| `PORTAL_URL` | `https://swayam-admission-eg2x.vercel.app` | Legacy employee activation fallback |
| `PUBLIC_SITE_URL` | `https://swayam-admission.vercel.app` | Canonical SEO & sitemap base URL |
| `CORS_ORIGIN` | `https://swayam-admission-eg2x.vercel.app,https://swayam-admission.vercel.app` | Strict CORS whitelist (no trailing slashes) |
| `SMTP_HOST` | `smtp.gmail.com` | Testing SMTP host |
| `SMTP_PORT` | `587` | STARTTLS port |
| `SMTP_SECURE` | `false` | STARTTLS security flag (false for 587, true for 465) |
| `SMTP_USER` | `swayamadmissions@gmail.com` | Authorized Gmail sender |
| `SMTP_FROM_EMAIL` | `swayamadmissions@gmail.com` | Testing from address |
| `SMTP_FROM_NAME` | `Swayam Admission` | Sender display name |
| `SMTP_PASS` | *(Existing 16-character Google App Password)* | Matches `SMTP_PASSWORD` for backward compatibility |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | *(Configured Meta Verify Token)* | Prevents webhook verification bypass |
| `WHATSAPP_WEBHOOK_SECRET` | *(Meta App Secret)* | Enables HMAC SHA256 POST verification |

> [!NOTE]
> After saving changes in Render, click **Manual Deploy → Deploy latest commit** to restart the container with the new configuration.

---

## 3. Vercel Admin Frontend Environment Checklist

**Project:** `swayam-admission-eg2x` (Admin & ERP Frontend)  
**Dashboard Path:** Vercel Dashboard → `swayam-admission-eg2x` → **Settings** → **Environment Variables**

| Variable Key | Target Environment | Required Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Production, Preview, Development | `https://swayam-admission.onrender.com` |
| `VITE_API_BASE_URL` | Production, Preview, Development | `https://swayam-admission.onrender.com` |
| `VITE_PUBLIC_URL` | Production, Preview, Development | `https://swayam-admission.vercel.app` |

> [!IMPORTANT]
> - Do **not** place any `SMTP_*`, database, or backend secrets in Vercel environment variables.
> - Trigger a redeploy after updating environment variables by clicking **Deployments → Redeploy**.

---

## 4. Vercel Student Frontend Environment Checklist

**Project:** `swayam-admission` (Public Website & Student Frontend)  
**Dashboard Path:** Vercel Dashboard → `swayam-admission` → **Settings** → **Environment Variables**

| Variable Key | Target Environment | Required Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Production, Preview, Development | `https://swayam-admission.onrender.com` |
| `VITE_API_BASE_URL` | Production, Preview, Development | `https://swayam-admission.onrender.com` |
| `VITE_ADMIN_URL` | Production, Preview, Development | `https://swayam-admission-eg2x.vercel.app` |

> [!IMPORTANT]
> Trigger a redeploy after saving changes by navigating to **Deployments → Redeploy**.

---

## 5. Post-Deployment Verification Steps

Once the variables are saved in Render and Vercel and deployments are redeployed:

1. **Verify CORS Handshake:**
   - Open browser developer tools on `https://swayam-admission-eg2x.vercel.app`.
   - Perform a login request.
   - Confirm response headers include:
     ```
     Access-Control-Allow-Origin: https://swayam-admission-eg2x.vercel.app
     Access-Control-Allow-Credentials: true
     ```
2. **Verify Student Portal Connectivity:**
   - Open `https://swayam-admission.vercel.app`.
   - Verify that course and university catalog APIs successfully fetch from `https://swayam-admission.onrender.com/api/v1/...` without CORS rejection.
3. **Verify Employee Activation Links:**
   - In the Admin portal, navigate to Staff/Employees and generate an employee invitation.
   - Verify the generated activation link starts with:  
     `https://swayam-admission-eg2x.vercel.app/activate?token=...`
4. **Verify Student Verification Links:**
   - Register a test student account.
   - Verify the verification email link starts with:  
     `https://swayam-admission.vercel.app/verify-email?token=...`
5. **Monitor Email Quota Reset:**
   - Monitor the Gmail inbox (`swayamadmissions@gmail.com`) when Google's 24-hour quota resets.
   - If limits persist, proceed with provisioning a dedicated transactional mail relay (SendGrid/Amazon SES).

---

## 6. Future Custom Domain Switch Procedure (Reference Only)

When the official domain `swayamadmission.com` is acquired and configured:

1. **Vercel Domains:**
   - In `swayam-admission` (student), add domain: `swayamadmission.com`
   - In `swayam-admission-eg2x` (admin), add domains: `admin.swayamadmission.com`, `erp.swayamadmission.com`
2. **Render Environment Update:**
   - Update `CORS_ORIGIN=https://swayamadmission.com,https://admin.swayamadmission.com,https://erp.swayamadmission.com`
   - Update `FRONTEND_URL=https://swayamadmission.com`
   - Update `ADMIN_URL=https://admin.swayamadmission.com`
   - Update `ERP_PORTAL_URL=https://erp.swayamadmission.com`
   - Update `SMTP_USER=admin@swayamadmission.com`
   - Update `SMTP_FROM_EMAIL=admin@swayamadmission.com`
3. **No Code Changes Required:** The entire platform will switch seamlessly via environment variables alone.
