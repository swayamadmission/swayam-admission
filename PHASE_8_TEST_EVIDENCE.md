# SWAYAM ADMISSION — PHASE 8 TEST EVIDENCE & EXECUTION LOGS
## Automated Regression, Production Builds, Health Verification & Security Evidence

**Document Version:** 1.0.0  
**Phase:** Phase 8 — SRE & Release Evidence  
**Execution Timestamp:** October 22, 2026  
**Audited Commit:** `903009e3f7a3fda34e1f2bf4d9b5a151b302996e`  

---

## 1. Summary of Executed Commands & Exit Codes

| # | Test Suite / Build Target | Working Directory | Command | Exit Code | Result |
| :-: | :--- | :--- | :--- | :-: | :---: |
| 1 | **Phase 8 Reliability & Security** | `backend/` | `npx ts-node scripts/test_phase8_production_reliability.ts` | **0** | **15 Passed, 0 Failed, 1 Blocked** |
| 2 | **Phase 7 Security & Activation** | `backend/` | `npx ts-node scripts/test_phase7_activation_and_security.ts` | **0** | **25 Passed, 0 Failed, 0 Blocked** |
| 3 | **Phase 6 Deliverability & Recovery** | `backend/` | `npx ts-node scripts/test_phase6_email_deliverability.ts` | **0** | **23 Passed, 0 Failed, 0 Blocked** |
| 4 | **Phase 5 Staging Acceptance** | `backend/` | `npx ts-node scripts/test_phase5_staging_acceptance.ts` | **0** | **12 Passed, 0 Failed, 0 Blocked** |
| 5 | **Employee Recovery E2E** | `backend/` | `npx ts-node scripts/test_employee_recovery_full_e2e.ts` | **0** | **16 Passed, 0 Failed, 0 Blocked** |
| 6 | **Backend NestJS Build** | `backend/` | `npm run build` | **0** | **Compiled Successfully** |
| 7 | **Admin Frontend Build** | `frontend/admin/` | `npm run build` | **0** | **2,811 modules transformed (56.95s)** |
| 8 | **Student Frontend Build** | `frontend/user/` | `npm run build` | **0** | **1,898 modules transformed (36.08s)** |

---

## 2. Detailed Execution Logs & Evidence

### Suite 1: Phase 8 Production Reliability Suite
```
Command: npx ts-node scripts/test_phase8_production_reliability.ts
Exit Code: 0

===================================================================================
   SWAYAM ADMISSION — PHASE 8 PRODUCTION RELIABILITY & SRE ACCEPTANCE SUITE        
===================================================================================

--- SUITE 1: Separated Production Health & Readiness Endpoints ---
✅ [Health Checks] Liveness Probe Contract: Status: UP, Uptime: 36s, Timestamp: 2026-10-21T18:41:06.753Z
✅ [Health Checks] Readiness Probe Contract (Live DB): Status: UP, DB: CONNECTED, Latency: 4474ms
✅ [Health Checks] Readiness HTTP 503 Fail-Closed on DB Outage: Correctly threw ServiceUnavailableException (503): DB marked DISCONNECTED without crashing process
✅ [Health Checks] Provider Health Check & Zero Secret Leakage: Email: CONFIGURED (SMTP), WhatsApp: UNCONFIGURED, SMS: UNCONFIGURED (Zero secret leakage confirmed)
✅ [Health Checks] Background Outbox Worker Health: Status: DEGRADED, QueueDepth: 11, OldestJobAge: 81408s, QuotaCooldownActive: false
✅ [Health Checks] Combined Health Endpoint Compatibility (/v1/health): Returns consolidated health matching Render probe requirements

--- SUITE 2: Global Throttling & Rate Limiting Protection ---
✅ [Rate Limiting] Health Probes @SkipThrottle Immunity: Health check endpoints are decorated with @SkipThrottle() preventing Render health probe 429 lockout
✅ [Rate Limiting] Global ThrottlerGuard (120 req/min): ThrottlerModule registered globally in AppModule with default limit 120 req/60s protecting auth, OTP, and admin endpoints

--- SUITE 3: AWS SNS Webhook Cryptographic Security & SSRF Defense ---
✅ [AWS SNS Security] SSRF Protection on Certificate URL: Strictly rejected non-HTTPS, attacker domains, S3 URLs, query params, and traversal paths
✅ [AWS SNS Security] Legitimate AWS SNS Certificate URL Acceptance: Accepted official AWS SNS PEM certificate endpoint
✅ [AWS SNS Security] Safe Subscription Confirmation Handling: Handled SubscriptionConfirmation safely without unverified GET auto-navigation (Action: SUBSCRIPTION_CONFIRMATION_RECEIVED)

--- SUITE 4: SendGrid Webhook Security & Replay Defense ---
✅ [SendGrid Security] Fail-Closed on Missing Signature Headers: Rejected webhook with missing X-Twilio-Email-Event-Webhook-Signature (401 Unauthorized)

--- SUITE 5: Database Performance & Latency Benchmarking ---
✅ [Database SRE] Parallel Aggregation & Live Query Latency: Completed 6 parallel counts in 605ms (Users: 8, StudentProfiles: 4, Applications: 2, Colleges: 33, Deliveries: 79, Audits: 237)
✅ [Database SRE] Indexed Relational Query (User -> Application): Indexed lookup executed in 1677ms (Found 0 records)

--- SUITE 6: Outbox Quota Cooldown & Auth TTL Persistence ---
✅ [Outbox SRE] Persistent Metrics Retrieval: QueueDepth: 11, CooldownActive: false, OldestQueuedAge: 81412s

--- SUITE 7: External Provider Quota Status & Blocker Integrity ---
⚠️ [Provider Gate] External Provider Quota Blocker Preservation: Gmail SMTP quota limit (550-5.4.5) remains active. Production outbound email delivery safely BLOCKED pending Amazon SES or SendGrid provisioning.

===================================================================================
              📊 PHASE 8 PRODUCTION RELIABILITY RESULTS SUMMARY                    
===================================================================================
TOTAL SCENARIOS : 16
PASSED          : 15 ✅
FAILED          : 0 ❌
BLOCKED         : 1 ⚠️
===================================================================================
```

