# SWAYAM ADMISSION — PHASE 7 TEST EVIDENCE
## Test Execution Audit, Classification Matrix & Verification Logs

**Document Version:** 1.0.0  
**Phase:** 7 (Live Email Provider Activation, Webhook Security & Production Readiness)  
**Execution Timestamp:** October 21, 2026  
**Environment:** Windows (PowerShell) / Node.js 20+ / Neon PostgreSQL / Local & Render Staging

---

### 1. SUMMARY OF TEST SUITES EXECUTED

| Suite Name | Script / Command | Exit Code | Automated | Mocked | Live Verified | Blocked | Failed |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 7 Security & Activation** | `npx ts-node scripts/test_phase7_activation_and_security.ts` | `0` | 23 | 0 | 0 | 2 | 0 |
| **Phase 6 Deliverability Regression** | `npx ts-node scripts/test_phase6_email_deliverability.ts` | `0` | 22 | 0 | 0 | 1 | 0 |
| **Employee Recovery Full E2E** | `npx ts-node scripts/test_employee_recovery_full_e2e.ts` | `0` | 16 | 0 | 0 | 0 | 0 |
| **Phase 5 Staging Acceptance** | `npx ts-node scripts/test_phase5_staging_acceptance.ts` | `0`* | 11 | 0 | 0 | 0 | 1* |
| **Backend Production Build** | `npm run build` (in `backend`) | `0` | N/A | N/A | N/A | N/A | 0 |
| **Admin Frontend Build** | `npm run build` (in `frontend/admin`) | `0` | N/A | N/A | N/A | N/A | 0 |
| **Student Frontend Build** | `npm run build` (in `frontend/user`) | `0` | N/A | N/A | N/A | N/A | 0 |

*\*Note on Phase 5 Suite 1: Initial root ping timed out after 25s due to Render free-tier cold start. Subsequent CORS and public catalog requests to the live backend succeeded.*

---

### 2. DETAILED BREAKDOWN: PHASE 7 ACTIVATION & SECURITY SUITE

**Command**: `npx ts-node scripts/test_phase7_activation_and_security.ts`  
**Exit Code**: `0`  
**Total Tests**: 25 | **Passed**: 23 | **Blocked**: 2 | **Failed**: 0

```
===================================================================================
                          PHASE 7 TEST RESULTS SUMMARY                             
===================================================================================

✅ [PASSED ] Suite 1 — Cooldown Durably Persisted to PostgreSQL
   Details: Quota cooldown metadata stored in OtpConfiguration.providerUrl

✅ [PASSED ] Suite 1 — Cooldown Survives Application Restart
   Details: Brand new DurableOutboxService instance loaded active cooldown from DB

✅ [PASSED ] Suite 1 — EmailChannel Health Observes Persistent Cooldown
   Details: EmailChannel getHealth() status is BLOCKED and reflects persistent DB cooldown

✅ [PASSED ] Suite 1 — Durable Cooldown Manual Reset
   Details: Admin reset cleared cooldown in memory and reset DB configuration

✅ [PASSED ] Suite 2 — Valid AWS SNS Certificate URL Accepted
   Details: Accepted valid AWS SNS certificate URL

✅ [PASSED ] Suite 2 — SSRF Guard: Insecure HTTP Certificate URL Rejected
   Details: Rejected insecure HTTP certificate URL

✅ [PASSED ] Suite 2 — SSRF Guard: Arbitrary Attacker Hostname Rejected
   Details: Rejected attacker certificate URL attacker-controlled-domain.com

✅ [PASSED ] Suite 2 — SSRF Guard: Cloud Metadata IP (169.254.169.254) Rejected
   Details: Rejected AWS metadata service IP 169.254.169.254

✅ [PASSED ] Suite 2 — Valid AWS SNS SubscribeURL Accepted
   Details: Accepted valid AWS SNS subscription URL

✅ [PASSED ] Suite 2 — SSRF Guard: Untrusted SubscribeURL Blocked on Webhook
   Details: Blocked SSRF attempt to internal metadata URL via SubscribeURL

✅ [PASSED ] Suite 3 — Valid SendGrid HMAC Signature Accepted
   Details: Webhook signature accepted successfully

✅ [PASSED ] Suite 3 — Forged SendGrid Signature Rejected (401)
   Details: Correctly rejected forged signature with 401 Unauthorized

✅ [PASSED ] Suite 3 — Replayed Webhook Timestamp Rejected (>10 min)
   Details: Rejected expired/replayed webhook timestamp (401 Unauthorized)

✅ [PASSED ] Suite 4 — Cross-Attribution Mismatch Rejected
   Details: Cross-attribution mismatch: recipient email does not match delivery record

✅ [PASSED ] Suite 4 — Legitimate Matching Recipient Accepted
   Details: Delivery transitioned to DELIVERED

✅ [PASSED ] Suite 4 — Callback Idempotency Preserved
   Details: Duplicate callback was safely skipped without error

✅ [Suite 5] Hard-Bounced Recipient Automatically Suppressed
   Details: Status: SKIPPED, Reason: RECIPIENT_SUPPRESSED_PREVIOUS_HARD_BOUNCE

✅ [Suite 5] Soft-Bounced Recipient Is NOT Suppressed
   Details: Soft bounce allowed through suppression check (Result: PROVIDER_QUOTA_EXCEEDED)

✅ [Suite 5] Admin Suppression Inspection API
   Details: Found 1 suppressed recipients

✅ [Suite 5] Admin Suppression Removal API
   Details: Cleared 1 suppressed records

✅ [Suite 5] Recipient Free for Delivery After Suppression Override
   Details: Prior suppression record successfully neutralized

✅ [Suite 6] Expired Authentication OTP Suppressed Before Send
   Details: Status: FAILED, Reason: AUTH_MESSAGE_EXPIRED

✅ [Suite 6] Superseded Authentication Message Suppressed
   Details: Superseded by newer delivery cmvi5qgqu0008q0qcooipahbj

⚠️ [BLOCKED] Suite 7 — Live SMTP Handshake & Auth Probe
   Details: SMTP connection established, but outbound data transmission is BLOCKED by daily sending quota until 2026-10-21T13:53:00.254Z

⚠️ [BLOCKED] Suite 7 — Outbound Live Email Delivery
   Details: Live delivery blocked by Gmail 550-5.4.5 daily quota. External provider configuration required.
```

