# SWAYAM ADMISSION — COMPLETE TECHNICAL & FUNCTIONAL AUDIT
## 05. Modules and Features Audit

This document conducts an in-depth, end-to-end audit of every functional module across the Swayam Admission platform. Every feature is verified against its complete user journey:
$$\text{Frontend Component} \longrightarrow \text{API Client} \longrightarrow \text{Controller} \longrightarrow \text{Service} \longrightarrow \text{Database Model} \longrightarrow \text{UI Feedback}$$

---

### 1. The Core Platform Workflows

#### A. Student Lifecycle Workflow
```mermaid
sequenceDiagram
    autonumber
    actor S as Student
    participant UI as Student Portal (React)
    participant API as Auth & Student API (/v1)
    participant SVC as AuthService / StudentService
    participant DB as Neon PostgreSQL
    participant OB as Durable Outbox

    S->>UI: Registers with Mobile & Email
    UI->>API: POST /v1/auth/register
    API->>SVC: Create User (Role: STUDENT, Status: ACTIVE)
    SVC->>DB: INSERT INTO "User", "StudentProfile"
    SVC->>OB: Enqueue Welcome & Verification SMS/Email
    API-->>UI: 201 Created (access_token, refresh_token)
    
    S->>UI: Requests Mobile OTP Verification
    UI->>API: POST /v1/auth/mobile/request-otp
    API->>DB: INSERT INTO "OtpVerification" (6-digit code, 10m TTL)
    API->>OB: Enqueue Fast2SMS SMS Job
    OB-->>S: SMS Delivered with 6-Digit Code
    S->>UI: Submits OTP
    UI->>API: POST /v1/auth/mobile/verify-otp
    API->>DB: UPDATE "User" SET "isPhoneVerified" = true
    API-->>UI: 200 OK (Verified Badge Updated)

    S->>UI: Completes Academic Profile & Uploads Documents
    UI->>API: POST /v1/documents/upload (Multipart/form-data)
    API->>DB: INSERT INTO "Document" (Status: UPLOADED)
    API-->>UI: 200 OK (Document Appears in Vault)

    S->>UI: Submits College Admission Application
    UI->>API: POST /v1/application/submit
    API->>DB: INSERT INTO "Application" (Status: SUBMITTED)
    API->>DB: INSERT INTO "ApplicationTimeline"
    API-->>UI: 201 Created (Application Number Generated)
```

**Verification Status**: **FULLY IMPLEMENTED**. The entire student registration, OTP verification, document upload, and application submission flow is backed by active controllers, services, database tables, and outbox notification jobs.

---

#### B. Employee Lifecycle Workflow
```mermaid
sequenceDiagram
    autonumber
    actor HR as Super Admin / HR
    participant UI as Admin Portal (React)
    participant API as Staff & Employee API
    participant SVC as EmployeesService / StaffOnboardingService
    participant DB as Neon PostgreSQL
    participant OB as Durable Outbox
    actor EMP as New Employee

    HR->>UI: Creates Employee Record
    UI->>API: POST /v1/employees
    API->>SVC: Create User & EmployeeProfile
    SVC->>DB: INSERT INTO "User" (mustChangePassword: true, status: PENDING)
    SVC->>DB: INSERT INTO "AccountActivationToken" (UUID, 72h TTL)
    SVC->>OB: Enqueue Activation Email with Secure Token Link
    OB-->>EMP: Email Delivered with Link (https://swayam-admission-eg2x.vercel.app/activate?token=...)

    EMP->>UI: Clicks Activation Link & Enters New Password
    UI->>API: POST /v1/auth/activate-account { token, password }
    API->>SVC: Validate Token & Hash Password with Bcrypt
    SVC->>DB: UPDATE "User" SET status = ACTIVE, mustChangePassword = false
    SVC->>DB: DELETE FROM "AccountActivationToken"
    API-->>UI: 200 OK (Account Activated)

    EMP->>UI: Logs in with New Password
    UI->>API: POST /v1/auth/login
    API-->>UI: Returns JWT with Assigned Role & DataScope Permissions
    UI->>EMP: Loads Role-Specific Admin Layout
```

