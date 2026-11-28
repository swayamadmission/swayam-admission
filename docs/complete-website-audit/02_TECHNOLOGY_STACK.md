# SWAYAM ADMISSION — COMPLETE TECHNICAL & FUNCTIONAL AUDIT
## 02. Technology Stack Audit

This document provides a comprehensive inventory of every programming language, runtime, framework, library, tool, database engine, and infrastructure service discovered in the Swayam Admission codebase.

---

### 1. Programming Languages

| Language | Primary Locations & Modules | File Count | Purpose & Scope |
|---|---|---|---|
| **TypeScript (`.ts`, `.tsx`)** | `backend/src`, `frontend/admin/src`, `frontend/user/src` | **918 files** (672 `.ts`, 246 `.tsx`) | Core language for the entire platform. Powers NestJS controllers, services, DTOs, guards, React components, hooks, contexts, and API clients. |
| **JavaScript (`.js`, `.mjs`)** | Root scripts, `backend/scripts`, `backend/organize-files.js`, `postcss.config.mjs` | **53 files** (50 `.js`, 3 `.mjs`) | Build scripts, directory preparation (`setup-dirs.js`), prestart hooks (`scripts/prestart.js`), smoke tests, and PostCSS configuration. |
| **JSON (`.json`)** | `package.json`, `tsconfig.json`, `vercel.json`, `nest-cli.json` | **12 files** | Package definitions, TypeScript compiler options, Vercel rewrites, Jest configurations. |
| **Prisma Schema (`.prisma`)** | `backend/prisma/schema.prisma` | **1 file** (6,162 lines) | Declarative data modeling, relations, indexes, enums, and database generators for PostgreSQL. |
| **CSS (`.css`)** | `frontend/admin/src/styles`, `frontend/user/src/styles` | **13 files** | Tailwind CSS root definitions, typography stylesheets, custom theme variables, animations. |
| **HTML (`.html`)** | `frontend/admin/index.html`, `frontend/user/index.html` | **2 files** | Single Page Application entrypoints, viewport configurations, font preloading. |
| **YAML (`.yml`, `.yaml`)** | `.github/workflows/ci.yml`, `render.yaml`, `docker-compose.yml`, `pnpm-workspace.yaml` | **5 files** | CI/CD automation pipelines, Render cloud deployment, local Docker service orchestration. |
| **Batch / Shell (`.bat`)** | `backend/create-dirs.bat` | **1 file** | Windows shell helper for recursive folder scaffolding. |
| **Python (`.py`)** | `backend/delete_counselors.ts` (scratch utility) | **1 file** | Auxiliary data maintenance script. |
| **Markdown (`.md`)** | Root audit reports, guidelines, documentation | **44 files** | Phase documentation, engineering guidelines, release runbooks. |
| **Binary Assets** | `backend/uploads/` (PDFs, PNGs, JPGs) | **66 files** | Sample document verification files, student test uploads, institutional logos. |

---

### 2. Frontend Technology Stack (Admin & User Portals)

Both frontend applications are standalone Single Page Applications (SPAs) built with modern React 18, Vite 6, and Tailwind CSS 4.

