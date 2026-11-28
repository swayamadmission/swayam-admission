# SWAYAM ADMISSION — COMPLETE TECHNICAL & FUNCTIONAL AUDIT
## 17. Environment and Deployment Architecture

This document outlines the multi-environment topology, deployment orchestration, infrastructure pipelines, domain routing, and environment variable architecture for the Swayam Admission platform.

---

### 1. Multi-Environment Overview

| Operational Tier | Admin / ERP Portal | Student Public Portal | Backend REST API | Database Tier | Storage Tier |
|---|---|---|---|---|---|
| **Local Development** | `http://localhost:5174` | `http://localhost:5173` | `http://localhost:3000/v1` | Local PostgreSQL or Remote Neon Branch | Local Filesystem (`backend/uploads`) |
| **Production Tier** | `https://swayam-admission-eg2x.vercel.app` | `https://swayam-admission.vercel.app` | `https://swayam-admission.onrender.com/v1` | Neon Managed Serverless PostgreSQL | Render Persistent Disk / Vault |

---

### 2. Infrastructure & Hosting Configuration

#### A. Backend Hosting (Render Web Service)
Configured in `render.yaml`:
```yaml
services:
  - type: web
    name: swayam-admission-backend
    runtime: node
    rootDir: backend
    plan: starter
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: npm run start:prod
    healthCheckPath: /v1/health
    autoDeploy: true
```
- **Ingress & Health Checks**: Render polls `/v1/health` to verify zero-downtime rolling deploys.
- **Port Binding**: Binds dynamically to `0.0.0.0:${PORT}` (defaults to port `10000` on Render).

#### B. Frontend Hosting (Vercel)
Configured in `frontend/admin/vercel.json` and `frontend/user/vercel.json`:
- **Edge Rewrites**:
  ```json
  {
    "rewrites": [
      {
        "source": "/v1/:path*",
        "destination": "https://swayam-admission.onrender.com/v1/:path*"
      },
      {
        "source": "/health",
        "destination": "https://swayam-admission.onrender.com/health"
      },
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```
- **SPA Routing**: Catches all non-asset routes and routes them to `/index.html` to support client-side React routing.

#### C. Docker Containerization Architecture
The repository includes three independent `Dockerfile` configurations and a root `docker-compose.yml`:
1. `backend/Dockerfile`: Multi-stage Node.js build installing Prisma, generating clients, compiling NestJS, and exposing port 3000.
2. `frontend/admin/Dockerfile`: Builds Vite production distribution and serves static files.
3. `frontend/user/Dockerfile`: Builds Vite production distribution and serves static files.
4. `docker-compose.yml`: Local multi-container orchestrator running:
   - `postgres`: PostgreSQL 16 image with persistent local volume `postgres_data`.
   - `backend`: Linked to local Postgres container on port 3000.
   - `frontend-admin`: Exposing port 5174.
   - `frontend-user`: Exposing port 5173.

#### D. Nginx Reverse Proxy Architecture
Defined in `nginx.conf`:
- Routes incoming port 80/443 traffic:
  - `/v1/*` $\longrightarrow$ Proxied to `http://backend:3000/v1`
  - `/admin/*` $\longrightarrow$ Proxied to `http://frontend-admin:5174`
  - `/*` $\longrightarrow$ Proxied to `http://frontend-user:5173`

---

### 3. Environment Variable Architecture Catalog

*(Names only — secrets and private tokens omitted pursuant to Audit Rule 10)*

#### A. Backend Service Environment Variables (`backend/.env.example`)