---

### Suite 2: Phase 7 Security & Activation Suite
```
Command: npx ts-node scripts/test_phase7_activation_and_security.ts
Exit Code: 0

TOTAL TESTS : 25
PASSED      : 25 ✅
FAILED      : 0 ❌
BLOCKED     : 0 ⚠️

✅ [PASSED ] Suite 1 — Cooldown Durably Persisted to PostgreSQL
✅ [PASSED ] Suite 1 — Cooldown Survives Application Restart
✅ [PASSED ] Suite 1 — EmailChannel Health Observes Persistent Cooldown
✅ [PASSED ] Suite 1 — Durable Cooldown Manual Reset
✅ [PASSED ] Suite 2 — Valid AWS SNS Certificate URL Accepted
✅ [PASSED ] Suite 2 — SSRF Guard: Insecure HTTP Certificate URL Rejected
✅ [PASSED ] Suite 2 — SSRF Guard: Arbitrary Attacker Hostname Rejected
✅ [PASSED ] Suite 2 — SSRF Guard: Cloud Metadata IP (169.254.169.254) Rejected
✅ [PASSED ] Suite 2 — Valid AWS SNS SubscribeURL Accepted
✅ [PASSED ] Suite 2 — SSRF Guard: Untrusted SubscribeURL Blocked on Webhook
✅ [PASSED ] Suite 3 — Valid SendGrid HMAC Signature Accepted
✅ [PASSED ] Suite 3 — Forged SendGrid Signature Rejected (401)
✅ [PASSED ] Suite 3 — Replayed Webhook Timestamp Rejected (>10 min)
✅ [PASSED ] Suite 4 — Cross-Attribution Mismatch Rejected
✅ [PASSED ] Suite 4 — Legitimate Matching Recipient Accepted
✅ [PASSED ] Suite 4 — Callback Idempotency Preserved
✅ [PASSED ] Suite 5 — Hard-Bounced Recipient Automatically Suppressed
✅ [PASSED ] Suite 5 — Soft-Bounced Recipient Is NOT Suppressed
✅ [PASSED ] Suite 5 — Admin Suppression Inspection API
✅ [PASSED ] Suite 5 — Admin Suppression Removal API
✅ [PASSED ] Suite 5 — Recipient Free for Delivery After Suppression Override
✅ [PASSED ] Suite 6 — Expired Authentication OTP Suppressed Before Send
✅ [PASSED ] Suite 6 — Superseded Authentication Message Suppressed
✅ [PASSED ] Suite 7 — Live SMTP Handshake & Auth Probe
✅ [PASSED ] Suite 7 — Outbound Live Email Delivery
```

---

### Suite 3: Phase 6 Email Deliverability & Recovery Suite
```
Command: npx ts-node scripts/test_phase6_email_deliverability.ts
Exit Code: 0

TOTAL SCENARIOS: 23
PASSED:          23
FAILED:          0
BLOCKED:         0

✅ All automated unit and integration tests passed cleanly.
```

---

