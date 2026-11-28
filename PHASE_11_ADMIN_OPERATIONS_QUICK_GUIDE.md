# SWAYAM ADMISSION — ADMIN & COUNSELOR OPERATIONS QUICK GUIDE
## Daily Management, Lead Handling & Admission Workflow Manual

**Document Version:** 1.0.0  
**Effective Date:** 2026-11-01  
**Target Audience:** Admissions Counselors, Senior Counselors, Admissions Managers, System Administrators  
**Portal URL:** `https://swayam-admission-eg2x.vercel.app`  

---

## 1. Accessing the Portal

1. Open your browser and navigate to:  
   👉 **`https://swayam-admission-eg2x.vercel.app`**
2. Enter your authorized staff email address and password.
3. Click **Sign In**.
4. Once authenticated, your personalized dashboard will open based on your assigned role (`ADMIN`, `COUNSELOR`, or `SUPER_ADMIN`).

---

## 2. Managing Student Inquiries & Leads

### 2.1 Viewing Inbound Leads
- Click on **Leads** in the left navigation sidebar.
- You will see a list of recent inquiries submitted by students through the public website.
- Counselors will see leads assigned specifically to them; Administrators see the full organization queue.

### 2.2 Updating Lead Status & Recording Notes
1. Click on any student lead card to open the lead details drawer.
2. Under **Status**, select the appropriate milestone:
   - `NEW`: Inbound lead awaiting initial contact.
   - `IN_PROGRESS`: Contact initiated; counseling call scheduled.
   - `QUALIFIED`: Student is eligible and interested in applying for a course.
   - `ENROLLED`: Student has initiated an admission application.
   - `LOST`: Student declined or chose another institution.
3. Under **Consultation Notes**, type details of your phone/WhatsApp conversation (e.g. *"Discussed B.Tech CSE fee structure with candidate and parent; sent brochure"*).
4. Click **Save Notes**.

---

## 3. Reviewing & Verifying Student Documents

### 3.1 Opening the Document Vault
1. Click on **Applications** in the navigation bar.
2. Select an application in `SUBMITTED` status.
3. Scroll to the **Document Vault** section.
4. You will see uploaded marksheet copies (10th, 12th, Category Certificate, Photo).

### 3.2 Verification Action
- Click **Preview** to inspect the watermarked document copy.
- If details match the application form: Click **Approve Document**.
- If a document is blurred, incorrect, or invalid: Click **Reject Document** and enter a clear reason (e.g. *"Class 12 marksheet is illegible; please upload clear PDF scan"*). The student will receive an instant notification to re-upload.

---

## 4. Confirming Student Admission

1. When all required documents display `VERIFIED` and the admission fee is settled:
2. Open the application details.
3. Click the **Confirm Admission** button at the top right.
4. The system will:
   - Change application status to `ADMISSION_CONFIRMED`.
   - Generate an official admission confirmation record in the student's portal.
   - Create an immutable audit log entry recording your staff ID and approval timestamp.

---

## 5. Marketing Campaigns & Referral Codes (Admins Only)

- Navigate to **Marketing** in the sidebar.
- **Campaign Dashboard**: Review impressions, clicks, leads, conversions, and Return on Investment (ROI) across Google, Facebook, and Offline campaigns.
- **Referral Codes**: View student referral codes and track discounts applied during admission checkout.
- **Landing Pages**: Generate customized landing page URLs with campaign UTM tracking parameters.

---

## 6. System Health & Daily Sanity Check

If you suspect an issue or slow loading:
1. Navigate to **Settings** > **System Status** (or check `https://swayam-admission.onrender.com/v1/health`).
2. Verify that **Database** displays `CONNECTED` (Green).
3. If any gateway reports `UNAVAILABLE` or `DOWN`, take note of the message.

---

## 7. Escalation & Technical Support

For password resets, unexpected errors, or portal downtime, contact the technical operations team:
- **Email Support**: `support@swayamadmission.com` or `admin@swayamadmission.com`
- **Lead DevSecOps Engineer**: Technical Escalations & Infrastructure
- **Operating Hours**: Monday – Saturday, 09:00 AM to 07:00 PM IST