| Technology / Library | Version (Admin) | Version (User) | Architectural Purpose & Module Dependency |
|---|---|---|---|
| **React** | `18.3.1` | `18.3.1` | Declarative component UI engine. Powers all user interfaces. |
| **React DOM** | `18.3.1` | `18.3.1` | DOM renderer for React components. |
| **Vite** | `6.3.5` | `6.3.5` | Next-generation frontend bundler and development server. |
| **Vite React Plugin** | `@vitejs/plugin-react@4.7.0` | `@vitejs/plugin-react@4.7.0` | Fast Refresh and JSX transformation support. |
| **TypeScript** | `^6.0.3` (types) | `^6.0.3` (types) | Static type safety and autocomplete. |
| **Tailwind CSS** | `4.1.12` | `4.1.12` | Utility-first styling framework with CSS variables for dynamic theming. |
| **Tailwind Vite Plugin** | `@tailwindcss/vite@4.1.12` | `@tailwindcss/vite@4.1.12` | Just-In-Time Vite integration for Tailwind v4 engine. |
| **Radix UI Primitives** | Various (`1.1.2` - `2.2.6`) | Various (`1.1.2` - `2.2.6`) | Unstyled, accessible UI components: Dialog, DropdownMenu, Tabs, Accordion, Popover, Select, Tooltip, RadioGroup. |
| **MUI Icons & Material** | `@mui/icons-material@7.3.5` | `@mui/icons-material@7.3.5` | Auxiliary icon sets and theme utilities. |
| **Lucide React** | `0.487.0` | `0.487.0` | Primary lightweight SVG icon system used across all navigation, cards, and tables. |
| **React Router** | `7.13.0` | `7.13.0` | Declarative URL routing engine (actively used in `frontend/user`; installed in `frontend/admin`). |
| **TanStack React Query** | `^5.101.2` | `^5.101.2` | Asynchronous server state management, caching, background refetching, and query invalidation. |
| **React Query Devtools** | `^5.101.2` | `^5.101.2` | Real-time cache inspection and network debugging panel. |
| **Axios** | `^1.17.0` | `^1.17.0` | Promise-based HTTP client with request/response interceptors for JWT injection and refresh token rotation. |
| **Socket.io Client** | `^4.8.3` | `^4.8.3` | Bidirectional WebSocket communication for live counselor chat and live sync events. |
| **Recharts** | `2.15.2` | `2.15.2` | SVG charting library used in Admin Dashboards, Analytics, and Ranking comparisons. |
| **Sonner** | `2.0.3` | `2.0.3` | Modern, responsive toast notifications for success/error feedback. |
| **Motion (Framer Motion)**| `12.23.24` | `12.23.24` | Animation library for modal transitions, page reveals, and interactive elements. |
| **React Hook Form** | `7.55.0` | `7.55.0` | High-performance form state management and input validation. |
| **Embla Carousel React**| `8.6.0` | `8.6.0` | Lightweight slider used for college banners and promotional campaigns. |
| **Date-fns** | `3.6.0` | `3.6.0` | Modular date formatting, relative timestamps, and date arithmetic. |
| **Canvas Confetti** | `1.9.4` | `1.9.4` | Interactive celebratory particles for successful admission submissions. |
| **Class Variance Authority** | `0.7.1` | `0.7.1` | Variant styling abstraction for Shadcn-style reusable button and badge components. |
| **Clsx & Tailwind Merge**| `2.1.1` & `3.2.0` | `2.1.1` & `3.2.0` | Conditional class composition and Tailwind conflict resolution. |

---

### 3. Backend Technology Stack (`backend`)

The backend is an enterprise-scale monolithic REST API built on NestJS 11 and Express 5.

| Technology / Package | Exact Version | Architectural Purpose & Module Dependency |
|---|---|---|
| **NestJS Common & Core** | `^11.0.1` | Enterprise modular dependency injection framework, decorators, middleware, pipes, filters. |
| **Express** | `^5.3.0` | Underlying HTTP server engine handling routes, static file serving, and middleware. |
| **Node.js Runtime** | `v24.16.0` (Dev) / `v20.x` (CI/Prod) | High-performance JavaScript/TypeScript runtime. |
| **TypeScript** | `^5.7.3` | Strong typing, decorators, reflection metadata, and interface declarations. |
| **Prisma Client & CLI** | `^6.9.0` | Type-safe Object-Relational Mapping (ORM) and schema code generation. |
| **Passport & Passport JWT**| `^0.7.0` & `^4.0.1` | Authentication strategy for verifying Bearer JWTs in incoming Authorization headers. |
| **Passport Local** | `^1.0.0` | Strategy for username/password login validation. |
| **@nestjs/jwt & jsonwebtoken**| `^11.0.2` & `^9.0.3`| JWT payload signing, encryption, verification, and expiration enforcement. |
| **Bcrypt** | `^6.0.0` | Adaptive cryptographic hashing (salt rounds: 10-12) for employee and student passwords. |
| **Nodemailer** | `^8.0.11` | SMTP transport client for transactional emails (activation, password reset, notifications). |
| **OTP Generator** | `^4.0.1` | Cryptographically pseudorandom 6-digit numeric OTP generation for mobile/email verification. |
| **Google Auth Library** | `^11.3.0` | Token verification for Google OAuth ("Sign in with Google") authentication flows. |
| **PDF-Lib** | `^1.17.1` | Server-side programmatic PDF manipulation, dynamic watermark stamping, and audit stamping. |
| **Sharp** | `^0.35.5` | High-speed C++ libvips image processing for generating thumbnails and watermarking images. |
| **Multer & @types/multer**| `^2.1.1` | Multipart form-data handling for document, avatar, and resume uploads. |
| **Socket.io & @nestjs/websockets**| `^4.8.3` & `^11.1.28` | Real-time WebSocket server engine for counselor chat and state sync. |
| **Class Validator & Transformer**| `^0.15.1` & `^0.5.1`| Declarative DTO validation (`@IsString()`, `@IsEmail()`, etc.) and payload sanitization. |
| **NestJS Throttler** | `^6.5.0` | Global rate-limiting guard (configured to 120 requests/minute per IP). |
| **Helmet** | `^8.2.0` | HTTP security headers utility (installed; custom headers used in `main.ts`). |
| **Compression** | `^1.8.1` | Gzip response compression middleware (installed). |
| **Pino & nestjs-pino** | `^11.0.0` & `^4.6.1`| Structured JSON logger with high throughput and low overhead. |
| **EJS** | `^7.0.1` | Templating engine for rendering dynamic HTML transactional email bodies. |
| **XLSX (SheetJS)** | `^0.18.5` | Excel parser for bulk institutional data ingestion (`colleges-bulk.service.ts`). |
| **BullMQ & IORedis** | `^5.79.2` & `^5.11.1`| Distributed Redis queue engine (configured for future background job offloading). |
| **Jest & Supertest** | `^30.0.0` & `^7.0.0`| Unit testing framework and end-to-end HTTP integration test runner. |

