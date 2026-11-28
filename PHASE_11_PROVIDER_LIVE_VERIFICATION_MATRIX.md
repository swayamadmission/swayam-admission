# SWAYAM ADMISSION — PHASE 11 PROVIDER LIVE VERIFICATION MATRIX
## External Cloud Integrations, Payment Gateways & Communication Services

**Document Version:** 1.0.0  
**Audit Date:** 2026-11-01  
**Lead DevSecOps Architect:** Senior DevSecOps Lead & Principal Software Architect  
**Repository Location:** `c:\Users\mdosa\OneDrive\Desktop\swayam-admission`  

---

## 1. Provider Verification Rules & Status Taxonomy

In strict compliance with Phase 11 engineering instructions, integration readiness is classified using an evidence-grounded taxonomy. The existence of integration classes or environment placeholders is **never** conflated with live verification:

- **CODE VERIFIED**: Integration code, controller contracts, and error handlers have been inspected and validated via automated unit or integration tests.
- **CONFIGURED**: Structurally valid credentials or connection parameters are present in the environment.
- **CONNECTIVITY VERIFIED**: A non-destructive network ping, TLS handshake, or health-probe check has succeeded against the external provider endpoint.
- **SANDBOX VERIFIED**: An end-to-end test transaction has succeeded in a sandbox/test environment (e.g. Razorpay Test Mode).
- **LIVE VERIFIED**: An authorized, real production transaction has completed with end-to-end evidence.
- **BLOCKED**: Required credentials, organization KYC, telecom approvals, or live accounts are absent in the target deployment environment.
- **NOT TESTED**: No valid verification has been conducted.

---

## 2. Comprehensive Provider Verification Matrix

| # | Provider / Service | Integration Layer in Codebase | Code Status | Config Status | Sandbox Status | Live Status | Overall Release Status | Blockers & Action Required for Live Activation |
|---|---|---|---|---|---|---|---|---|
| **1** | **Neon PostgreSQL** | [`PrismaService`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/prisma/prisma.service.ts)<br>Prisma ORM 6.9.0 | **CODE VERIFIED** | **CONFIGURED** (Dev/Staging) | **SANDBOX VERIFIED** | **NOT TESTED** (Live Prod) | **CONDITIONAL PASS** | Production Neon branch must be created; connection string with `sslmode=require` added to Render; run `prisma db push` on staging baseline. |
| **2** | **AWS SES / SMTP** | [`NotificationChannelsService`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/notifications/notification-channels.service.ts)<br>Nodemailer | **CODE VERIFIED** | **CONFIGURED** (Gmail Dev) | **SANDBOX VERIFIED** (Dev) | **BLOCKED** | **BLOCKED / REQUIRES SES** | Production AWS SES domain (`swayamadmission.com`) must be verified; DKIM/SPF DNS records added; exit SES sandbox to email arbitrary student addresses. |
| **3** | **Fast2SMS / DLTMobile** | `Fast2SmsService`<br>[`NotificationChannelsService`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/notifications/notification-channels.service.ts) | **CODE VERIFIED** | **BLOCKED** (Missing Key) | **NOT TESTED** | **BLOCKED** | **BLOCKED / REQUIRES DLT** | Requires active Fast2SMS production API key; TRAI DLT registration in India with approved 6-character Header (`SWAYAM`) and registered OTP templates. |
| **4** | **Meta WhatsApp Cloud API** | `WhatsAppChannel`<br>[`CommunicationCampaignController`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/notifications/communication-campaign.controller.ts) | **CODE VERIFIED** | **BLOCKED** (Missing Token) | **NOT TESTED** | **BLOCKED** | **BLOCKED / REQUIRES META** | Requires Meta for Developers Business Verification, approved WhatsApp Business phone number ID, permanent System User access token, and approved templates. |
| **5** | **Razorpay Payments** | [`PaymentGatewayService`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/payments/gateways/payment-gateway.service.ts)<br>[`PaymentsController`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/payments/payments.controller.ts) | **CODE VERIFIED** | **CONFIGURED** (Test Mode) | **SANDBOX VERIFIED** | **BLOCKED** (Live KYC) | **CONDITIONAL PASS** (Test Mode Active) | Code enforces HMAC-SHA256 signature verification and idempotency. Live mode requires Razorpay merchant KYC approval and live Key/Secret. |
| **6** | **Google Cloud OAuth** | [`AuthService`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/auth/auth.service.ts)<br>Google Auth Library | **CODE VERIFIED** | **CONFIGURED** (Web Client) | **SANDBOX VERIFIED** (Gated) | **BLOCKED** (Prod Consent) | **CONDITIONAL PASS** | Synthetic test tokens blocked in production. Live OAuth requires adding production origin `https://swayam-admission.vercel.app` to Authorized JavaScript Origins in GCP. |
| **7** | **Cloudflare R2 / AWS S3** | [`StorageService`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/storage/storage.service.ts)<br>Local / S3 Provider | **CODE VERIFIED** | **CONFIGURED** (Local Provider) | **SANDBOX VERIFIED** (Local) | **NOT TESTED** (Remote S3) | **CONDITIONAL PASS** (Local Disk Active) | `LOCAL` disk storage is fully functional for self-hosted / Render persistent disks. For multi-instance scaling, supply Cloudflare R2 / S3 bucket keys. |

---

## 3. Deep-Dive Provider Audit & Verification Details

