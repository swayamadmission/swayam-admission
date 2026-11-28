# SWAYAM ADMISSION — COMPLETE TECHNICAL & FUNCTIONAL AUDIT
## 03. Project Folder and File Structure

This document presents the complete organizational and file architecture of the Swayam Admission repository, detailing folder responsibilities, file distributions, module interdependencies, architectural anomalies, and technical debt hotspots.

---

### 1. Root Repository Architecture

```text
swayam-admission/
├── .github/
│   └── workflows/
│       └── ci.yml                          # GitHub Actions Release & CI Quality Gate
├── .vscode/                                # IDE workspace recommendations
├── backend/                                # NestJS 11 Monolithic Backend REST API
│   ├── prisma/                             # Prisma ORM Schema & Seed Data
│   ├── scripts/                            # Operational & Prestart Scripts
│   ├── src/                                # Application Modules, Controllers, Services
│   ├── storage/                            # Private Encrypted Storage Vault
│   ├── test/                               # Jest E2E Tests
│   ├── uploads/                            # Public & Static File Upload Directory
│   ├── .env.example                        # Backend Environment Variable Template
│   ├── Dockerfile                          # Containerization image definition
│   ├── nest-cli.json                       # NestJS build & scaffolding configuration
│   ├── package.json                        # Backend dependencies and scripts
│   └── tsconfig.json                       # Backend TypeScript compiler configuration
├── frontend/
│   ├── admin/                              # Admin & Institutional ERP Portal (React 18 + Vite 6)
│   │   ├── src/                            # Admin Views, Layouts, Context, API Clients
│   │   ├── .env.example                    # Admin Environment Variable Template
│   │   ├── index.html                      # Admin SPA HTML Entrypoint
│   │   ├── package.json                    # Admin Dependencies
│   │   ├── vercel.json                     # Admin Vercel Deployment & Rewrites
│   │   └── vite.config.ts                  # Admin Vite Bundler Configuration
│   ├── shared/                             # INTENDED Shared Code Directory (CURRENTLY EMPTY)
│   │   ├── components/                     # (Empty Directory)
│   │   ├── constants/                      # (Empty Directory)
│   │   ├── hooks/                          # (Empty Directory)
│   │   ├── types/                          # (Empty Directory)
│   │   └── utils/                          # (Empty Directory)
│   └── user/                               # Public Website & Student Portal (React 18 + Vite 6)
│       ├── src/                            # Student Views, Routes, Context, API Clients
│       ├── .env.example                    # User Environment Variable Template
│       ├── index.html                      # User SPA HTML Entrypoint
│       ├── package.json                    # User Dependencies
│       ├── vercel.json                     # User Vercel Deployment & Rewrites
│       └── vite.config.ts                  # User Vite Bundler Configuration
├── docs/                                   # Audit Documentation & Phase Reports
│   └── complete-website-audit/             # 17 Comprehensive Technical Audit Reports
├── docker-compose.yml                      # Local Multi-Container Composition
├── nginx.conf                              # Reverse Proxy Production Gateway
├── render.yaml                             # Render Cloud Web Service Configuration
├── test_state_management_smoke.js          # Standalone 20-Step Smoke Test Script
└── README.md                               # Project Repository Readme
```

---

### 2. Backend Module Architecture (`backend/src`)

The backend is organized into 58 active functional directories and 6 auxiliary directories. Below is the structural responsibility of every major module:

```text
backend/src/
├── admission-workflow/     # (Unmounted) Legacy Admission State Machine Controller & Service
├── ai/                     # Google Gemini & OpenAI API Provider Service, RAG Engine, Settings
├── ai-analytics/           # (Unmounted) Sentiment & Conversation Metrics Controller
├── ai-chat/                # (Unmounted) WebSocket Chat Bot Engine
├── ai-counselor/           # Production AI Counselor Knowledge Base, Prompts, Recommendations
├── ai-memory/              # Long-term AI Conversation Memory Manager
├── ai-prompts/             # AI Prompt Versioning & Templating Engine
├── ai-recommendation/      # (Unmounted) Algorithmic College Recommendation Engine
├── analytics/              # Executive Dashboard Telemetry, Event Tracking, Aggregations
├── application/            # PRIMARY APPLICATION LIFECYCLE: 133KB Service, Workflow Form, Statuses
├── applications/           # (ORPHAN/DEAD) 5 Empty 0-byte zombie files from earlier refactor
├── audit/                  # Enterprise Immutable Audit Logging & Tamper-Evident Records
├── auth/                   # Identity, Passport JWT, Refresh Token Rotation, DataScope, RBAC Guards
├── banners/                # Homepage & Sectional Promotional Banner Management
├── blog/                   # Public Blog Engine, Categories, Slugs, Publication Pipeline
├── career/                 # (Unmounted) Legacy Career Guide Controller (superseded by hr/careers)
├── chat/                   # Counselor-to-Student Direct Messaging & Real-Time Rooms
├── college-counseling/     # Institutional Counseling Sessions & Slot Bookings
├── colleges/               # College Profiles, Campus Facilities, Cutoffs, Bulk Excel Uploads
├── common/                 # Global Health Controller, Decorators, Shared Filters, Pipes
├── contact/                # Public Inquiries, Directory Listings, Grievance Redressal
├── counselors/             # Counselor Profiles, Performance Metrics, Lead Allocations
├── coupons/                # Discount Vouchers, Promotional Codes, Cart Validation Engine
├── courses/                # Academic Course Catalog, Specializations, Eligibility, Fees
├── crm-activity/           # Lead Interactions, Call Logs, Follow-up Reminders, Activity Streams
├── dashboards/             # Role-Specific Dashboards (Admin, Counselor, Senior Counselor, Student)
├── documents/              # File Vault, Secure Download Gate, PDF Watermarking, Retention Policies
├── education-finance/      # Education Loans, Banking Partners, EMI Calculations
├── employees/              # Employee Profiles, Status Toggles, Password Reset Administration
├── events/                 # LiveSync WebSocket Gateway (Socket.io) for Cross-Tab Updates
├── exam/                   # (Unmounted) Duplicate Exam Controller (superseded by exams/)
├── exams/                  # Entrance Exam Catalog, Registration Dates, Admit Cards, Results
├── faq/                    # Frequently Asked Questions Categories and Search
├── fees/                   # Institutional Fee Catalog, Fee Heads, Student Invoices
├── health/                 # Consolidated Liveness, Readiness, Database & Outbox Health Checks
├── hr/                     # Job Postings, Candidate Pipeline, Offer Letters, Public Careers Portal
├── jobs/                   # (Unmounted) BullMQ Queue Worker Definitions
├── journey/                # Student Roadmap Milestones, Progress Tracking, Timeline Updates
├── knowledge-base/         # (Unmounted) Static Knowledge Articles & Institutional FAQs
├── lead/                   # CRM Lead Capture, Webhooks, Qualification Stages, Ingestion
├── legal/                  # Mandatory Consent Policies, Terms, Privacy, Version History
├── marketing/              # (Unmounted) Promotional Campaign Audiences & Tracking Links
├── modules/                # (ORPHAN/DEAD) Unmounted sub-modules: cms, homepage, media, navigation, pages, seo
├── notifications/          # Notification Engine, Templates, Campaigns, Durable Outbox Worker
├── organization/           # Geographic Hierarchy (States, Districts, Cities), Institutional Branches
├── payments/               # Razorpay Gateway Integration, Webhooks, Verification, Ledgers
├── positions/              # Hierarchical Org Chart, Job Titles, Geographic Allocations
├── prisma/                 # Prisma Service singleton and client lifecycle
├── profile/                # Authenticated User Profile Management & Password Updates
├── recommendation/         # (Unmounted) Algorithmic Shortlist Generator
├── referrals/              # Student Referral System, Reward Ledgers, First-Login Codes
├── reporting-enrollment/   # Institutional Admission Reporting, Seat Confirmation Slips
├── reviews-ranking/        # 9-PILLAR RANKING ENGINE (52KB), Cycles, Methodology, Moderation
├── roles/                  # Role Hierarchies, Dynamic Permissions, Access Scope Rules
├── scholarship/            # (Unmounted) Duplicate Scholarship Controller (superseded by scholarships/)
├── scholarships/           # Financial Aid, Government & Institutional Scholarship Directory
├── scripts/                # Database and File Seeding Helper Scripts
├── search/                 # Unified Global Elasticsearch-Style Keyword Search Across Entities
├── settings/               # System Configurations, SMTP Transport, Third-Party Integrations
├── staff-onboarding/       # Employee Self-Registration Requests, Verification Queue, Approval
├── storage/                # Local Filesystem Storage Service
├── students/               # Student Directory, Academic Records, Saved Shortlists
├── study-materials/        # Downloadable Previous Year Papers, Syllabus PDFs, Purchase Flow
├── support/                # Helpdesk Ticketing System, Ticket Responses, SLA Tracking
├── tasks/                  # Counselor CRM Action Items, Deadlines, Status Updates
├── testimonials/           # Student Video/Text Testimonials & Approval Moderation
└── users/                  # Central User Identity, Device Sessions, Role Assignments
```