**Verification Status**: **FULLY IMPLEMENTED**. Handles employee creation, transactional email invitation via Durable Outbox, single-use token validation, password setup, role assignment, and subsequent dashboard access.

---

#### C. Admission CRM & Lead Conversion Workflow
```mermaid
sequenceDiagram
    autonumber
    actor Lead as Student / Inquirer
    participant Pub as Public Web / Landing Page
    participant API as LeadController (/v1/leads)
    participant CRM as LeadService & TaskService
    participant DB as Neon PostgreSQL
    actor C as Assigned Counselor

    Lead->>Pub: Submits Inquiry / Callback Request
    Pub->>API: POST /v1/leads (Name, Mobile, State, Course)
    API->>CRM: Ingest Lead & Deduplicate by Mobile
    CRM->>DB: INSERT INTO "Lead" (Stage: NEW, Priority: WARM)
    CRM->>DB: Automatically Assign to Available Counselor
    CRM->>DB: INSERT INTO "Task" (Type: CALL_STUDENT, Deadline: +24h)
    
    C->>API: GET /v1/leads/my (Filtered by Counselor DataScope)
    API-->>C: Returns Assigned Lead Details
    C->>API: POST /v1/crm-activity/log (Call Log: Interested in B.Tech)
    API->>DB: INSERT INTO "CrmActivity"
    API->>DB: UPDATE "Lead" SET stage = INTERESTED
    
    C->>API: POST /v1/leads/:id/convert-to-application
    API->>DB: INSERT INTO "Application" linked to Lead
    API->>DB: UPDATE "Lead" SET stage = CONVERTED
    API-->>C: 200 OK (Application Form Initialized)
```

**Verification Status**: **FULLY IMPLEMENTED**. Features lead capture, automated round-robin or capacity-based counselor assignment, follow-up task creation, call activity logging, and conversion into an active application.

---

#### D. College & Course Lifecycle Workflow
```mermaid
sequenceDiagram
    autonumber
    actor MGR as College Manager / Admin
    participant UI as Colleges Admin Page
    participant API as CollegesController & CoursesController
    participant SVC as CollegesService
    participant DB as Neon PostgreSQL
    actor S as Public Student

    MGR->>UI: Enters College Details, NAAC Grade, Cutoffs, Photos
    UI->>API: POST /v1/colleges
    API->>SVC: Validate Accreditations and Geographic State
    SVC->>DB: INSERT INTO "College", "CollegeProfile", "CollegeFacility"
    
    MGR->>UI: Attaches Courses & Annual Fee Structure
    UI->>API: POST /v1/colleges/:id/offerings
    API->>DB: INSERT INTO "CollegeOffering", "CourseFee"
    
    MGR->>UI: Publishes College Profile
    UI->>API: PATCH /v1/colleges/:id/status { status: "ACTIVE" }
    API->>DB: UPDATE "College" SET status = "ACTIVE"
    
    S->>API: GET /v1/colleges?state=Karnataka&stream=ENGINEERING
    API-->>S: Returns Active College in Search Catalog
```

**Verification Status**: **FULLY IMPLEMENTED**. Includes multi-tab college creation, facility toggles, course association, fee breakdown, Excel-based bulk upload (`colleges-bulk.service.ts`), and public catalogue rendering.

---

