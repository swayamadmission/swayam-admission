# SWAYAM ADMISSION — COMPLETE TECHNICAL & FUNCTIONAL AUDIT
## 04. Website Pages and Routes Audit

This document catalogs every user-facing page, route, view, and modal across both the Public/Student Portal (`frontend/user`) and the Admin/ERP Portal (`frontend/admin`), verifying component files, backend API consumption, authentication gates, database models, and actual implementation statuses.

---

### 1. Public Website & Student Portal Routes (`frontend/user`)

The public website utilizes React Router 7 (`createBrowserRouter`). All routes are wrapped in a shared shell layout (`Root.tsx`) providing the global navigation bar, emergency announcement banner, and footer.

| # | Route URL / Path | Component File | Main Features & UI Interactions | APIs Consumed | Auth Required? | Database Entities | Verified Status |
|---|---|---|---|---|---|---|---|
| **1** | `/` (index) | `HomePage.tsx` | Hero banner search, trending streams, featured colleges, top ranking spotlight, student testimonials, promotional sliders. | `GET /v1/colleges`, `GET /v1/banners`, `GET /v1/testimonials` | Public | `College`, `Banner`, `Testimonial`, `Review` | **FULLY IMPLEMENTED** |
| **2** | `/search` | `SearchResultsPage.tsx` | Global search result listing with instant keyword filtering across colleges, courses, exams, and articles. | `GET /v1/search?q={query}` | Public | `College`, `Course`, `Exam`, `Blog` | **FULLY IMPLEMENTED** |
| **3** | `/colleges` | `CollegesPage.tsx` | Filterable college directory with state, course, fee, and rating multi-select facets, search, and pagination. | `GET /v1/colleges`, `GET /v1/organization/states` | Public | `College`, `State`, `CourseOffering` | **FULLY IMPLEMENTED** |
| **4** | `/colleges/:id` | `CollegeDetailPage.tsx` | Comprehensive college profile: 9-pillar ranking breakdown, courses & fees tab, cutoffs, campus facilities, verified reviews, brochure download, "Apply Now" CTA. | `GET /v1/colleges/:id`, `GET /v1/colleges/:id/offerings`, `GET /v1/reviews/college/:id` | Public | `College`, `CollegeProfile`, `CollegePillarScore`, `Review` | **FULLY IMPLEMENTED** |
| **5** | `/colleges/compare`| `CompareCollegesPage.tsx` | Side-by-side comparison matrix for up to 4 colleges evaluating fees, NAAC grades, median package, rankings, and campus amenities. | `GET /v1/colleges/compare` | Public | `College`, `CourseFee`, `CollegeRankingResult` | **FULLY IMPLEMENTED** |
| **6** | `/courses` | `CoursesPage.tsx` | Directory of academic disciplines (Engineering, Management, Medical, Law) with duration, eligibility, and top offering colleges. | `GET /v1/courses`, `GET /v1/courses/specializations` | Public | `Course`, `CourseSpecialization`, `Degree` | **FULLY IMPLEMENTED** |
| **7** | `/rankings` | `CollegeRankingsPage.tsx` | Official 9-Pillar College Decision Intelligence Framework ranking board with pillar filtering, year selector, and methodology modal. | `GET /v1/reviews-ranking/rankings`, `GET /v1/reviews-ranking/methodology` | Public | `RankingEdition`, `CollegeRankingResult`, `RankingPillar` | **FULLY IMPLEMENTED** |
| **8** | `/exams` | `ExamsPage.tsx` | Entrance exam directory (JEE, NEET, CAT, CLAT) with registration deadlines, eligibility, and preparation tips. | `GET /v1/exams` | Public | `Exam`, `CourseExam` | **FULLY IMPLEMENTED** |
| **9** | `/exams/:slug` | `ExamDetailPage.tsx` | Detailed exam guide: syllabus, question paper pattern, cutoffs, participating institutes, and important dates. | `GET /v1/exams/:slug` | Public | `Exam`, `College` | **FULLY IMPLEMENTED** |
| **10**| `/states` | `StatesPage.tsx` | Geographic state directory highlighting top educational hubs (Karnataka, Maharashtra, Delhi, Tamil Nadu). | `GET /v1/organization/states` | Public | `State`, `District`, `College` | **FULLY IMPLEMENTED** |
| **11**| `/states/:slug` | `StateDetailPage.tsx` | State-level admission overview: top colleges in state, counseling authority details, quota guidelines. | `GET /v1/organization/states/:slug` | Public | `State`, `College` | **FULLY IMPLEMENTED** |
| **12**| `/scholarships` | `ScholarshipsPage.tsx` | Merit-based, minority, and state scholarship directory with award amount, eligibility calculator, and deadline reminders. | `GET /v1/scholarships` | Public | `Scholarship` | **FULLY IMPLEMENTED** |
| **13**| `/scholarships/:slug`| `ScholarshipDetailPage.tsx`| In-depth scholarship criteria, required documents checklist, application link, and provider credentials. | `GET /v1/scholarships/:slug` | Public | `Scholarship` | **FULLY IMPLEMENTED** |
| **14**| `/study-materials` | `StudyMaterialsPage.tsx` | Library of previous year question papers, syllabus guides, mock tests with instant preview and purchase flow. | `GET /v1/study-materials` | Public / Student | `StudyMaterial` | **FULLY IMPLEMENTED** |
| **15**| `/ai-counselor` | `AICounselorPage.tsx` | Conversational AI advisory agent offering personalized course and college recommendations based on student preferences and marks. | `POST /v1/ai-counselor/chat`, `GET /v1/ai-counselor/recommendations` | Public / Student | `AiConversation`, `AiMessage`, `AiRecommendation` | **FULLY IMPLEMENTED** |
| **16**| `/apply-now` | `ApplyNowPage.tsx` | Multi-step interactive student admission application: personal details, academic scores, college/course selection, document upload, and declaration. | `POST /v1/application/submit`, `GET /v1/colleges`, `GET /v1/courses` | Public / Student | `Application`, `StudentProfile`, `Document` | **FULLY IMPLEMENTED** |
| **17**| `/dashboard` | `StudentDashboard.tsx` | Comprehensive student control panel with 14 modular tabs (Overview, Profile, Journey, Saved, Applications, Payments, Docs, etc.). | `GET /v1/students/me`, `GET /v1/application/my`, `GET /v1/documents/my` | **STUDENT JWT** | `User`, `StudentProfile`, `Application`, `Payment` | **FULLY IMPLEMENTED** |
| **18**| `/refer` / `/referrals`| `ReferralDashboard.tsx` | Student referral center showing personal referral link, code, milestone progress, reward ledger, and wallet balance. | `GET /v1/referrals/my-stats`, `POST /v1/referrals/invite` | **STUDENT JWT** | `StudentReferralCode`, `ReferralRewardLedger` | **FULLY IMPLEMENTED** |
| **19**| `/blogs` | `BlogPage.tsx` | Educational news, career guides, admission notices, and counseling editorial articles with category filters. | `GET /v1/blog` | Public | `Blog`, `BlogCategory` | **FULLY IMPLEMENTED** |
| **20**| `/blog/:slug` | `BlogDetailPage.tsx` | Full-text article view with reading time, related colleges, social sharing, and author credentials. | `GET /v1/blog/:slug` | Public | `Blog` | **FULLY IMPLEMENTED** |
| **21**| `/faq` | `FAQPage.tsx` | Frequently asked questions search engine categorized by admissions, counseling, payments, and documents. | `GET /v1/faq` | Public | `FAQ` | **FULLY IMPLEMENTED** |
| **22**| `/faq/:slug` | `FAQDetailPage.tsx` | Detailed single FAQ article with related guides. | `GET /v1/faq/:slug` | Public | `FAQ` | **FULLY IMPLEMENTED** |
| **23**| `/careers` | `CareersPage.tsx` | Swayam Admission institutional job openings directory with department filters and application links. | `GET /v1/hr/careers` | Public | `JobVacancy`, `Department` | **FULLY IMPLEMENTED** |
| **24**| `/careers/:code`| `CareerDetailPage.tsx` | Detailed job profile: responsibilities, requirements, compensation, and candidate apply form modal. | `GET /v1/hr/careers/:code`, `POST /v1/hr/careers/apply` | Public | `JobVacancy`, `JobApplication` | **FULLY IMPLEMENTED** |
| **25**| `/careers/offers/:id`| `CandidateOfferViewPage.tsx`| Official candidate offer letter view with digital acceptance/rejection actions and terms agreement. | `GET /v1/hr/offers/:id`, `POST /v1/hr/offers/:id/accept` | Public / Token | `Offer`, `RecruitmentOnboarding` | **FULLY IMPLEMENTED** |
| **26**| `/contact` | `ContactUsPage.tsx` | General inquiry form, emergency helpdesk numbers, office locations, and grievance ticket submission. | `POST /v1/contact/submit`, `GET /v1/settings/public` | Public | `ContactEnquiry`, `SystemSetting` | **FULLY IMPLEMENTED** |
| **27**| `/policies` | `PublicLegalPage.tsx` | Directory of legal policies (Terms & Conditions, Privacy Policy, Refund Policy, Grievance Policy). | `GET /v1/legal/policies` | Public | `LegalPolicy`, `PolicyVersion` | **FULLY IMPLEMENTED** |
| **28**| `/policies/:slug` | `PublicLegalDetailPage.tsx`| Full-text legal policy with version number, last updated date, and print capability. | `GET /v1/legal/policies/:slug` | Public | `LegalPolicy` | **FULLY IMPLEMENTED** |