| Variable Name | Required? | Scope & Purpose |
|---|---|---|
| `NODE_ENV` | Yes | Runtime environment flag (`production`, `development`, `test`). |
| `PORT` | Yes | HTTP listening port (defaults to 10000 on Render, 3000 locally). |
| `DATABASE_URL` | Yes | Neon PostgreSQL pooled connection string with SSL mode. |
| `JWT_SECRET` | Yes | Primary cryptographic key for signing stateless access tokens. |
| `REFRESH_TOKEN_SECRET` | Yes | Cryptographic secret for signing single-use refresh tokens. |
| `JWT_EXPIRATION` | No | Lifetime duration of access token (e.g. `7d`, `15m`). |
| `REFRESH_TOKEN_EXPIRATION`| No | Lifetime duration of refresh token (e.g. `30d`). |
| `CORS_ORIGIN` | Yes | Comma-separated allowed browser origins for CORS middleware. |
| `FRONTEND_URL` | Yes | Canonical URL of the public student portal. |
| `FRONTEND_USER_URL` | No | Secondary alias for student portal. |
| `ADMIN_URL` | Yes | Canonical URL of the administrative ERP portal. |
| `ADMIN_PORTAL_URL` | No | Secondary alias for admin portal. |
| `ERP_PORTAL_URL` | No | Auxiliary alias for institutional portal. |
| `PORTAL_URL` | No | General platform portal URL fallback. |
| `STORAGE_PROVIDER` | Yes | File storage provider engine (`LOCAL`). |
| `UPLOAD_DIR` | No | Persistent disk path for document storage (defaults to `./uploads`). |
| `ENABLE_DEV_OTP` | No | Development-only flag allowing static bypass OTP codes. |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth Web Client ID for validating Google Sign-In. |
| `RAZORPAY_KEY_ID` | Yes | Public key identifier for Razorpay payment orders. |
| `RAZORPAY_KEY_SECRET` | Yes | Private secret for verifying HMAC-SHA256 payment signatures. |
| `RAZORPAY_WEBHOOK_SECRET`| Yes | Secret for authenticating inbound Razorpay webhooks. |
| `EMAIL_PROVIDER` | Yes | Active email provider selector (`SMTP`, `GMAIL`, `SENDGRID`, `SES`). |
| `SMTP_HOST` | Yes | Outbound mail server hostname (e.g. `smtp.gmail.com`). |
| `SMTP_PORT` | Yes | Mail server port (`587` for STARTTLS, `465` for SSL). |
| `SMTP_SECURE` | Yes | Boolean toggle for direct SSL vs STARTTLS. |
| `SMTP_USER` | Yes | SMTP authenticating username or email address. |
| `SMTP_PASSWORD` | Yes | SMTP account password or Gmail App Password. |
| `SMTP_FROM_EMAIL` | Yes | Verified outbound sender address (e.g. `swayamadmissions@gmail.com`). |
| `SMTP_FROM_NAME` | Yes | Friendly sender name (e.g. `"Swayam Admission"`). |
| `FAST2SMS_API_KEY` | Yes | API authorization key for Indian SMS OTP delivery. |
| `FAST2SMS_ROUTE` | No | Fast2SMS routing profile (`q` for Quick Transactional, `dlt`). |
| `FAST2SMS_SENDER_ID` | No | Registered 6-character DLT sender ID. |
| `FAST2SMS_WEBHOOK_SECRET`| No | Secret for verifying incoming delivery status callbacks. |
| `WHATSAPP_PHONE_NUMBER_ID`| Yes | Meta WhatsApp Cloud API registered business phone ID. |
| `WHATSAPP_ACCESS_TOKEN` | Yes | Meta System User permanent access token. |
| `WHATSAPP_API_VERSION` | No | Meta Graph API version tag (defaults to `v20.0`). |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`| Yes | Handshake verification token for Meta webhook setup. |
| `WHATSAPP_APP_SECRET` | Yes | Meta App Secret for validating `X-Hub-Signature-256`. |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key for Gemini 1.5/2.0 models. |
| `OPENAI_API_KEY` | No | Secondary OpenAI API key for AI Counselor fallback. |
| `REDIS_ENABLED` | No | Feature toggle for BullMQ Redis queue worker (`false`). |
| `REDIS_URL` | No | Redis connection URL if external cluster used. |

#### B. Admin Portal Frontend Environment Variables (`frontend/admin/.env.example`)

| Variable Name | Required? | Scope & Purpose |
|---|---|---|
| `VITE_API_URL` | Yes | Backend REST API root URL (`https://swayam-admission.onrender.com`). |
| `VITE_ENVIRONMENT` | Yes | Frontend environment identifier (`production`, `development`). |

#### C. Student Portal Frontend Environment Variables (`frontend/user/.env.example`)

| Variable Name | Required? | Scope & Purpose |
|---|---|---|
| `VITE_API_URL` | Yes | Backend REST API root URL (`https://swayam-admission.onrender.com`). |
| `VITE_ENVIRONMENT` | Yes | Frontend environment identifier (`production`, `development`). |
| `VITE_GOOGLE_CLIENT_ID`| Yes | Google OAuth 2.0 Web Client ID for rendering Google Sign-In button. |

---

### 4. Deployment Verification Checklist & Manual Dependencies

1. **Domain DNS Mapping**:
   - `swayam-admission.vercel.app` (CNAME `cname.vercel-dns.com`)
   - `swayam-admission-eg2x.vercel.app` (CNAME `cname.vercel-dns.com`)
   - `swayam-admission.onrender.com` (Managed Render Subdomain)
2. **PostgreSQL Database Lifecycle**:
   - Managed on Neon Serverless.
   - Requires valid `DATABASE_URL` with connection pooling enabled.
   - Recommended: Run `npx prisma db push` or create initial baseline migration `0_init` before applying schema modifications.
3. **Outbox Worker Process**:
   - Runs automatically as an in-process worker within the NestJS application instance (`DurableOutboxService`).
   - Requires no separate background worker deployment dyno.

