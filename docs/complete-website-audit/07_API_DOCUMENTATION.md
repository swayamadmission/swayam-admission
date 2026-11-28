# SWAYAM ADMISSION — COMPLETE TECHNICAL & FUNCTIONAL AUDIT
## 07. API Documentation and Backend Architecture

This document provides a complete audit of all REST API endpoints implemented across the Swayam Admission backend.

---

### 1. API Architecture & Inventory Summary

| Architectural Dimension | Measured Metric | Details & Verification Source |
|---|---|---|
| **Total Endpoints in Codebase** | **1,024 Endpoints** | Discovered across 75 `.controller.ts` files. |
| **Mounted / Active Endpoints** | **987 Endpoints** | Declared in modules directly imported in `AppModule`. |
| **Unmounted / Inactive Endpoints** | **37 Endpoints** | Located in 17 unmounted or duplicate controller files. |
| **Endpoints Protected by Guards** | **974 Endpoints** | Enforced via `JwtAuthGuard`, `RolesGuard`, or `PermissionGuard`. |
| **Endpoints with Explicit Roles** | **358 Endpoints** | Enforced via `@Roles('ADMIN', 'SUPER_ADMIN', ...)` decorators. |
| **Public / Unguarded Endpoints** | **45 Endpoints** | Includes login, registration, public catalog, health probes. |
| **Actively Called by Frontends** | **869 Endpoints** | Verified against frontend API clients. |
| **Uncalled / Unused by Frontends** | **118 Endpoints** | Internal administrative, webhook, or planned endpoints. |
| **Global Route Prefix** | `/v1` | Configured globally in `main.ts` (excluding `/uploads/*`). |

---

### 2. API Endpoints Catalog by Module

#### A. Authentication & IAM APIs (`backend/src/auth`)
*Controller: `AuthController` (`/v1/auth`), `OtpAdminController` (`/v1/admin/otp-settings`)*

| Method | Route Path | Handler Method | Guards & Permissions | Roles | Frontend Usage |
|---|---|---|---|---|---|
| `POST` | `/v1/auth/login` | `login()` | None (Public) | Public | Used by Admin & User |
| `POST` | `/v1/auth/register` | `register()` | None (Public) | Public | Used by User |
| `POST` | `/v1/auth/refresh` | `refreshToken()` | None (Refresh Token Body) | Public | Used by Admin & User |
| `POST` | `/v1/auth/logout` | `logout()` | `JwtAuthGuard` | Any Auth | Used by Admin & User |
| `POST` | `/v1/auth/forgot-password` | `forgotPassword()` | None (Public) | Public | Used by User |
| `POST` | `/v1/auth/reset-password` | `resetPassword()` | None (Token Validation) | Public | Used by Admin & User |
| `POST` | `/v1/auth/activate-account`| `activateAccount()` | None (Token Validation) | Public | Used by Admin |
| `POST` | `/v1/auth/google` | `googleAuth()` | None (Google ID Token) | Public | Used by User |
| `POST` | `/v1/auth/mobile/request-otp` | `requestMobileOtp()` | None (Public) | Public | Used by User |
| `POST` | `/v1/auth/mobile/verify-otp` | `verifyMobileOtp()` | None (Public) | Public | Used by User |
| `POST` | `/v1/auth/email/request-otp` | `requestEmailOtp()` | `JwtAuthGuard` | Student | Used by User |
| `POST` | `/v1/auth/email/verify-otp` | `verifyEmailOtp()` | `JwtAuthGuard` | Student | Used by User |
| `GET` | `/v1/admin/otp-settings` | `getOtpSettings()` | `JwtAuthGuard`, `RolesGuard` | `SUPER_ADMIN` | Used by Admin |
| `PUT` | `/v1/admin/otp-settings` | `updateOtpSettings()` | `JwtAuthGuard`, `RolesGuard` | `SUPER_ADMIN` | Used by Admin |
| `POST` | `/v1/admin/otp-settings/test-dispatch` | `testDispatch()` | `JwtAuthGuard`, `RolesGuard` | `SUPER_ADMIN` | Used by Admin |

---

#### B. Student Lifecycle APIs (`backend/src/students`)
*Controller: `StudentsController` (`/v1/students`)*