---

### 2. Student Dashboard Sub-Views & Protected Sections

Within `/dashboard`, the student portal exposes 14 dedicated views managed by state:

```text
StudentDashboard Tabs:
├── overview        -> KPI metrics (applications count, documents verified, admission status)
├── profile         -> Personal details, 10th/12th academic qualification, guardian information
├── journey         -> Visual milestone roadmap (Registration -> Profile -> App Submitted -> Counseling -> Confirmed)
├── saved           -> Shortlisted and bookmarked colleges with quick comparison links
├── applications    -> Submitted applications list, live statuses, downloadable admission forms
├── payments        -> Fee ledger, outstanding payments, Razorpay checkout, official receipts
├── referrals       -> Student referral code sharing, referral tracking, wallet cash rewards
├── support         -> Helpdesk support ticket submission, message threads, FAQ lookup
├── materials       -> Purchased study materials, PDF viewer, exam papers download
├── blogs           -> Curated career guides and admission preparation articles
├── faqs            -> Categorized help articles and institutional answers
├── docs            -> Document management vault (10th/12th marksheet, Aadhaar, photo upload & verification status)
├── counseling      -> Historical and upcoming counselor meetings, notes, and recommendations
└── notifications   -> In-app notification center with read/unread flags and direct links
```

---

### 3. Modal Dialog Components in Student Portal

