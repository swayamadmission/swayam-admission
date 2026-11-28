# SWAYAM ADMISSION — COMPLETE TECHNICAL & FUNCTIONAL AUDIT
## 09. System Architecture and Data Flows

This document details the communication topology, networking architecture, interceptor patterns, and end-to-end data flows between the client applications, the backend API engine, the database, background workers, and external third-party services.

---

### 1. Global Network & Deployment Architecture

```mermaid
flowchart TB
    subgraph "Clients"
        B_USER["Student Browser (Desktop/Mobile)"]
        B_ADMIN["Admin / Counselor Browser"]
    end

    subgraph "Vercel Edge Network"
        V_DNS["Cloudflare / Vercel Global Edge DNS"]
        V_USER_APP["swayam-admission.vercel.app<br/>(Static Assets & SPA Cache)"]
        V_ADMIN_APP["swayam-admission-eg2x.vercel.app<br/>(Static Assets & SPA Cache)"]
        V_USER_REW["Edge Rewrite: /v1/:path*"]
        V_ADMIN_REW["Edge Rewrite: /v1/:path*"]
    end

    subgraph "Render Cloud Hosting"
        R_PROXY["Render Ingress & SSL Termination"]
        R_BACKEND["swayam-admission-backend<br/>(NestJS 11 + Express 5 Node.js Engine)"]
        R_DISK["Render Persistent Disk (/uploads)"]
    end

    subgraph "Data & Messaging Tier"
        NEON_DB[("Neon PostgreSQL Serverless<br/>pgBouncer Pooled Connection<br/>DATABASE_URL")]
        OUTBOX_WORKER["Durable Outbox Worker Loop<br/>(In-Process setInterval 5s)"]
    end

    subgraph "External Providers"
        META["Meta WhatsApp Cloud API"]
        F2SMS["Fast2SMS HTTP Gateway"]
        SMTP_SRV["Gmail / Custom SMTP Relay"]
        RZP_GW["Razorpay Payment Gateway"]
    end

    B_USER --> V_USER_APP
    B_USER --> V_USER_REW --> R_PROXY
    B_ADMIN --> V_ADMIN_APP
    B_ADMIN --> V_ADMIN_REW --> R_PROXY

    R_PROXY --> R_BACKEND
    R_BACKEND --> NEON_DB
    R_BACKEND --> R_DISK
    R_BACKEND --> RZP_GW

    OUTBOX_WORKER --> NEON_DB
    OUTBOX_WORKER --> META
    OUTBOX_WORKER --> F2SMS
    OUTBOX_WORKER --> SMTP_SRV
```

---

### 2. Frontend-to-Backend Communication Engine

Both frontend applications utilize centralized, strongly configured Axios instances (`src/api/axios.ts`):

#### A. Base URL & Environment Resolution
The client dynamically resolves its backend target in this priority order:
1. `import.meta.env.VITE_API_URL` (configured during build or in `.env`).
2. If `window.location.hostname` includes `vercel.app` or is a non-localhost domain: defaults to `https://swayam-admission.onrender.com`.
3. If running locally (`localhost` or `127.0.0.1`): defaults to `http://localhost:3000`.
4. Appends the `/v1` prefix automatically if not already present.