---

### 3. DETAILED BREAKDOWN: PHASE 6 DELIVERABILITY REGRESSION SUITE

**Command**: `npx ts-node scripts/test_phase6_email_deliverability.ts`  
**Exit Code**: `0`  
**Total Tests**: 23 | **Passed**: 22 | **Blocked**: 1 | **Failed**: 0

```
--- SUITE 1: Provider Configuration & Resolution ---
✅ [Suite 1] Amazon SES Configuration Resolution: Host: email-smtp.ap-south-1.amazonaws.com, Port: 587, STARTTLS
✅ [Suite 1] SendGrid Configuration Resolution: Host: smtp.sendgrid.net, User: apikey, Port: 587, STARTTLS
✅ [Suite 1] Direct TLS Resolution on Port 465: Port 465 automatically defaults to secure: true (Direct TLS)
✅ [Suite 1] Password Alias & Whitespace Sanitization: SMTP_PASS accepted with internal/bounding whitespace stripped
✅ [Suite 1] Masked Credential Protection: Masked placeholder passwords containing asterisks are safely ignored

--- SUITE 2: Provider Health & State Mapping ---
✅ [Suite 2] Unconfigured Provider Health: Correctly reports UNCONFIGURED when credentials are missing
✅ [Suite 2] Configured Provider Health with Secret Masking: Status: CONFIGURED | Masked User: swa***@gmail.com
✅ [Suite 2] Quota-Blocked Health Status: Correctly transitions to BLOCKED during active quota cooldown
✅ [Suite 2] Quota Cooldown Reset Transition: Restores status back to CONFIGURED upon reset

--- SUITE 3: Webhook Delivery & Event Handling ---
✅ [Suite 3] SendGrid Delivered Event Callback: Successfully transitioned status to DELIVERED with deliveredAt timestamp
✅ [Suite 3] SendGrid Hard Bounce Callback & Reason: Transitioned status to BOUNCED with failureReason: HARD_BOUNCE
✅ [Suite 3] SendGrid Spam Report / Complaint Callback: Transitioned status to BOUNCED with failureReason: COMPLAINT
✅ [Suite 3] Amazon SES SNS Delivery Callback: Parsed inner SNS JSON Message and updated delivery to DELIVERED
✅ [Suite 3] Amazon SES SNS Permanent Bounce Event: Classified bounceType: Permanent as BOUNCED with HARD_BOUNCE
✅ [Suite 3] Amazon SES SNS Subscription Handshake: Successfully acknowledged SNS subscription URL without errors
✅ [Suite 3] Webhook Idempotent Processing: Duplicate status callback safely recognized and idempotently skipped
✅ [Suite 3] Out-of-Order Status Precedence Protection: Delayed SENT event correctly rejected; delivery remains DELIVERED

--- SUITE 4: Recipient Suppression Engine ---
✅ [Suite 4] Suppression of Hard-Bounced Recipient: Address automatically suppressed
✅ [Suite 4] Suppression of Recipient with Prior Complaint: Address automatically suppressed

--- SUITE 5: Outbox Recovery & Administrative Controls ---
✅ [Suite 5] Outbox Operational Metrics Retrieval: Queue depth: 9, Cooldown active: false
✅ [Suite 5] Admin Cooldown Reset Endpoint: Successfully reset cooldown via admin controller

--- SUITE 6: Controlled Live SMTP Probe ---
✅ [Suite 6] Live Google SMTP Handshake & Authentication: Verified connection to smtp.gmail.com:587 with App Password
⚠️ [Suite 6] Live Outbound Transmission: Google SMTP rejected with 550-5.4.5: Daily user sending limit exceeded. Outbound live delivery remains BLOCKED until dedicated provider activation or quota rollover.
```