| Modal Component | Trigger / Location | Purpose & Backend Connection |
|---|---|---|
| **`AuthModal.tsx`** | Navbar Login/Register buttons | Tabbed login (email/password or mobile OTP) and registration with automatic SMS dispatch (`POST /v1/auth/login`, `POST /v1/auth/register`, `POST /v1/auth/mobile/request-otp`). |
| **`MobileVerificationModal.tsx`** | First login / unverified mobile | 6-digit OTP verification dialog for student phone number confirmation (`POST /v1/auth/mobile/verify-otp`). |
| **`EmailVerificationModal.tsx`** | Profile verification | 6-digit OTP verification dialog for email confirmation (`POST /v1/auth/email/verify-otp`). |
| **`FirstLoginReferralModal.tsx`** | Student first dashboard entry | Prompt asking student to enter a friend's referral code to unlock rewards (`POST /v1/referrals/apply-first-login-code`). |
| **`OfficialAdmissionReceiptModal.tsx`**| Applications tab | Digital receipt viewer displaying institutional fee breakdown, transaction ID, and PDF download button. |
| **`AssignedCounselorChatModal.tsx`** | Dashboard support / top bar | Floating live chat box connecting student directly with their allocated admission counselor (`Socket.io`). |
| **`CareersApplyModal.tsx`** | `/careers/:code` view | Candidate resume and personal details upload form (`POST /v1/hr/careers/apply`). |
| **`PolicyViewerModal.tsx`** | Application checkout | Mandatory terms and privacy policy viewer requiring active student agreement. |
| **`StudyMaterialPurchaseModal.tsx`**| Study Materials view | Checkout modal for premium study guides via Razorpay order flow. |