| Method | Route Path | Handler Method | Guards & Permissions | Roles | Frontend Usage |
|---|---|---|---|---|---|
| `GET` | `/v1/students` | `findAll()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `COUNSELOR` | Used by Admin |
| `GET` | `/v1/students/me` | `getProfile()` | `JwtAuthGuard` | `STUDENT` | Used by User |
| `PUT` | `/v1/students/me` | `updateProfile()` | `JwtAuthGuard` | `STUDENT` | Used by User |
| `GET` | `/v1/students/:id` | `findOne()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `COUNSELOR` | Used by Admin |
| `PUT` | `/v1/students/:id` | `update()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` | Used by Admin |
| `POST` | `/v1/students/shortlist` | `saveCollege()` | `JwtAuthGuard` | `STUDENT` | Used by User |
| `DELETE` | `/v1/students/shortlist/:id` | `removeCollege()` | `JwtAuthGuard` | `STUDENT` | Used by User |
| `GET` | `/v1/students/shortlist/my` | `getMyShortlist()` | `JwtAuthGuard` | `STUDENT` | Used by User |

---

#### C. Application & Admission APIs (`backend/src/application`)
*Controller: `ApplicationController` (`/v1/application`)*

| Method | Route Path | Handler Method | Guards & Permissions | Roles | Frontend Usage |
|---|---|---|---|---|---|
| `POST` | `/v1/application/submit` | `submitApplication()` | `JwtAuthGuard` | `STUDENT` | Used by User |
| `GET` | `/v1/application/my` | `getMyApplications()` | `JwtAuthGuard` | `STUDENT` | Used by User |
| `GET` | `/v1/application/:id` | `getApplicationById()` | `JwtAuthGuard` | Any Auth | Used by Admin & User |
| `GET` | `/v1/application` | `getAllApplications()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `COUNSELOR` | Used by Admin |
| `PATCH`| `/v1/application/:id/status`| `updateStatus()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `COUNSELOR` | Used by Admin |
| `POST` | `/v1/application/:id/counselor` | `assignCounselor()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` | Used by Admin |
| `GET` | `/v1/application/:id/timeline` | `getTimeline()` | `JwtAuthGuard` | Any Auth | Used by Admin & User |
| `POST` | `/v1/application/:id/notes` | `addNote()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `COUNSELOR` | Used by Admin |
| `GET` | `/v1/application/:id/notes` | `getNotes()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `COUNSELOR` | Used by Admin |

---

#### D. Colleges & Courses APIs (`backend/src/colleges`, `backend/src/courses`)
*Controllers: `CollegesController` (`/v1/colleges`), `OfferingsController` (`/v1/colleges/:id/offerings`), `CoursesController` (`/v1/courses`)*

| Method | Route Path | Handler Method | Guards & Permissions | Roles | Frontend Usage |
|---|---|---|---|---|---|
| `GET` | `/v1/colleges` | `findAll()` | None (Public) | Public | Used by Admin & User |
| `GET` | `/v1/colleges/:id` | `findOne()` | None (Public) | Public | Used by Admin & User |
| `POST` | `/v1/colleges` | `create()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `COLLEGE_MANAGER` | Used by Admin |
| `PUT` | `/v1/colleges/:id` | `update()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `COLLEGE_MANAGER` | Used by Admin |
| `DELETE`| `/v1/colleges/:id` | `remove()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` | Used by Admin |
| `POST` | `/v1/colleges/bulk-import` | `bulkImport()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` | Used by Admin |
| `GET` | `/v1/colleges/:id/offerings`| `getOfferings()` | None (Public) | Public | Used by Admin & User |
| `POST` | `/v1/colleges/:id/offerings`| `createOffering()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` | Used by Admin |
| `GET` | `/v1/courses` | `findAll()` | None (Public) | Public | Used by Admin & User |
| `GET` | `/v1/courses/:id` | `findOne()` | None (Public) | Public | Used by Admin & User |
| `POST` | `/v1/courses` | `create()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` | Used by Admin |
| `PUT` | `/v1/courses/:id` | `update()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` | Used by Admin |
| `DELETE`| `/v1/courses/:id` | `remove()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` | Used by Admin |