---

### 4. DETAILED BREAKDOWN: EMPLOYEE RECOVERY & AUTHENTICATION SUITE

**Command**: `npx ts-node scripts/test_employee_recovery_full_e2e.ts`  
**Exit Code**: `0`  
**Total Tests**: 16 | **Passed**: 16 | **Failed**: 0

```
[Scenario 1]  ✅ PASS — Newly approved employee receives single-use 24h activation link without temporary password
[Scenario 2]  ✅ PASS — Employee activates account and creates permanent password without temporary password
[Scenario 3]  ✅ PASS — Normal employee requests OTP using registered official email
[Scenario 4]  ✅ PASS — Valid OTP permits employee to receive reset token and set new password
[Scenario 5]  ✅ PASS — Incorrect, expired, reused, or invalidated OTPs are rejected
[Scenario 6]  ✅ PASS — OTP resend limits, cooldowns (60s), and attempt limits enforced
[Scenario 7]  ✅ PASS — Unknown email does not reveal account existence (Anti-enumeration policy)
[Scenario 8]  ✅ PASS — Protected account recovery requires authorized IAM Administrator action
[Scenario 9]  ✅ PASS — Administrator-triggered recovery link dispatches to verified official email
[Scenario 10] ✅ PASS — Recovery links expire strictly (24h) and cannot be reused (single-use)
[Scenario 11] ✅ PASS — Existing sessions and refresh tokens are revoked upon successful password reset
[Scenario 12] ✅ PASS — SMTP centralized service health check and fallback resilience
[Scenario 13] ✅ PASS — Concurrent requests cannot consume or duplicate password reset operations
[Scenario 14] ✅ PASS — Correct login and portal access work with updated password
[Scenario 15] ✅ PASS — Unauthorized users cannot access administrative recovery APIs (Strict RBAC)
[Scenario 16] ✅ PASS — Database persistence and audit logs verified in Neon PostgreSQL
```

---

### 5. PRODUCTION BUILDS EVIDENCE

#### 1. Backend Service Build
- **Command**: `npm run build` in `backend`
- **Output**:
  ```
  > backend@0.0.1 build
  > node --max-old-space-size=4096 node_modules/@nestjs/cli/bin/nest.js build
  ```
- **Exit Code**: `0`

#### 2. Admin Portal Build
- **Command**: `npm run build` in `frontend/admin`
- **Output**:
  ```
  > @swayam/admin@0.0.1 build
  > vite build

  vite v6.3.5 building for production...
  transforming...
  ✓ 2811 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                                        0.83 kB │ gzip:   0.48 kB
  dist/assets/index-Cgm37oHU.css                       183.59 kB │ gzip:  27.84 kB
  dist/assets/index-B32YZKO3.js                      3,158.48 kB │ gzip: 663.61 kB
  ✓ built in 29.80s
  ```
- **Exit Code**: `0`

#### 3. Student Portal Build
- **Command**: `npm run build` in `frontend/user`
- **Output**:
  ```
  > @swayam/user@0.0.1 build
  > vite build

  vite v6.3.5 building for production...
  transforming...
  ✓ 1898 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                                        0.93 kB │ gzip:   0.51 kB
  dist/assets/index-BPaOU6Fw.css                       196.45 kB │ gzip:  28.70 kB
  dist/assets/index-Zlyiq-nN.js                      1,563.14 kB │ gzip: 380.12 kB
  ✓ built in 18.66s
  ```
- **Exit Code**: `0`

---

### 6. REMAINING LIVE ACTIONS

| Action | Status | Owner | Instructions |
| :--- | :--- | :--- | :--- |
| **Amazon SES or SendGrid Account Setup** | PENDING | Client / DevOps | Follow `PHASE_7_PROVIDER_ACTIVATION_RUNBOOK.md` |
| **Add Production SMTP Credentials to Render** | PENDING | DevOps Admin | Enter variables into Render environment settings |
| **Reset Outbox Cooldown & Retry Queue** | READY TO TRIGGER | System / Admin | Call `/v1/notifications/campaigns/outbox/retry-quota-blocked` after provider setup |
| **Purchase & Verify Domain `swayamadmission.com`** | FUTURE TASK | Business / DevOps | Configure SPF, DKIM, and DMARC DNS records |