#### E. Payment & Official Admission Receipt Workflow
```mermaid
sequenceDiagram
    autonumber
    actor S as Student
    participant UI as Student Portal / Checkout
    participant API as PaymentsController (/v1/payments)
    participant RZP as Razorpay Payment Gateway
    participant DB as Neon PostgreSQL

    S->>UI: Enters Coupon Code "SCHOLAR500" & Clicks Pay
    UI->>API: POST /v1/coupons/validate { code, amount }
    API->>DB: Check Validity, Expiration & Usage Limits
    API-->>UI: 200 OK (Discount Applied)

    UI->>API: POST /v1/payments/order { applicationId, amount, feeType }
    API->>RZP: Create Order (amount, currency: INR)
    RZP-->>API: Returns order_id (e.g. order_O18274712)
    API->>DB: INSERT INTO "Payment" (Status: INITIATED)
    API-->>UI: Returns order_id & Razorpay Key

    UI->>S: Opens Razorpay Checkout Modal (UPI / Card / NetBanking)
    S->>RZP: Authorizes Payment
    RZP-->>UI: Returns razorpay_payment_id & razorpay_signature

    UI->>API: POST /v1/payments/verify { orderId, paymentId, signature }
    API->>API: Verify HMAC SHA256 Signature using RAZORPAY_KEY_SECRET
    API->>DB: UPDATE "Payment" SET status = SUCCESS, paymentId = ...
    API->>DB: INSERT INTO "Receipt" (receiptNumber, officialStamp)
    API->>DB: UPDATE "Application" SET paymentStatus = PAID
    API-->>UI: 200 OK (Payment Verified)
    UI->>S: Displays Official Admission Receipt with Download Button
```

**Verification Status**: **FULLY IMPLEMENTED**. Backed by real Razorpay SDK integrations, HMAC SHA256 signature verification, webhook processing (`payment-webhook.controller.ts`), database ledgers, coupon validation, and digital receipt generation.

---

#### F. Notification Outbox & Worker Workflow
```mermaid
sequenceDiagram
    autonumber
    participant App as Any Platform Service
    participant Outbox as DurableOutboxService
    participant DB as Neon PostgreSQL
    participant Loop as In-Process Polling Worker (Every 5s)
    participant Dispatch as NotificationChannelsService
    actor R as Recipient (Email/SMS/WhatsApp)

    App->>Outbox: enqueueJob({ channel: 'EMAIL', recipientEmail, subject, html })
    Outbox->>DB: INSERT INTO "Notification" (Status: PENDING)
    Outbox->>DB: INSERT INTO "CommunicationDelivery" (Status: QUEUED)
    
    loop Every 5 Seconds
        Loop->>DB: SELECT * FROM "CommunicationDelivery" WHERE status = 'QUEUED' LIMIT 20 FOR UPDATE SKIP LOCKED
        DB-->>Loop: Returns Batch of Deliveries
        Loop->>Dispatch: Send via Configured Channel
        alt Email Channel
            Dispatch->>R: Transports via Nodemailer (Gmail/SMTP)
        else WhatsApp Channel
            Dispatch->>R: POST https://graph.facebook.com/v20.0/messages (Meta Cloud API)
        else SMS Channel
            Dispatch->>R: POST https://www.fast2sms.com/dev/bulkV2 (Fast2SMS API)
        end
        alt Success
            Loop->>DB: UPDATE "CommunicationDelivery" SET status = 'DELIVERED', sentAt = NOW()
        else Failure
            Loop->>DB: UPDATE "CommunicationDelivery" SET status = 'FAILED', retryCount = retryCount + 1, nextRetryAt = NOW() + 60s
        end
    end
```

**Verification Status**: **FULLY IMPLEMENTED**. Provides fault-tolerant outbox delivery with 5-second polling, transactional consistency, retry backoff, and delivery status tracking across Email, SMS, and WhatsApp.

---

### 2. Comprehensive Functional Module Inventory