---

#### E. Document Vault & Watermarking APIs (`backend/src/documents`)
*Controller: `DocumentsController` (`/v1/documents`)*

| Method | Route Path | Handler Method | Guards & Permissions | Roles | Frontend Usage |
|---|---|---|---|---|---|
| `POST` | `/v1/documents/upload` | `uploadDocument()` | `JwtAuthGuard` | Any Auth | Used by Admin & User |
| `GET` | `/v1/documents/my` | `getMyDocuments()` | `JwtAuthGuard` | `STUDENT` | Used by User |
| `GET` | `/v1/documents/queue` | `getVerificationQueue()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `COUNSELOR` | Used by Admin |
| `PATCH`| `/v1/documents/:id/verify` | `verifyDocument()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `COUNSELOR` | Used by Admin |
| `PATCH`| `/v1/documents/:id/reject` | `rejectDocument()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `COUNSELOR` | Used by Admin |
| `GET` | `/v1/documents/:id/download`| `downloadSecure()` | `JwtAuthGuard` | Authorized Viewer | Used by Admin & User |
| `POST` | `/v1/documents/deletion-requests` | `requestDeletion()` | `JwtAuthGuard` | `STUDENT` | Used by User |
| `GET` | `/v1/documents/deletion-requests` | `getDeletionRequests()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `AUDITOR` | Used by Admin |

---

#### F. Payments & Gateway APIs (`backend/src/payments`)
*Controllers: `PaymentsController` (`/v1/payments`), `PaymentWebhookController` (`/v1/payments/webhook`)*

| Method | Route Path | Handler Method | Guards & Permissions | Roles | Frontend Usage |
|---|---|---|---|---|---|
| `POST` | `/v1/payments/order` | `createOrder()` | `JwtAuthGuard` | `STUDENT` | Used by User |
| `POST` | `/v1/payments/verify` | `verifyPayment()` | `JwtAuthGuard` | `STUDENT` | Used by User |
| `POST` | `/v1/payments/webhook` | `handleRazorpayWebhook()` | None (HMAC Verification) | Public / Gateway | Webhook Receiver |
| `GET` | `/v1/payments/history` | `getPaymentHistory()` | `JwtAuthGuard` | `STUDENT` | Used by User |
| `GET` | `/v1/payments` | `getAllPayments()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ACCOUNTS_MANAGER`| Used by Admin |
| `GET` | `/v1/payments/:id/receipt`| `getReceipt()` | `JwtAuthGuard` | Authorized | Used by Admin & User |
| `POST` | `/v1/payments/manual-record`| `recordManual()` | `JwtAuthGuard`, `RolesGuard`| `ACCOUNTS_MANAGER` | Used by Admin |

---

#### G. CRM, Leads & Follow-ups APIs (`backend/src/lead`, `backend/src/tasks`, `backend/src/crm-activity`)
*Controllers: `LeadController` (`/v1/leads`), `TasksController` (`/v1/tasks`), `CrmActivityController` (`/v1/crm-activity`)*