#### B. Request Interceptors & Authorization Headers
Every outgoing HTTP request passes through an interceptor:
```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("swayam_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

#### C. Response Interceptors & Refresh Token Concurrency Handling
When the backend returns an HTTP `401 Unauthorized`:
1. **Public/Auth Exclusions**: If the failed URL is `/auth/login`, `/auth/refresh`, or public health/geography routes, the error is immediately returned to prevent infinite loops.
2. **Admin Portal Concurrency Queue**:
   In `frontend/admin/src/api/axios.ts`, multiple concurrent requests failing with 401 are held in a memory queue (`failedQueue`):
   - The first request sets `isRefreshing = true` and invokes `POST /v1/auth/refresh` with `{ refreshToken }`.
   - Subsequent requests return a deferred `Promise` pushed to `failedQueue`.
   - When refresh succeeds: new access token is stored in `localStorage`, `processQueue(null, newAccessToken)` retries all queued requests with the updated token, and `isRefreshing` resets to `false`.
   - When refresh fails: `clearAuthSession()` purges storage and fires `window.dispatchEvent(new CustomEvent("swayam:auth-logout"))`.

---

### 3. Detailed Architectural Data Flows (Mermaid)

#### Flow 1: Student Registration and OTP Verification
```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant SPA as Student Portal (Vercel)
    participant Nest as NestJS API (Render)
    participant DB as Neon PostgreSQL
    participant Outbox as Durable Outbox Worker
    participant SMS as Fast2SMS Gateway

    Student->>SPA: Fills Registration Form (Name, Mobile, Password)
    SPA->>Nest: POST /v1/auth/register
    Nest->>DB: INSERT INTO "User", "StudentProfile"
    Nest-->>SPA: 201 Created (Tokens & Unverified Status)
    
    Student->>SPA: Clicks "Verify Mobile"
    SPA->>Nest: POST /v1/auth/mobile/request-otp
    Nest->>DB: INSERT INTO "OtpVerification" (6-digit code, expires in 10m)
    Nest->>DB: INSERT INTO "CommunicationDelivery" (channel: SMS, payload: OTP)
    Nest-->>SPA: 200 OK (OTP Sent Banner)

    Outbox->>DB: Picks Queued SMS Delivery
    Outbox->>SMS: POST https://www.fast2sms.com/dev/bulkV2
    SMS-->>Student: Delivers SMS with 6-Digit OTP Code
    
    Student->>SPA: Types 6-Digit OTP
    SPA->>Nest: POST /v1/auth/mobile/verify-otp { code }
    Nest->>DB: Validate Code & Check Expiry (<10m)
    Nest->>DB: UPDATE "User" SET "isPhoneVerified" = true
    Nest-->>SPA: 200 OK (Verified Checkmark Rendered)
```

---

#### Flow 2: Employee Activation and Password Setup
```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant SPA_A as Admin Portal (Vercel)
    participant Nest as NestJS API (Render)
    participant DB as Neon PostgreSQL
    participant Outbox as Durable Outbox Worker
    participant SMTP as Gmail / SMTP Server
    actor Employee
    participant SPA_E as Activation View (Vercel)

    Admin->>SPA_A: Creates New Counselor / Employee Profile
    SPA_A->>Nest: POST /v1/employees { name, email, role: COUNSELOR }
    Nest->>DB: INSERT INTO "User" (mustChangePassword: true, status: PENDING)
    Nest->>DB: INSERT INTO "AccountActivationToken" (UUID, 72h Expiry)
    Nest->>DB: INSERT INTO "CommunicationDelivery" (channel: EMAIL, template: ACTIVATION)
    Nest-->>SPA_A: 201 Created

    Outbox->>DB: Fetches Queued Activation Email
    Outbox->>SMTP: Dispatches HTML Email with Activation Link
    SMTP-->>Employee: Receives "Activate Your Swayam Admission Account"

    Employee->>SPA_E: Clicks Activation Link (/?token=UUID)
    SPA_E->>Nest: POST /v1/auth/activate-account { token, password: "NewPassword@123" }
    Nest->>DB: Verify UUID in "AccountActivationToken"
    Nest->>DB: Hash Password with Bcrypt (10 rounds)
    Nest->>DB: UPDATE "User" SET passwordHash = ..., status = ACTIVE, mustChangePassword = false
    Nest->>DB: DELETE FROM "AccountActivationToken"
    Nest-->>SPA_E: 200 OK (Account Activated)
    SPA_E->>Employee: Redirects to Login with Success Alert