---

### 3. Frontend Application Architectures

#### A. Admin & ERP Portal (`frontend/admin/src`)

The Admin application uses a **state-driven single-view router pattern** controlled by `AppLayout.tsx`.

```text
frontend/admin/src/
├── api/                    # 39 Strongly-Typed Axios API Client Modules
│   ├── axios.ts            # Base Axios Client with Request Queue & Token Refresh
│   ├── applications.api.ts # Application Lifecycle API Client
│   ├── colleges.api.ts     # College Management API Client
│   ├── employees.api.ts    # Employee Management API Client
│   ├── leads.api.ts        # Admission CRM Leads API Client
│   ├── rankings.api.ts     # 9-Pillar Ranking Management API Client
│   └── ...
├── app/
│   ├── components/         # 39 Main Views & Over 80 Reusable Modal/Table Components
│   │   ├── AppLayout.tsx   # Master Layout with Switch-Case Page Renderer (39 Views)
│   │   ├── Sidebar.tsx     # Role-Aware Navigation Sidebar
│   │   ├── Header.tsx      # Top Bar with Profile Menu, Notifications, Live Sync
│   │   ├── Dashboard.tsx   # Super Admin Analytics & KPI Summary
│   │   ├── ApplicationsPage.tsx
│   │   ├── CollegesPage.tsx
│   │   ├── EmployeeManagementPage.tsx
│   │   ├── LeadsPage.tsx
│   │   └── ...
│   └── App.tsx             # Root Application Wrapper with React Query & AuthProvider
├── context/
│   └── AuthContext.tsx     # Admin Authentication Context (JWT, User Role, Session Watcher)
└── styles/                 # Tailwind CSS 4 Theming & Typography
```

#### B. Public Student Portal (`frontend/user/src`)

The Student application uses **React Router 7 (`createBrowserRouter`)** for declarative, URL-based navigation with deep-linking support.

```text
frontend/user/src/
├── api/                    # 28 Strongly-Typed Axios API Client Modules
│   ├── axios.ts            # User Axios Client with 401 Interceptors & Token Storage
│   ├── applications.api.ts
│   ├── colleges.api.ts
│   ├── profile.api.ts
│   └── ...
├── app/
│   ├── components/         # Page Components, Dialogs, and Modals
│   │   ├── Root.tsx        # Shell Layout containing Navbar, Public Banner, Footer
│   │   ├── HomePage.tsx    # Landing Page with Hero, Search, Featured Colleges
│   │   ├── CollegesPage.tsx# Filterable College Directory (State, Stream, Rating)
│   │   ├── CollegeDetailPage.tsx # Comprehensive College Profile (Pillars, Cutoffs, Fees)
│   │   ├── ApplyNowPage.tsx# Standalone Admission Application Portal
│   │   ├── StudentDashboard.tsx # 14-Tab Protected Student Portal
│   │   ├── AuthModal.tsx   # Unified Login / Signup / OTP Modal
│   │   └── ...
│   ├── App.tsx             # Root RouterProvider & ErrorBoundary Shell
│   └── routes.tsx          # React Router 7 Route Tree (28 Route Definitions)
├── context/
│   ├── AuthContext.tsx     # Student Auth Context (User, Live Sync Hook)
│   └── PublicSettingsContext.tsx # Dynamic Public CMS Branding & Contact Settings
└── styles/                 # Fonts, Theme Variables, and Tailwind CSS 4
```