| Method | Route Path | Handler Method | Guards & Permissions | Roles | Frontend Usage |
|---|---|---|---|---|---|
| `POST` | `/v1/leads` | `createLead()` | None (Public Capture) | Public | Used by Public / Landing |
| `GET` | `/v1/leads` | `findAll()` | `JwtAuthGuard`, `PermissionGuard`| `ADMIN`, `COUNSELOR` | Used by Admin |
| `GET` | `/v1/leads/:id` | `findOne()` | `JwtAuthGuard`, `PermissionGuard`| `ADMIN`, `COUNSELOR` | Used by Admin |
| `PATCH`| `/v1/leads/:id` | `updateLead()` | `JwtAuthGuard`, `PermissionGuard`| `ADMIN`, `COUNSELOR` | Used by Admin |
| `POST` | `/v1/leads/:id/assign` | `assignCounselor()`| `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `SENIOR_COUNSELOR`| Used by Admin |
| `GET` | `/v1/tasks` | `getTasks()` | `JwtAuthGuard` | `COUNSELOR` | Used by Admin |
| `POST` | `/v1/tasks` | `createTask()` | `JwtAuthGuard` | `COUNSELOR`, `ADMIN` | Used by Admin |
| `PATCH`| `/v1/tasks/:id` | `updateTask()` | `JwtAuthGuard` | `COUNSELOR` | Used by Admin |
| `POST` | `/v1/crm-activity` | `logActivity()` | `JwtAuthGuard` | `COUNSELOR` | Used by Admin |
| `GET` | `/v1/crm-activity/lead/:id` | `getLeadActivities()`| `JwtAuthGuard` | `COUNSELOR`, `ADMIN` | Used by Admin |

---

#### H. 9-Pillar Rankings & Reviews APIs (`backend/src/reviews-ranking`)
*Controllers: `RankingsController` (`/v1/reviews-ranking/rankings`), `ReviewsController` (`/v1/reviews-ranking/reviews`)*

| Method | Route Path | Handler Method | Guards & Permissions | Roles | Frontend Usage |
|---|---|---|---|---|---|
| `GET` | `/v1/reviews-ranking/rankings` | `getPublicRankings()` | None (Public) | Public | Used by User |
| `GET` | `/v1/reviews-ranking/rankings/edition/:id`| `getEdition()` | None (Public) | Public | Used by User |
| `GET` | `/v1/reviews-ranking/rankings/methodology` | `getMethodology()` | None (Public) | Public | Used by User |
| `POST` | `/v1/reviews-ranking/rankings/calculate` | `executeScoringCycle()`| `JwtAuthGuard`, `RolesGuard`| `SUPER_ADMIN` | Used by Admin |
| `PUT` | `/v1/reviews-ranking/rankings/methodology` | `updateMethodology()` | `JwtAuthGuard`, `RolesGuard`| `SUPER_ADMIN` | Used by Admin |
| `GET` | `/v1/reviews-ranking/reviews/college/:id` | `getCollegeReviews()` | None (Public) | Public | Used by User |
| `POST` | `/v1/reviews-ranking/reviews` | `submitReview()` | `JwtAuthGuard` | `STUDENT` | Used by User |
| `GET` | `/v1/reviews-ranking/reviews/moderation` | `getModerationQueue()` | `JwtAuthGuard`, `RolesGuard`| `CONTENT_MANAGER` | Used by Admin |
| `PATCH`| `/v1/reviews-ranking/reviews/:id/status` | `updateReviewStatus()` | `JwtAuthGuard`, `RolesGuard`| `CONTENT_MANAGER` | Used by Admin |

---

#### I. Notifications & Durable Outbox APIs (`backend/src/notifications`)
*Controllers: `NotificationsController` (`/v1/notifications`), `CommunicationCampaignController` (`/v1/notifications/campaigns`), `AudienceController` (`/v1/notifications/audiences`)*

| Method | Route Path | Handler Method | Guards & Permissions | Roles | Frontend Usage |
|---|---|---|---|---|---|
| `GET` | `/v1/notifications/my` | `getMyNotifications()` | `JwtAuthGuard` | Any Auth | Used by Admin & User |
| `PATCH`| `/v1/notifications/:id/read` | `markAsRead()` | `JwtAuthGuard` | Any Auth | Used by Admin & User |
| `POST` | `/v1/notifications/campaigns` | `createCampaign()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MARKETING_TEAM`| Used by Admin |
| `GET` | `/v1/notifications/campaigns` | `getCampaigns()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MARKETING_TEAM`| Used by Admin |
| `POST` | `/v1/notifications/campaigns/:id/dispatch` | `dispatchCampaign()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` | Used by Admin |
| `GET` | `/v1/notifications/outbox/metrics` | `getOutboxMetrics()` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` | Used by Admin |
| `POST` | `/v1/notifications/audiences` | `createAudience()` | `JwtAuthGuard`, `RolesGuard` | `MARKETING_TEAM` | Used by Admin |

---

#### J. AI Counselor & Advisory APIs (`backend/src/ai-counselor`, `backend/src/ai`)
*Controllers: `AiCounselorController` (`/v1/ai-counselor`), `AiController` (`/v1/ai`)*