---

### 4. Database Technology

| Attribute | Specification | Verification Evidence |
|---|---|---|
| **Database Engine** | **PostgreSQL (v15/v16 compatibility)** | Managed serverless PostgreSQL on **Neon**. |
| **ORM Framework** | **Prisma ORM 6.9.0** | `backend/prisma/schema.prisma` |
| **Connection Pooling** | Neon Connection Pooler (PgBouncer) | Configured in `DATABASE_URL` with SSL mode enabled. |
| **Total Models** | **218 Models** | Discovered and verified in `schema.prisma`. |
| **Total Enums** | **38 Enums** | Defined in `schema.prisma`. |
| **Total Indexes** | **463 `@@index` blocks** | Compound and single-column indexes covering foreign keys and status queries. |
| **Unique Constraints** | **16 `@@unique` blocks** + inline `@unique` | Strict uniqueness on email, mobile, application numbers, slugs, and tokens. |
| **JSON Fields** | **95 `Json` columns across 63 models** | Used for dynamic subcriteria, policy consents, audit metadata, and ranking scores. |
| **Transactions** | Prisma Interactive Transactions (`$transaction`) | Atomically binds application workflows, payment recordings, and outbox enqueueing. |
| **Migration Architecture** | Direct schema push (`prisma db push`) | Note: No `migrations/` folder is committed in the repository. |

---

### 5. Hosting and Infrastructure Topology

| Component | Provider / Platform | Production URL / Endpoint | Configuration Evidence |
|---|---|---|---|
| **Admin ERP Portal** | **Vercel** | `https://swayam-admission-eg2x.vercel.app` | `frontend/admin/vercel.json` |
| **Student Public Website** | **Vercel** | `https://swayam-admission.vercel.app` | `frontend/user/vercel.json` |
| **Backend REST API** | **Render (Web Service)** | `https://swayam-admission.onrender.com/v1` | `render.yaml` |
| **Health Probes** | Render Health Check | `https://swayam-admission.onrender.com/v1/health` | `render.yaml` (healthCheckPath) |
| **Database Tier** | **Neon PostgreSQL** | Serverless Cloud PostgreSQL | Referenced in `health.controller.ts` & environment configs |
| **File Storage Vault** | **Render Persistent Disk / Local FS** | Mount path: `/uploads/` and `/storage/private_vault/` | `render.yaml` & `main.ts` |
| **CI / CD Pipeline** | **GitHub Actions** | `.github/workflows/ci.yml` | 5-step build, lint, and test quality gate |
| **DNS & Routing** | Vercel Edge Network | Custom routing with SPA catch-all rewrites | `vercel.json` rewrites rules |