---

### 4. Codebase Anomalies and Architectural Hotspots

#### A. Giant Source Files (Maintenance Risk)
Several critical service files have grown exceptionally large, concentrating complex business logic into single files:
1. `backend/prisma/schema.prisma`: **250,670 bytes (6,162 lines)**. Represents an enormous monolithic schema combining 218 models across all operational domains.
2. `backend/src/application/application.service.ts`: **133,050 bytes (3,842 lines)**. Handles every stage of the student application lifecycle, validation, declaration checks, fee computations, timeline logging, and document attachment.
3. `backend/src/reviews-ranking/ranking-engine.service.ts`: **52,544 bytes (1,410 lines)**. Contains the full multi-parameter scoring mathematical engine for all 9 ranking pillars, Bayesian smoothing, and outlier package capping.
4. `backend/src/notifications/durable-outbox.service.ts`: **34,210 bytes (980 lines)**. Handles PostgreSQL job queue polling, outbox locks, concurrency control, quota cooldowns, and channel failover.

#### B. The Empty Shared Folder (`frontend/shared`)
The root `frontend/shared/` directory was architected to house shared UI components, TypeScript types, and utility functions for both frontends. However, inspection confirms:
- `components/`: 0 files
- `constants/`: 0 files
- `hooks/`: 0 files
- `types/`: 0 files
- `utils/`: 0 files
**Total Files: 0.** As a result, both frontends maintain independent copies of DTO interfaces, date formatting utilities, and Axios error interceptors.

#### C. Zombie 0-Byte Module (`backend/src/applications/`)
The plural directory `backend/src/applications/` contains:
- `applications.controller.ts` (0 bytes)
- `applications.module.ts` (0 bytes)
- `applications.service.ts` (0 bytes)
- `dto/create-application.dto.ts` (0 bytes)
- `dto/update-status.dto.ts` (0 bytes)
These are orphaned scaffolding files created before the application module was rewritten as singular `backend/src/application/`. They should be removed.

#### D. Unmounted / Duplicate Modules
The following 22 modules exist on disk in `backend/src` but are **not imported in `app.module.ts`**:
1. `AdmissionWorkflowModule`
2. `AiAnalyticsModule`
3. `AiChatModule`
4. `AiMemoryModule`
5. `AiPromptsModule`
6. `AiRecommendationModule`
7. `CareerModule` (duplicate of `hr/careers`)
8. `ExamModule` (duplicate of `exams/exams`)
9. `JobsModule` (incomplete BullMQ setup)
10. `KnowledgeBaseModule`
11. `MarketingModule`
12. `CmsModule` (`modules/cms`)
13. `HomepageModule` (`modules/homepage`)
14. `MediaModule` (`modules/media`)
15. `NavigationModule` (`modules/navigation`)
16. `PagesModule` (`modules/pages`)
17. `SeoModule` (`modules/seo`)
18. `RecommendationModule`
19. `ScholarshipModule` (duplicate of `scholarships/scholarships`)
20. `StorageModule`
21. `applications.module` (0-byte zombie)
22. `AppModule` (self-reference)

#### E. Nested Git Repository (`backend/.git`)
A `.git` directory exists inside `backend/` in addition to the root repository `.git`. Both point to the same remote origin URL. The root repository tracks all files inside `backend/`, rendering the nested `.git` directory an artifact of an earlier sub-repository setup.