### 3.1 Neon Serverless PostgreSQL
- **Implementation**: Managed via [`PrismaService`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/prisma/prisma.service.ts) with Prisma Client 6.9.0.
- **Connection Management**: Connects via PostgreSQL connection pooler (`pgbouncer`) with mandatory TLS encryption (`sslmode=require`).
- **Resilience**: Database connection retries and lifecycle hooks (`onModuleInit`, `onModuleDestroy`, `enableShutdownHooks`).
- **Fail-Closed Readiness**: [`/health/readiness`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/health/health.controller.ts#L84-L105) queries `SELECT 1` and returns HTTP 503 if PostgreSQL is unreachable.
- **Operational Requirement**: The production database branch must be designated in Neon console, and its pooled connection string configured in Render. Never execute `prisma migrate reset` against production.

### 3.2 AWS SES / SMTP Gateway
- **Implementation**: Handled by [`NotificationChannelsService`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/notifications/notification-channels.service.ts) using Nodemailer.
- **Security & Password Sanitization**:
  - Trims trailing whitespace and carriage returns automatically from `SMTP_PASS` / `SMTP_PASSWORD` to prevent trailing newline bugs.
  - Supports Port 587 (STARTTLS) and Port 465 (Direct SSL).
  - Masks sender email and user IDs in [`/health/providers`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/health/health.controller.ts#L115-L135).
- **Outbox Queue**: Outbound emails are stored in `DurableOutbox` table prior to dispatch, preventing message loss during transient network partitions.
- **Operational Blocker**: Amazon SES requires domain verification for `swayamadmission.com`. Until approved, sending to arbitrary external recipient addresses is blocked by AWS SES sandbox restrictions.

### 3.3 Fast2SMS Gateway
- **Implementation**: Located in `Fast2SmsService` within `backend/src/notifications/`.
- **Supported Routes**:
  - Quick SMS route (`q`): Useful for rapid testing.
  - DLT route (`dlt`): Mandatory in India under TRAI regulations for commercial/transactional SMS.
- **DLT Compliance**: Requires registration of Principal Entity, Sender Headers (`SWAYAM`), and Content Templates on telecom portals (e.g. Jio/Airtel/Vil DLT).
- **Operational Blocker**: Currently unset (`FAST2SMS_API_KEY` is empty). The system gracefully logs a warning and marks SMS channel unconfigured without crashing.

### 3.4 Meta WhatsApp Cloud API
- **Implementation**: Managed via `WhatsAppChannel` in `backend/src/notifications/`.
- **Webhook Security**:
  - GET challenge verification fails closed if `WHATSAPP_WEBHOOK_VERIFY_TOKEN` does not match the configured secret.
  - Inbound webhook payloads are verified via HMAC-SHA256 signature (`x-hub-signature-256`) against `WHATSAPP_APP_SECRET`.
- **Template Requirement**: WhatsApp Cloud API forbids initiating unsolicited conversations without pre-approved HSM templates.
- **Operational Blocker**: WhatsApp credentials (`WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`) are pending Meta Business verification.

### 3.5 Razorpay Payment Gateway
- **Implementation**: Implemented in [`PaymentGatewayService`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/payments/gateways/payment-gateway.service.ts) and [`PaymentsController`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/payments/payments.controller.ts).
- **Cryptographic Security**:
  - Generates Razorpay orders with server-side amount enforcement (`amount` cannot be altered by client).
  - Verifies payment signatures using `crypto.createHmac('sha256', secret).update(orderId + "|" + paymentId).digest('hex')`.
  - Validates webhook payloads using `RAZORPAY_WEBHOOK_SECRET` with constant-time equality comparisons.
  - Idempotency guards prevent double-crediting if webhooks are received multiple times.
- **Current Operational Status**: Fully verified in Razorpay Test Mode. Production activation requires merchant KYC completion.

### 3.6 Google OAuth (GIS Web Client)
- **Implementation**: Located in [`AuthService.verifyGoogleToken`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/auth/auth.service.ts#L650-L685) using `google-auth-library` (`OAuth2Client`).
- **Security Hardening**:
  - Verifies cryptographic signature against Google's public JWK certificates.
  - Checks token audience against `GOOGLE_CLIENT_ID`.
  - Extracts verified email and full name.
  - Gated synthetic test token bypass (`test-google-token-*`) so it is strictly rejected when `NODE_ENV === 'production'`.
- **Current Operational Status**: Operational in test/development. Requires whitelisting production URL in Google Cloud Console.

### 3.7 Document Vault Storage
- **Implementation**: Multi-provider storage engine in [`StorageService`](file:///c:/Users/mdosa/OneDrive/Desktop/swayam-admission/backend/src/storage/storage.service.ts).
- **Security & Integrity**:
  - Enforces 10 MB maximum file size limit.
  - Rejects executable files (`.exe`, `.sh`, `.bat`, `.js`, `.html`).
  - Automatically embeds dynamic watermarks on student PDF uploads containing the student ID, verified date, and watermark notice.
- **Current Operational Status**: `LOCAL` storage engine is active and fully functional. S3/R2 remote bucket keys can be configured dynamically without code changes.

---

## 4. Operational Provider Readiness Verdict

All seven integrations possess **production-ready codebase implementations** with strict error handling, cryptographic signature verification, and graceful fallback behavior when credentials are unconfigured.

Live external operations are currently **CONDITIONAL** on the organization provisioning its live third-party accounts (AWS SES, Meta WhatsApp, Fast2SMS, Razorpay Live).

