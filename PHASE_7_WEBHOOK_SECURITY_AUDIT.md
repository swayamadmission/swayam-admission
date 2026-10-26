# SWAYAM ADMISSION — PHASE 7 WEBHOOK SECURITY AUDIT
## Cryptographic Authentication, SSRF Hardening & Idempotency Analysis

**Document Version:** 1.0.0  
**Phase:** 7 (Live Email Provider Activation, Webhook Security & Production Readiness)  
**Target Controllers:** `CommunicationCampaignController` (`/v1/notifications/webhook/:provider`)  
**Audit Date:** October 21, 2026

---

### 1. EXECUTIVE SUMMARY

The Phase 6 webhook implementation accepted provider payloads and parsed them for delivery statuses. However, accepting incoming callbacks over HTTPS alone is insufficient: an attacker with knowledge of the endpoint could submit forged delivery status events or trigger Server-Side Request Forgery (SSRF) vulnerabilities by exploiting AWS SNS certificate fetching or subscription URLs.

In Phase 7, the webhook surface was completely audited and hardened:
1. **AWS SNS Cryptographic RSA Verification**: AWS SNS notifications require signature verification using an X.509 certificate hosted by AWS.
2. **SSRF Guard on SNS Certificate & Subscription URLs**: URLs are strictly checked against an authoritative AWS SNS domain regex before fetching. Local addresses, private networks, and cloud instance metadata services (IMDS at `169.254.169.254`) are completely blocked.
3. **SendGrid Event Webhook Signature & Anti-Replay**: Verification supports both SendGrid's ECDSA public verification key (`SENDGRID_WEBHOOK_VERIFICATION_KEY`) and HMAC secret (`SENDGRID_WEBHOOK_SECRET`). Requests include a strict 10-minute anti-replay timestamp verification.
4. **Cross-Attribution Protection**: Incoming events must match the recipient email associated with the delivery ID in the database, preventing attackers from re-attributing delivery states across different tenants or recipients.
5. **Strict Status Monotonicity & Idempotency**: State transitions adhere to a monotonic hierarchy (`QUEUED` -> `SENDING` -> `SENT` -> `DELIVERED` / `BOUNCED`). Delayed or duplicate callbacks cannot revert a terminal state.

---

### 2. AMAZON SES & SNS WEBHOOK THREAT MODEL & HARDENING

#### 2.1 Threat Vector: Server-Side Request Forgery (SSRF) via `SigningCertURL`
- **Vulnerability**: An AWS SNS message provides a `SigningCertURL` field containing the URL of the public certificate used to verify the payload signature. If the server fetches this URL naively, an attacker could supply `http://169.254.169.254/latest/meta-data/` to steal AWS IAM credentials or query internal VPC endpoints.
- **Hardening (`CommunicationCampaignController.validateSnsCertificateUrl`)**:
  - Enforces protocol: `https:`.
  - Enforces hostname pattern: `^sns\.[a-zA-Z0-9-]+\.amazonaws\.com(\.cn)?$`.
  - Enforces path extension: `.pem`.
  - Rejects arbitrary IPs, subdomains, redirect chains, or non-AWS domains.

#### 2.2 Threat Vector: SSRF via `SubscribeURL`
- **Vulnerability**: SNS sends a `SubscriptionConfirmation` message containing a `SubscribeURL`. If a backend blindly initiates an HTTP GET request to this URL, an attacker could trigger state-changing HTTP requests inside the backend network.
- **Hardening (`CommunicationCampaignController.validateSnsSubscribeUrl`)**:
  - Validates `SubscribeURL` with the same strict AWS SNS domain regex and HTTPS check.
  - The controller returns a confirmation payload to the caller rather than triggering outbound automated GET requests to unverified hosts.

#### 2.3 Threat Vector: Forged SNS Delivery & Bounce Events
- **Hardening (`CommunicationCampaignController.buildSnsSignableString`)**:
  - Constructs the canonical signable string matching AWS SNS specifications for `Notification`, `SubscriptionConfirmation`, and `UnsubscribeConfirmation`.
  - Validates the base64-encoded `Signature` against the canonical string using RSA public key crypto (`crypto.verify('sha1WithRSAEncryption', ...)`).

---

### 3. SENDGRID EVENT WEBHOOK THREAT MODEL & HARDENING