| Method | Route Path | Handler Method | Guards & Permissions | Roles | Frontend Usage |
|---|---|---|---|---|---|
| `POST` | `/v1/ai-counselor/chat` | `handleChat()` | `OptionalJwtAuthGuard` | Public / Student | Used by User |
| `GET` | `/v1/ai-counselor/recommendations` | `getRecommendations()` | `OptionalJwtAuthGuard` | Public / Student | Used by User |
| `POST` | `/v1/ai-counselor/feedback` | `recordFeedback()` | `OptionalJwtAuthGuard` | Public / Student | Used by User |
| `GET` | `/v1/ai/settings` | `getAiSettings()` | `JwtAuthGuard`, `RolesGuard` | `SUPER_ADMIN` | Used by Admin |
| `PUT` | `/v1/ai/settings` | `updateAiSettings()` | `JwtAuthGuard`, `RolesGuard` | `SUPER_ADMIN` | Used by Admin |
| `POST` | `/v1/ai/prompts` | `createPromptTemplate()`| `JwtAuthGuard`, `RolesGuard` | `SUPER_ADMIN` | Used by Admin |

---

#### K. System Health & Common APIs (`backend/src/health`, `backend/src/common`)
*Controllers: `HealthController` (`/v1/health`), `CommonController` (`/v1/common`)*

| Method | Route Path | Handler Method | Guards & Permissions | Roles | Frontend Usage |
|---|---|---|---|---|---|
| `GET` | `/v1/health` | `getStatus()` | `@SkipThrottle()` | Public | Used by Render & Monitoring |
| `GET` | `/v1/health/liveness` | `checkLiveness()` | `@SkipThrottle()` | Public | Render Probes |
| `GET` | `/v1/health/readiness` | `checkReadiness()` | `@SkipThrottle()` | Public | Render Probes |
| `GET` | `/v1/health/providers` | `getProviderHealth()` | `@SkipThrottle()` | Public | Used by Admin Diagnostics |
| `GET` | `/v1/health/worker` | `getWorkerHealth()` | `@SkipThrottle()` | Public | Used by Admin Diagnostics |
| `GET` | `/v1/health/auth` | `getAuthHealth()` | `@SkipThrottle()` | Public | Diagnostic Probe |
| `GET` | `/v1/common/system-info` | `getSystemInfo()` | `JwtAuthGuard` | Any Auth | Used by Admin & User |

---

### 3. API Contract Discrepancies & Orphan Endpoints

#### A. Frontend Calls Missing Backend Routes (Broken / Disconnected Calls)
Cross-referencing revealed **22 unique unmatched routes in Admin** and **9 in User**:
1. `GET /v1/marketing/*`: Admin calls marketing routes, but `MarketingModule` is unmounted in `AppModule`.
2. `GET /v1/recommendation/*`: User calls `/recommendation/homepage`, but `RecommendationModule` is unmounted in `AppModule` (the active recommendation logic is located at `/ai-counselor/recommendations`).
3. `POST /v1/chat/conversation/*`: Admin chat client calls subpath `/chat/conversation`, while `ChatController` mounts at `/chat` without the `/conversation` prefix.
4. `GET /v1/users/me/recently-viewed`: User frontend calls `/users/me/recently-viewed`, but the controller does not expose this sub-route.

#### B. Inactive / Unmounted Backend Controllers (37 Dead Endpoints)
1. `AdmissionWorkflowController` (2 endpoints): Unmounted legacy admission state machine.
2. `AiAnalyticsController` (1 endpoint): Unmounted sentiment controller.
3. `AiRecommendationController` (2 endpoints): Unmounted recommendation controller.
4. `CareerController` (5 endpoints): Duplicate of mounted `CareersController`.
5. `ExamController` (5 endpoints): Duplicate of mounted `ExamsController`.
6. `KnowledgeBaseController` (4 endpoints): Unmounted knowledge articles controller.
7. `MarketingController` (10 endpoints): Unmounted campaign tracking controller.
8. `RecommendationController` (1 endpoint): Unmounted shortlist controller.
9. `ScholarshipController` (4 endpoints): Duplicate of mounted `ScholarshipsController`.
10. `modules/*` controllers (Media, Navigation, Pages, SEO - 22 endpoints): Entire folder disconnected.