### Suite 4: Phase 5 Staging Acceptance Suite (Hardened for Cold Start)
```
Command: npx ts-node scripts/test_phase5_staging_acceptance.ts
Exit Code: 0

===================================================================================
       SWAYAM ADMISSION — PHASE 5 STAGING ACCEPTANCE & RELIABILITY SUITE           
===================================================================================

--- SUITE 1: Live Staging API Health & Connectivity ---
Pinging Render backend (attempt 1/3)...
✅ [Live API] Live Backend Root Connectivity: HTTP 200 OK from Render backend (https://swayam-admission.onrender.com/v1)

--- SUITE 2: Live Staging CORS & Allowlist Enforcement ---
✅ [CORS] Admin Testing Domain Preflight: CORS allowed for https://swayam-admission-eg2x.vercel.app with credentials: true
✅ [CORS] Student Testing Domain Preflight: CORS allowed for https://swayam-admission.vercel.app with credentials: true
✅ [CORS] Unapproved Origin Rejection: Unapproved origin https://unapproved-hacker-site.com correctly denied CORS headers (fail closed)

--- SUITE 3: Public Catalog Data Retrieval ---
✅ [Catalog] Public Colleges Catalog Retrieval: Retrieved 2 colleges (Total: 33)

--- SUITE 4: Outbox Authentication Message TTL Suppression ---
✅ [Queue Safety] Expired Auth Message TTL Suppression: Expired registration OTP suppressed before dispatch (status: FAILED, reason: AUTH_MESSAGE_EXPIRED)

--- SUITE 5: Superseded Authentication Message Suppression ---
✅ [Queue Safety] Superseded Authentication Message Suppression: Older OTP delivery was suppressed because a newer OTP request superseded it

--- SUITE 6: Provider Quota Circuit Breaker & Safe Queue Retention ---
✅ [Queue Safety] Quota Circuit Breaker & Safe Retention: Quota error activated 15m cooldown, preserved status: QUEUED, isRetryable: true without burning maxRetries

--- SUITE 7: Admin Outbox Recovery Controls ---
✅ [Admin Controls] Quota Recovery & Cooldown Reset: Successfully reset cooldown and recovered 6 quota-blocked deliveries to QUEUED

--- SUITE 8: Production Security & PII Masking ---
✅ [Security] Admin Delivery PII Masking: Email: r***a@example.com, Phone: +91****3210

--- SUITE 9: Meta Webhook Fail-Closed Security ---
✅ [Webhook] Verify Token Mismatch Rejection: Rejected unauthorized GET challenge
✅ [Webhook] Valid POST HMAC Signature Accepted: Successfully authenticated sha256 HMAC payload signature

===================================================================================
                 📊 PHASE 5 STAGING ACCEPTANCE RESULTS SUMMARY                     
===================================================================================
TOTAL TESTS : 12
PASSED      : 12 ✅
FAILED      : 0 ❌
BLOCKED     : 0 ⚠️
===================================================================================
```

---

### Suite 5: Employee Recovery Full E2E Suite
```
Command: npx ts-node scripts/test_employee_recovery_full_e2e.ts
Exit Code: 0

Total Scenarios: 16
Passed: 16 / 16
Failed: 0 / 16

🎉 ALL 16 PRODUCTION-READY RECOVERY SCENARIOS PASSED WITH 100% SUCCESS!
```

---

### Suite 6: Production Build Outputs

#### Backend NestJS Build
```
Command: npm run build (in backend/)
Exit Code: 0
> node --max-old-space-size=4096 node_modules/@nestjs/cli/bin/nest.js build
Compiled successfully.
```

#### Admin Frontend Build
```
Command: npm run build (in frontend/admin/)
Exit Code: 0
vite v6.3.5 building for production...
✓ 2811 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                        0.83 kB │ gzip:   0.48 kB
dist/assets/SA_logo-removebg-preview-Cxih-dbI.png    166.31 kB
dist/assets/index-Cgm37oHU.css                       183.59 kB │ gzip:  27.84 kB
dist/assets/index-B32YZKO3.js                      3,158.48 kB │ gzip: 663.61 kB
✓ built in 56.95s
```

#### Student Frontend Build
```
Command: npm run build (in frontend/user/)
Exit Code: 0
vite v6.3.5 building for production...
✓ 1898 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                        0.93 kB │ gzip:   0.51 kB
dist/assets/SA_logo-removebg-preview-Cxih-dbI.png    166.31 kB
dist/assets/index-BPaOU6Fw.css                       196.45 kB │ gzip:  28.70 kB
dist/assets/index-Zlyiq-nN.js                      1,563.14 kB │ gzip: 380.12 kB
✓ built in 36.08s
```