#### 3.1 Threat Vector: Replay Attacks
- **Vulnerability**: An attacker who intercepts a valid SendGrid delivery or bounce callback could replay it days or weeks later to manipulate delivery records.
- **Hardening**:
  - In `CommunicationCampaignController.verifySendGridWebhookSignature()`, the timestamp header `X-Twilio-Email-Event-Webhook-Timestamp` or event payload `timestamp` is evaluated.
  - Payloads older than **10 minutes** (`600 seconds`) are rejected with `401 Unauthorized` (`REPLAY_ATTACK_DETECTED`).

#### 3.2 Threat Vector: Forged Event Payloads
- **Hardening**:
  - Supports SendGrid's official signature algorithm using `SENDGRID_WEBHOOK_VERIFICATION_KEY` (ECDSA SHA-256 over `timestamp + rawPayload`).
  - Supports fallback HMAC validation using `SENDGRID_WEBHOOK_SECRET`.
  - Unsigned or invalid payloads fail closed when webhook secrets are configured.

---

### 4. CROSS-ATTRIBUTION & RECIPIENT INTEGRITY GUARD

#### Threat Vector: Provider Message ID Collision / Cross-Attribution
- **Vulnerability**: In Phase 6, delivery records were looked up by `providerMessageId`. If an attacker guessed a message ID or submitted an event with a valid message ID but specified a different recipient, the system could update the wrong user's delivery status.
- **Hardening (`NotificationDispatcher.handleDeliveryWebhook`)**:
  - Verifies that `event.recipientEmail.toLowerCase() === delivery.recipientEmail.toLowerCase()`.
  - If a mismatch occurs, the webhook logs a security warning and rejects the update with:
    `Cross-attribution mismatch: recipient email does not match delivery record`.

---

### 5. IDEMPOTENCY & STATUS MONOTONICITY MATRIX

| Existing Record Status | Incoming Webhook Event | Handled Action | Security / Integrity Rationale |
| :--- | :--- | :--- | :--- |
| `QUEUED` | `delivered` | Updated to `DELIVERED` | Valid state progression |
| `SENDING` | `delivered` | Updated to `DELIVERED` | Valid state progression |
| `SENT` | `delivered` | Updated to `DELIVERED` | Valid state progression |
| `SENT` | `bounce` / `dropped` | Updated to `BOUNCED` (`HARD_BOUNCE`) | Valid terminal state |
| `DELIVERED` | `delivered` (duplicate) | Skipped (`idempotencySkipped: true`) | Prevents duplicate processing |
| `DELIVERED` | `processed` / `sent` (delayed) | Rejected (`400 Bad Request`) | Prevents out-of-order state regression |
| `BOUNCED` | `sent` (delayed) | Rejected (`400 Bad Request`) | Terminal bounce cannot be reverted by delayed send |

---

### 6. AUTOMATED TEST EVIDENCE

All webhook security safeguards were verified using automated tests in `scripts/test_phase7_activation_and_security.ts`:

```
✅ [Suite 2] Valid AWS SNS Certificate URL Accepted
✅ [Suite 2] SSRF Guard: Insecure HTTP Certificate URL Rejected
✅ [Suite 2] SSRF Guard: Arbitrary Attacker Hostname Rejected
✅ [Suite 2] SSRF Guard: Cloud Metadata IP (169.254.169.254) Rejected
✅ [Suite 2] Valid AWS SNS SubscribeURL Accepted
✅ [Suite 2] SSRF Guard: Untrusted SubscribeURL Blocked on Webhook
✅ [Suite 3] Valid SendGrid HMAC Signature Accepted
✅ [Suite 3] Forged SendGrid Signature Rejected (401)
✅ [Suite 3] Replayed Webhook Timestamp Rejected (>10 min)
✅ [Suite 4] Cross-Attribution Mismatch Rejected
✅ [Suite 4] Legitimate Matching Recipient Accepted
✅ [Suite 4] Callback Idempotency Preserved
```

### 7. REMAINING RISKS & OPERATIONAL RECOMMENDATIONS

1. **Webhook Secrets Configuration in Render**:
   - `SENDGRID_WEBHOOK_VERIFICATION_KEY` or `SENDGRID_WEBHOOK_SECRET` must be populated in Render when SendGrid is activated.
   - For AWS SNS, configure the SNS Topic to deliver raw message deliveries or parse AWS SNS envelope properly.
2. **Rate Limiting**:
   - Webhook endpoints inherit global Express rate limiting (`express-rate-limit`) configured in `main.ts`, preventing volumetric Denial-of-Service attacks.