```

---

#### Flow 3: Application Submission and Document Upload
```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant SPA as Student Portal (Vercel)
    participant Nest as NestJS API (Render)
    participant Disk as Local File Vault (Render)
    participant DB as Neon PostgreSQL

    Student->>SPA: Uploads 10th Marksheet (PDF)
    SPA->>Nest: POST /v1/documents/upload (multipart/form-data)
    Nest->>Nest: Validate MIME Type (application/pdf) & Size (<10MB)
    Nest->>Disk: Write File to /uploads/documents/UUID.pdf
    Nest->>DB: INSERT INTO "Document" (fileName, originalName, storagePath, status: UPLOADED)
    Nest-->>SPA: 201 Created (Document ID Returned)

    Student->>SPA: Selects College, Course, and Agrees to Declarations
    SPA->>Nest: POST /v1/application/submit { collegeId, courseId, documentIds, declarations }
    Nest->>Nest: Validate Minimum Eligibility & Quota Rules
    Nest->>DB: INSERT INTO "Application" (applicationNumber, status: SUBMITTED)
    Nest->>DB: INSERT INTO "ApplicationDeclaration" (agreed: true, ipAddress)
    Nest->>DB: INSERT INTO "ApplicationTimeline" (event: "Application Submitted")
    Nest-->>SPA: 201 Created (Application Confirmation Rendered)
```

---

#### Flow 4: Payment and Webhook Verification
```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant SPA as Student Portal (Vercel)
    participant Nest as NestJS API (Render)
    participant RZP as Razorpay Gateway
    participant DB as Neon PostgreSQL

    Student->>SPA: Initiates Admission Fee Payment (Rs 5,000)
    SPA->>Nest: POST /v1/payments/order { applicationId, amount: 500000 }
    Nest->>RZP: POST /v1/orders (amount: 500000, currency: "INR")
    RZP-->>Nest: Returns { id: "order_K89123891" }
    Nest->>DB: INSERT INTO "Payment" (orderId: "order_K89123891", status: INITIATED)
    Nest-->>SPA: 200 OK (orderId & Razorpay Public Key)

    SPA->>Student: Opens Razorpay Checkout Window
    Student->>RZP: Completes UPI / NetBanking Authorization
    RZP-->>SPA: Returns { razorpay_payment_id, razorpay_signature }

    SPA->>Nest: POST /v1/payments/verify { orderId, paymentId, signature }
    Nest->>Nest: Calculate HMAC-SHA256(orderId + "|" + paymentId, SECRET)
    alt Signature Matches
        Nest->>DB: UPDATE "Payment" SET status = SUCCESS, paymentId = ...
        Nest->>DB: INSERT INTO "Receipt" (receiptNumber, amount, date)
        Nest->>DB: UPDATE "Application" SET paymentStatus = PAID
        Nest-->>SPA: 200 OK (Payment Verified)
        SPA->>Student: Displays Downloadable Official Receipt
    else Signature Mismatch
        Nest-->>SPA: 400 Bad Request (Invalid Payment Signature)
    end
```

---

#### Flow 5: Durable Outbox Background Worker
```mermaid
sequenceDiagram
    autonumber
    participant Engine as Platform Event (Application Approved)
    participant Outbox as DurableOutboxService
    participant DB as Neon PostgreSQL
    participant Loop as In-Process Polling Worker (setInterval 5s)
    participant Channels as NotificationChannelsService
    actor User as Recipient (WhatsApp / Email / SMS)

    Engine->>Outbox: enqueueJob({ channel: 'WHATSAPP', recipientMobile, title, message })
    Outbox->>DB: INSERT INTO "Notification" (title, message, receiverId)
    Outbox->>DB: INSERT INTO "CommunicationDelivery" (channel: 'WHATSAPP', status: 'QUEUED')

    loop Every 5 Seconds
        Loop->>DB: SELECT * FROM "CommunicationDelivery" WHERE status = 'QUEUED' LIMIT 20
        DB-->>Loop: Returns 1 Pending WhatsApp Job
        Loop->>DB: UPDATE "CommunicationDelivery" SET status = 'SENDING'
        Loop->>Channels: sendWhatsApp(payload)
        Channels->>User: Dispatches via Meta WhatsApp Cloud API
        alt Successful Gateway Response (200 OK)
            Channels-->>Loop: Result: { success: true, messageId: "wamid.HBg..." }
            Loop->>DB: UPDATE "CommunicationDelivery" SET status = 'DELIVERED', sentAt = NOW()
        else Gateway Error (4xx / 5xx)
            Channels-->>Loop: Result: { success: false, error: "Rate limit reached" }
            Loop->>DB: UPDATE "CommunicationDelivery" SET status = 'FAILED', retryCount = retryCount + 1
        end
    end
```