---

### 4. Admin & ERP Portal Views (`frontend/admin`)

The Admin application routes all views through `frontend/admin/src/app/components/AppLayout.tsx`. Access is guarded by user role and DataScope permissions.

| Module Identifier | Navigation Label | Component File | Key Administrative Actions | Required Role / Guard | Backend Controller | Verified Status |
|---|---|---|---|---|---|---|
| **`dashboard`** | Dashboard | `Dashboard.tsx` | Executive KPIs, monthly leads, application conversion rate, counselor leaderboard. | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR` | `DashboardsController` | **FULLY IMPLEMENTED** |
| **`leads`** | Admission CRM Leads | `LeadsPage.tsx` | Lead management, status updates (New, Contacted, Interested, Converted), counselor assignment. | `ADMIN`, `COUNSELOR`, `SENIOR_COUNSELOR` | `LeadController` | **FULLY IMPLEMENTED** |
| **`tasks`** | CRM Action Tasks | `CrmTasksPage.tsx` | Counselor daily follow-up task list, due dates, reminder scheduling, call logs. | `COUNSELOR`, `SENIOR_COUNSELOR` | `TasksController` | **FULLY IMPLEMENTED** |
| **`counselors`** | Counselor Team | `CounselorsPage.tsx` | Counselor performance directory, active lead load, conversion ratios, capacity toggles. | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR` | `CounselorsController` | **FULLY IMPLEMENTED** |
| **`students`** | Students Directory | `StudentsPage.tsx` | Central student database, profile inspector, academic scores, document status. | `ADMIN`, `COUNSELOR` | `StudentsController` | **FULLY IMPLEMENTED** |
| **`applications`** | Applications Manager | `ApplicationsPage.tsx` | Student application review, status transitions, correction requests, final approval. | `ADMIN`, `COUNSELOR`, `REGISTRAR` | `ApplicationController` | **FULLY IMPLEMENTED** |
| **`colleges`** | Colleges Directory | `CollegesPage.tsx` | College profile editor, campus photos, facility checkmarks, NAAC grade updates. | `ADMIN`, `COLLEGE_MANAGER` | `CollegesController` | **FULLY IMPLEMENTED** |
| **`courses`** | Courses & Programs | `CoursesPage.tsx` | Academic program manager, duration, seat intake, specializations, fee structures. | `ADMIN`, `COLLEGE_MANAGER` | `CoursesController` | **FULLY IMPLEMENTED** |
| **`college-portal`**| Institutional Portal | `CollegePortalPage.tsx` | College-specific administration panel for affiliated institutional representatives. | `COLLEGE_ADMIN`, `COLLEGE_OFFICER` | `CollegesController` | **FULLY IMPLEMENTED** |
| **`college-rankings`**| 9-Pillar Rankings | `CollegeRankingAdminPage.tsx`| Ranking cycle execution, methodology weight configuration, survey ingestion, score override. | `SUPER_ADMIN`, `ADMIN` | `RankingsController` | **FULLY IMPLEMENTED** |
| **`review-moderation`**| Reviews Moderation | `ReviewModerationPage.tsx` | Approval queue for student reviews, spam flag filtering, sentiment rating verification. | `CONTENT_MANAGER`, `ADMIN` | `ReviewsController` | **FULLY IMPLEMENTED** |
| **`documents`** | Documents Queue | `DocumentsPage.tsx` | Verification queue for student 10th/12th marksheet, Aadhaar, mark verified/rejected. | `ADMIN`, `COUNSELOR`, `REGISTRAR` | `DocumentsController` | **FULLY IMPLEMENTED** |
| **`payments`** | Payments & Finance | `PaymentsPage.tsx` | Transaction log, manual fee receipt generation, payment reconciliation, refunds. | `ADMIN`, `ACCOUNTS_MANAGER` | `PaymentsController` | **FULLY IMPLEMENTED** |
| **`fee-catalog`** | Fee Management | `FeeManagementPage.tsx` | Standard fee heads catalog, registration fees, semester fee configuration. | `ADMIN`, `ACCOUNTS_MANAGER` | `FeeCatalogController` | **FULLY IMPLEMENTED** |
| **`coupons`** | Coupons & Discounts | `CouponManagementPage.tsx` | Promo code generator, discount percentage, validity dates, maximum redemptions. | `ADMIN`, `MARKETING_TEAM` | `CouponController` | **FULLY IMPLEMENTED** |
| **`referrals`** | Referral Program | `ReferralManagementPage.tsx`| Student referral tracking, fraud detection, reward payout approvals. | `ADMIN`, `ACCOUNTS_MANAGER` | `ReferralController` | **FULLY IMPLEMENTED** |
| **`reporting-enrollment`**| Enrollment Reports | `ReportingEnrollmentPage.tsx`| Verified seat allotment reports, institutional confirmation lists, export to Excel. | `ADMIN`, `DIRECTOR`, `REGISTRAR` | `ReportingEnrollmentController`| **FULLY IMPLEMENTED** |
| **`employees`** | Employee Management | `EmployeeManagementPage.tsx`| Internal staff directory, active/disabled status, role assignments, password reset triggers. | `SUPER_ADMIN`, `ADMIN`, `HR_MANAGER` | `EmployeesController` | **FULLY IMPLEMENTED** |
| **`hr-recruitment`**| HR & Recruitment | `HrRecruitmentPage.tsx` | Institutional job vacancy posting, applicant tracking, candidate interview scheduling. | `HR_MANAGER`, `ADMIN` | `HrController` | **FULLY IMPLEMENTED** |
| **`staff-onboarding`**| Staff Self-Registration| `StaffOnboardingPage.tsx`| Verification and approval workflow for new employee self-registration requests. | `SUPER_ADMIN`, `ADMIN` | `StaffOnboardingController` | **FULLY IMPLEMENTED** |
| **`organization`** | Organization Settings | `OrganizationPage.tsx` | Corporate structure, branch offices, and regional jurisdictions. | `SUPER_ADMIN` | `OrganizationController` | **FULLY IMPLEMENTED** |
| **`states`** | State Management | `StatesManagementPage.tsx` | State and district master directory, active status, geographic assignment rules. | `SUPER_ADMIN`, `ADMIN` | `GeographyPublicController` | **FULLY IMPLEMENTED** |
| **`rbac`** | Roles & Permissions | `RBACPage.tsx` | Dynamic permissions matrix, custom role creation, DataScope policy assignments. | `SUPER_ADMIN` | `RolesController` | **FULLY IMPLEMENTED** |
| **`banners`** | Page Banners | `BannersPage.tsx` | Hero banner image manager, active dates, external redirect links, positioning. | `CONTENT_MANAGER`, `ADMIN` | `BannersController` | **FULLY IMPLEMENTED** |
| **`blogs`** | Blog & Articles | `BlogsPage.tsx` | Rich-text editorial manager, article authoring, SEO keywords, publishing pipeline. | `CONTENT_MANAGER`, `SEO_MANAGER` | `BlogController` | **FULLY IMPLEMENTED** |
| **`exams`** | Entrance Exams | `ExamsPage.tsx` | Exam details creator, registration dates, syllabus PDF attachments. | `CONTENT_MANAGER`, `ADMIN` | `ExamsController` | **FULLY IMPLEMENTED** |
| **`scholarships`** | Scholarships Admin | `ScholarshipsPage.tsx` | Scholarship directory editor, eligibility terms, deadline updates. | `CONTENT_MANAGER`, `ADMIN` | `ScholarshipsController` | **FULLY IMPLEMENTED** |
| **`materials`** | Study Materials | `StudyMaterialsPage.tsx` | Previous year papers and question bank file uploader, pricing setup. | `CONTENT_MANAGER`, `ADMIN` | `StudyMaterialsController` | **FULLY IMPLEMENTED** |
| **`faqs`** | FAQ Manager | `FAQsPage.tsx` | Category-based question & answer creator for public FAQ section. | `CONTENT_MANAGER`, `ADMIN` | `FaqController` | **FULLY IMPLEMENTED** |
| **`testimonials`** | Testimonials Admin | `TestimonialsPage.tsx` | Student success story manager, star ratings, student photos, approval toggle. | `CONTENT_MANAGER`, `ADMIN` | `TestimonialsController` | **FULLY IMPLEMENTED** |
| **`contact-management`**| Contact Inquiries | `ContactManagementPage.tsx`| Incoming public contact messages, inquiry resolution, phone callback notes. | `ADMIN`, `SUPPORT` | `ContactController` | **FULLY IMPLEMENTED** |
| **`support`** | Help & Support | `SupportTicketsPage.tsx` | Customer support ticket queue, counselor assignment, reply threads, SLA timers. | `SUPPORT`, `ADMIN` | `SupportController` | **FULLY IMPLEMENTED** |
| **`ai`** | AI Counselor Admin | `AiCounselorAdminPage.tsx` | AI prompt template manager, knowledge base grounding, provider token usage telemetry. | `SUPER_ADMIN`, `ADMIN` | `AiCounselorController` | **FULLY IMPLEMENTED** |
| **`notifications`** | Notifications & SMS | `NotificationsPage.tsx` | Broadcast campaign builder, SMS/WhatsApp template creator, outbox queue inspector. | `ADMIN`, `MARKETING_TEAM` | `NotificationsController` | **FULLY IMPLEMENTED** |
| **`marketing`** | Marketing Campaigns | `MarketingPage.tsx` | Tracking link generator, UTM tag manager, landing page campaigns. | `MARKETING_TEAM`, `ADMIN` | `MarketingController` | **PARTIAL (Backend Unmounted)**|
| **`auth-otp`** | Auth & OTP Settings | `AuthOtpSettingsPage.tsx` | SMS provider toggle (Fast2SMS/Twilio), test OTP mode, daily rate limit configuration. | `SUPER_ADMIN` | `OtpAdminController` | **FULLY IMPLEMENTED** |
| **`legal-policies`**| Legal Policies | `LegalPoliciesPage.tsx` | Terms of service and privacy policy version creator, user consent logs. | `SUPER_ADMIN`, `ADMIN` | `LegalController` | **FULLY IMPLEMENTED** |
| **`logs`** | Activity & Audit Logs | `ActivityLogsPage.tsx` | Tamper-evident system audit trail (who modified what record at what timestamp). | `SUPER_ADMIN`, `AUDITOR` | `AuditController` | **FULLY IMPLEMENTED** |
| **`settings`** | General Settings | `SettingsPage.tsx` | System configurations, SMTP transport setup, payment gateway keys, branding. | `SUPER_ADMIN` | `SettingsController` | **FULLY IMPLEMENTED** |
| **`profile`** | Admin Profile | `ProfilePage.tsx` | Authenticated employee profile details, avatar update, password change form. | Any Authenticated Employee | `ProfileController` | **FULLY IMPLEMENTED** |