| Module Domain | Feature Name | Frontend Component | Backend Controller | Database Entities | Status | Verification Notes |
|---|---|---|---|---|---|---|
| **Identity & Auth** | Student Registration | `AuthModal.tsx` | `AuthController` | `User`, `StudentProfile` | **FULLY IMPLEMENTED** | Creates user with `Role: STUDENT`, initializes profile. |
| **Identity & Auth** | Email/Password Login | `LoginPage.tsx` / `AuthModal.tsx` | `AuthController` | `User`, `UserDeviceSession` | **FULLY IMPLEMENTED** | Issues JWT and refresh token; records IP/device. |
| **Identity & Auth** | Mobile OTP Login | `AuthModal.tsx` | `AuthController` | `User`, `OtpVerification` | **FULLY IMPLEMENTED** | Fast2SMS integration with 6-digit cryptographic OTP. |
| **Identity & Auth** | Google OAuth Login | `AuthModal.tsx` | `AuthController` | `User`, `SocialAccount` | **FULLY IMPLEMENTED** | `google-auth-library` validates Google ID tokens. |
| **Identity & Auth** | Token Refresh Rotation| `axios.ts` interceptors | `AuthController` | `RefreshToken` | **FULLY IMPLEMENTED** | Single-use refresh token with concurrency queue. |
| **Identity & Auth** | Password Reset | `AccountActivationPage.tsx` | `AuthController` | `PasswordResetToken` | **FULLY IMPLEMENTED** | Outbox sends reset link; token validated with 24h TTL. |
| **Identity & Auth** | Staff Activation | `AccountActivationPage.tsx` | `AuthController` | `AccountActivationToken` | **FULLY IMPLEMENTED** | Enforces password change on first employee login. |
| **Students** | Academic Profile | `StudentDashboard.tsx` | `StudentsController` | `StudentProfile`, `StudentEducation` | **FULLY IMPLEMENTED** | Stores 10th, 12th, graduation marks and board info. |
| **Students** | Saved Colleges | `StudentDashboard.tsx` | `StudentsController` | `SavedCollege` | **FULLY IMPLEMENTED** | Toggle bookmark on any college; view in dashboard. |
| **Students** | Student Journey Map| `StudentDashboard.tsx` | `JourneyController` | `StudentJourney`, `JourneyMilestone` | **FULLY IMPLEMENTED** | Visual timeline from registration to enrollment. |
| **Admissions** | Application Wizard | `ApplyNowPage.tsx` | `ApplicationController`| `Application`, `ApplicationDeclaration`| **FULLY IMPLEMENTED** | Multi-step form with dynamic eligibility checks. |
| **Admissions** | Application Review | `ApplicationsPage.tsx` | `ApplicationController`| `Application`, `ApplicationTimeline`| **FULLY IMPLEMENTED** | Status transitions: Under Review, Approved, Rejected. |
| **Admissions** | Seat Confirmation | `ReportingEnrollmentPage.tsx`| `ReportingEnrollmentController`| `ReportingEnrollment`, `SeatAllotment`| **FULLY IMPLEMENTED**| Generates official seat allotment confirmation slip. |
| **Documents** | Document Vault | `StudentDashboard.tsx` | `DocumentsController` | `Document`, `StorageVault` | **FULLY IMPLEMENTED** | Restricts MIME types (PDF, PNG, JPG) to 10MB max. |
| **Documents** | PDF Watermarking | Internal Service | Internal Service | `Document` | **FULLY IMPLEMENTED** | `pdf-lib` stamps candidate name, application ID, date. |
| **Documents** | Document Deletion | `DocumentsPage.tsx` | `DocumentsController` | `DocumentDeletionRequest` | **FULLY IMPLEMENTED** | 2-step GDPR-compliant document deletion audit. |
| **Payments** | Razorpay Checkout | `StudentPaymentCenter.tsx`| `PaymentsController` | `Payment`, `PaymentOrder` | **FULLY IMPLEMENTED** | Generates order, verifies HMAC signature, logs status. |
| **Payments** | Coupon Engine | `CouponApplyWidget.tsx` | `CouponController` | `Coupon`, `CouponRedemption` | **FULLY IMPLEMENTED** | Validates expiry, min amount, max redemptions. |
| **Payments** | Digital Receipt | `OfficialAdmissionReceiptModal.tsx`| `PaymentsController`| `Receipt`, `FinancialLedger` | **FULLY IMPLEMENTED** | Serialized receipt with institutional branding. |
| **CRM & Leads** | Lead Capture | Public forms / Footer | `LeadController` | `Lead`, `LeadSource` | **FULLY IMPLEMENTED** | Captures lead, parses UTM tags, deduplicates mobile. |
| **CRM & Leads** | Counselor Allocation| `LeadsPage.tsx` | `LeadController` | `Lead`, `CounselorProfile` | **FULLY IMPLEMENTED** | Manual or automated lead distribution. |
| **CRM & Leads** | Call Activity Log | `CrmTasksPage.tsx` | `CrmActivityController`| `CrmActivity`, `LeadNote` | **FULLY IMPLEMENTED** | Logs call outcomes (Interested, Callback, Closed). |
| **Rankings** | 9-Pillar Framework| `CollegeRankingsPage.tsx` | `RankingsController` | `RankingEdition`, `CollegeRankingResult`| **FULLY IMPLEMENTED**| Multi-pillar calculation engine (Academic, Placement, etc.). |
| **Rankings** | Ranking Admin CMS | `CollegeRankingAdminPage.tsx`| `RankingsController` | `RankingMethodology`, `RankingPillar`| **FULLY IMPLEMENTED**| Modifies pillar weights, re-runs annual cycle scoring. |
| **AI Advisory** | AI Counselor Chat | `AICounselorPage.tsx` | `AiCounselorController`| `AiConversation`, `AiMessage` | **FULLY IMPLEMENTED** | Grounded in college database via RAG engine. |
| **Communications**| Outbox Broadcast | `NotificationsPage.tsx` | `NotificationsController`| `CommunicationCampaign`, `Outbox` | **FULLY IMPLEMENTED** | Filtered audience broadcast via SMS, WhatsApp, Email. |
| **Communications**| LiveSync WebSockets| `Header.tsx` / `Root.tsx` | `LiveSyncGateway` | In-memory socket rooms | **FULLY IMPLEMENTED** | Cross-tab instant notification and status sync. |
| **Content & CMS** | Blog Publication | `BlogPage.tsx` / `BlogsPage.tsx`| `BlogController` | `Blog`, `BlogCategory` | **FULLY IMPLEMENTED** | Editorial workflow with SEO meta fields and slug router. |
| **Content & CMS** | FAQ Management | `FAQPage.tsx` / `FAQsPage.tsx`| `FaqController` | `FAQ`, `FaqCategory` | **FULLY IMPLEMENTED** | Categorized question and answer repository. |
| **Content & CMS** | Page Banners | `HomePage.tsx` / `BannersPage.tsx`| `BannersController`| `Banner` | **FULLY IMPLEMENTED** | Hero slider promotion management. |
| **HR & Careers** | Public Careers | `CareersPage.tsx` | `CareersController` | `JobVacancy`, `Department` | **FULLY IMPLEMENTED** | Active job vacancy listings by department. |
| **HR & Careers** | Candidate Offers | `CandidateOfferViewPage.tsx`| `CareersController` | `Offer`, `RecruitmentOnboarding` | **FULLY IMPLEMENTED** | Digital offer acceptance with terms agreement. |
| **Referrals** | Referral Program | `ReferralDashboard.tsx` | `ReferralController` | `StudentReferralCode`, `RewardLedger`| **FULLY IMPLEMENTED**| Referral link generation, code tracking, wallet credits. |
| **Governance** | Legal Policy CMS | `LegalPoliciesPage.tsx` | `LegalController` | `LegalPolicy`, `PolicyAcceptance` | **FULLY IMPLEMENTED** | Tracks student consent timestamps per policy version. |
| **Governance** | Audit Trail Log | `ActivityLogsPage.tsx` | `AuditController` | `AuditLog` | **FULLY IMPLEMENTED** | Immutable record of who modified what record. |
| **Marketing** | Campaign UTMs | `MarketingPage.tsx` | `MarketingController` (Unmounted)| `Campaign` | **PARTIAL** | Frontend UI exists; backend module unmounted in `AppModule`. |

