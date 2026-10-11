export interface DefaultPolicyDef {
  policyType: string;
  slug: string;
  title: string;
  version: string;
  content: string;
}

export const DEFAULT_LEGAL_POLICIES: DefaultPolicyDef[] = [
  {
    policyType: 'TERMS_AND_CONDITIONS',
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    version: 'v1.0',
    content: `## 1. Introduction & Acceptance
Welcome to Swayam Admission (operated under Swayam Admission Pvt. Ltd., "Platform", "we", "us", or "our"). These Terms & Conditions constitute a legally binding agreement between you (the "Student", "User", or "Applicant") and Swayam Admission regarding your access to and use of our admission counseling, college discovery, course applications, document vault, and fee payment services.

By accessing, registering on, or using the Platform, you acknowledge that you have read, understood, and agreed to be bound by these Terms. If you do not agree, you must immediately refrain from using the Platform.

## 2. Platform Nature & Services
Swayam Admission is an independent educational consulting, counseling, and direct admission facilitation platform. We provide:
1. Certified academic guidance, career roadmap planning, and AI-assisted counseling.
2. Direct application facilitation for approved universities, colleges, and affiliated institutions.
3. Secure document verification, scholarship matching, and institutional quota facilitation.

We are **NOT** a university or degree-granting entity. Degrees, diplomas, and official certificates are conferred solely by the respective affiliated educational institutions.

## 3. User Accounts & Identity Verification
- You must provide accurate, complete, and truthful personal, academic, and contact information.
- Maintaining the confidentiality of your login credentials and OTP tokens is your sole responsibility.
- Swayam Admission reserves the right to suspend or terminate accounts containing falsified academic credentials, forged certificates, or misleading identity data.

## 4. Admissions, Deadlines & Institutional Discretion
- Submission of an application through Swayam Admission does not guarantee admission. Final admission decisions, cutoff criteria, eligibility verifications, and seat allocations rest exclusively with the respective university or college management and relevant statutory bodies (such as UGC, AICTE, BCI, PCI, NMC).
- Applicants must adhere strictly to stated deadlines, seat acceptance timelines, and verification appointments.

## 5. Intellectual Property
All proprietary marks, algorithms, ranking systems, AI models, interface designs, databases, and content are the exclusive intellectual property of Swayam Admission. Unauthorized reproduction, automated scraping, or commercial exploitation is strictly prohibited.

## 6. Limitation of Liability & Indemnification
To the maximum extent permitted by applicable Indian law, Swayam Admission shall not be liable for indirect, incidental, punitive, or consequential damages resulting from institutional admission decisions, university fee revisions, or regulatory changes. You agree to indemnify Swayam Admission against any claims arising from fraudulent credentials or breach of these Terms.

## 7. Governing Law & Dispute Resolution
These Terms are governed by and construed in accordance with the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts in New Delhi, India.`,
  },
  {
    policyType: 'PRIVACY_POLICY',
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    version: 'v1.0',
    content: `## 1. Commitment to Student Privacy
Swayam Admission ("we", "us", "our") is dedicated to protecting the privacy, confidentiality, and data sovereignty of students and users across India. This Privacy Policy details how we collect, process, store, disclose, and safeguard your personal and sensitive academic data in compliance with the Digital Personal Data Protection Act (DPDPA), 2023, Information Technology Act, 2000, and applicable rules.

## 2. Information We Collect
We collect information strictly necessary to provide academic counseling and admission processing:
- **Identity Information**: Full name, gender, category, date of birth, photographs, government identity card number (Aadhaar / Voter ID / Passport) where required.
- **Contact Details**: Mobile number, email address, permanent address, state, and district.
- **Academic Records**: 10th/12th mark sheets, graduation transcripts, entrance exam ranks, admit cards, transfer certificates, and category certificates.
- **Financial & Payment Metadata**: Payment transaction reference IDs, coupon redemptions, and receipt details. (Note: We do NOT store credit card numbers, CVVs, or UPI PINs; transactions are handled securely by RBI-licensed payment gateways).
- **Technical & Usage Metadata**: IP address, device identifier, browser type, and timestamp of action-based consent.

## 3. Purpose of Processing & Legal Basis
Your personal and educational information is processed solely for:
1. Evaluating admission eligibility against target college criteria.
2. Processing institutional applications, counseling allocations, and verified enrollments.
3. Secure document verification with examination boards and universities.
4. Sending transactional notifications, admission updates, interview alerts, and receipts via SMS, WhatsApp, and email.
5. Providing AI-assisted career recommendations and comparative college insights.

## 4. Data Sharing & Disclosure
- **Target Universities & Colleges**: We share application dossiers only with the institutions you explicitly choose to apply to.
- **Verification Authorities**: Where mandated for statutory verification, records may be checked against educational boards.
- **No Commercial Sale**: Swayam Admission never sells, rents, or monetizes student personal data to third-party marketing companies.

## 5. Data Security & Storage
All student documents and records are stored in secure, encrypted cloud repositories with SSL/TLS encryption in transit and AES-256 encryption at rest. Strict role-based access control (RBAC) ensures only authorized counselors and verification officers access your dossiers.

## 6. Student Data Rights & Deletion Requests
You have the right to:
- Access and review your submitted profile and document records.
- Request correction of inaccurate information.
- Submit a formal **Document Deletion Request** through your Student Dashboard, subject to statutory retention guidelines.
- Contact our Grievance Officer regarding any data processing inquiries.`,
  },
  {
    policyType: 'REFUND_CANCELLATION_POLICY',
    slug: 'refund-cancellation-policy',
    title: 'Refund & Cancellation Policy',
    version: 'v1.0',
    content: `## 1. Scope of Policy
This Refund & Cancellation Policy governs all fee payments made on Swayam Admission, including platform application processing fees, counseling registration charges, premium study materials, and institutional seat reservation deposits.

## 2. Free Application Quota
- Swayam Admission grants all registered students a **Free Application Quota of up to three (3) college applications** without any platform service charge.
- Free quota applications are non-monetary and are not eligible for any cash refund or balance transfer.

## 3. Platform Application Fees
- Platform application processing fees for applications exceeding the free quota (or specialized programs) cover administrative verification, file compilation, and institutional dispatch.
- **Once an application has been reviewed and dispatched to the target university or college, the platform processing fee is non-refundable.**
- If an application is rejected at the initial eligibility screening stage prior to institutional dispatch due to an internal administrative error, the student may request a full credit or refund within 7 working days.

## 4. University Tuition & Seat Reservation Fees
- Institutional tuition fees and seat reservation charges collected through the platform are governed by the respective University’s or College’s official cancellation policy and applicable statutory regulations (e.g., UGC Fee Refund Norms).
- In the event of admission withdrawal within the UGC/AICTE stipulated window, refund processing will be coordinated between the student and the institution in accordance with the regulatory schedule.

## 5. Premium Study Materials
- Digital study materials, mock test series, and e-learning resources are non-refundable once unlocked or downloaded due to their immediate digital fulfillment nature.
- If technical defects prevent access and cannot be rectified within 48 hours, a 100% refund will be issued.

## 6. Refund Request Procedure & Timelines
- All refund inquiries must be submitted via the **Help & Support / Grievance Portal** with the original Payment Reference ID, Receipt Number, and registered mobile number.
- Approved refunds will be credited back to the original payment source (bank account, UPI, or card) within 5 to 7 business days.`,
  },
  {
    policyType: 'ADMISSION_COUNSELLING_DISCLAIMER',
    slug: 'admission-counselling-disclaimer',
    title: 'Admission & Counselling Disclaimer',
    version: 'v1.0',
    content: `## 1. Nature of Advisory Guidance
All recommendations, college rankings, eligibility assessments, cut-off estimations, and fee comparisons provided by Swayam Admission counselors or the AI Counselor are advisory and indicative in nature. They are formulated to assist students and parents in making informed educational decisions.

## 2. Regulatory & Institutional Autonomy
- Seat availability, fee structures, hostel charges, course accreditations, and affiliation statuses are subject to change by respective institutions and statutory councils (UGC, AICTE, MCI/NMC, DCI, BCI, PCI, INC) without prior notice.
- Swayam Admission does not represent, endorse, or guarantee the award of any university degree, placement package, or government employment.

## 3. Independent Verification Recommended
While Swayam Admission takes rigorous measures to verify college details and fee catalogs, students and guardians are strongly advised to independently inspect campus facilities, verify accreditation certificates, and review official university prospectuses prior to final enrollment.`,
  },
  {
    policyType: 'STUDENT_APPLICATION_TERMS',
    slug: 'student-application-terms',
    title: 'Student Application Terms',
    version: 'v1.0',
    content: `## 1. Application Submission Terms
By initiating, drafting, or submitting an application for any academic program through Swayam Admission, the student agrees to the following terms:
1. **Accurate Credentials**: You affirm that all details submitted—including qualifying exam scores, categories, domiciles, and personal particulars—are true, authentic, and complete.
2. **One Application Per Course-College**: Submitting duplicate applications for the identical offering is prohibited.
3. **Institutional Eligibility**: You confirm that you meet the minimum eligibility criteria prescribed by the target university or college for the selected course.
4. **Communication Authorization**: You authorize Swayam Admission and the target educational institution to contact you via SMS, WhatsApp, phone, and email regarding interview rounds, document verification, seat offers, and fee payment instructions.
5. **Withdrawal & Cancellation**: Submitting an application creates an active admission inquiry and record with the college. Cancellation of applications post-submission must adhere to institutional procedures.`,
  },
  {
    policyType: 'DATA_DOCUMENT_PROCESSING_CONSENT',
    slug: 'data-document-processing-consent',
    title: 'Data & Document Processing Consent',
    version: 'v1.0',
    content: `## 1. Document Upload & Processing Authorization
When uploading academic documents (including Class 10/12 mark sheets, degree certificates, migration certificates, caste/income certificates, and identity proofs) to Swayam Admission:
1. You grant Swayam Admission explicit consent to store, process, watermark, and transmit these documents to target educational institutions for the purpose of verifying eligibility and completing admission formalities.
2. You certify that you are the lawful owner or authorized guardian of the documents uploaded and that the files are genuine, unaltered originals or certified true copies.
3. You authorize automated anti-fraud checks, optical character recognition (OCR), and institutional verification against state or central examination boards.
4. You acknowledge that uploaded documents are preserved in the encrypted Swayam Admission Document Vault in accordance with our retention policy and applicable laws.`,
  },
  {
    policyType: 'PAYMENT_TERMS',
    slug: 'payment-terms',
    title: 'Payment Terms',
    version: 'v1.0',
    content: `## 1. Authorized Payment Gateway & Currency
- All transactions on Swayam Admission are processed in Indian Rupees (INR / ₹) via RBI-authorized payment aggregators (including Razorpay).
- Swayam Admission utilizes 256-bit SSL encryption and PCI-DSS compliant infrastructure.

## 2. Fee Authoritativeness & Integrity
- All application fees, counseling charges, and discounts are determined authoritatively by the backend server. Client-side tampering of fee values, coupon codes, or payable totals will result in automated payment rejection and potential account restriction.
- Applicable promotional coupon codes must be entered prior to payment initiation and cannot be retroactively applied to completed payments.

## 3. Receipts & Settlement
- Upon successful transaction completion, an official, digitally verifiable Swayam Admission Receipt (with a unique Receipt Number) is generated instantly and made available in the Student Dashboard.
- In the event of a network drop or account deduction without receipt generation, the transaction reconciliation system verifies the status within 2 hours. If confirmed, the receipt is issued; if unconfirmed, the deducted amount is auto-refunded by the banking partner.`,
  },
  {
    policyType: 'COOKIE_POLICY',
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    version: 'v1.0',
    content: `## 1. Use of Cookies
Swayam Admission uses cookies and local storage tokens strictly to maintain authenticated user sessions, retain user preferences (such as college shortlists and application drafts), and ensure platform security.

## 2. Categories of Cookies
1. **Strictly Necessary**: Required for core site operation, login session persistence, CSRF security, and multi-step application navigation.
2. **Functional**: Remembers user preferences such as state/course filters and dark/light UI settings.
3. **Performance & Analytics**: Aggregated, non-personally identifiable telemetry to evaluate system response times and optimize load performance.

We do NOT deploy intrusive third-party cross-site tracking cookies. You may control cookie preferences through your browser settings.`,
  },
  {
    policyType: 'AI_COUNSELOR_TERMS_DISCLAIMER',
    slug: 'ai-counselor-terms-disclaimer',
    title: 'AI Counselor Terms & Disclaimer',
    version: 'v1.0',
    content: `## 1. Artificial Intelligence Advisory Disclaimer
The Swayam Admission AI Counselor is an automated guidance tool powered by state-of-the-art conversational AI models and grounded directly in our verified college database, NIRF/9-pillar rankings, and official course catalogs.

## 2. Key Terms of Use
1. **Advisory Purpose**: AI Counselor responses provide informational guidance on courses, eligibility requirements, college comparisons, and career tracks. They do not constitute official admission confirmation.
2. **Verification Requirement**: Always cross-verify critical cutoffs, fees, and seat dates with an assigned Senior Counselor or target college representative before making final enrollment decisions.
3. **Responsible Interaction**: Do not share sensitive passwords, financial credentials, or offensive material in the chat interface. Chat logs may be reviewed by senior academic advisors to improve response quality.`,
  },
  {
    policyType: 'REFERRAL_REWARDS_TERMS',
    slug: 'referral-rewards-terms',
    title: 'Referral & Rewards Terms',
    version: 'v1.0',
    content: `## 1. Student Referral Program Overview
The Swayam Admission Student Referral & Rewards Program empowers verified students to invite peers, classmates, and friends to discover and apply to accredited educational institutions through Swayam Admission.

## 2. Authoritative Reward Tiers
Rewards are governed strictly by the following verified milestone rules:

### Tier 1 Reward: ₹4,000
- **Requirement**: Minimum 4 referred candidates registered on the platform.
- **Qualification Criteria**: At least 3 candidates must successfully enroll in an accredited partner institution through Swayam Admission, complete one full academic year (1-Year Milestone), and have their requisite first-year college fees verified.

### Tier 2 Reward: ₹10,000
- **Requirement**: Minimum 8 referred candidates registered on the platform.
- **Qualification Criteria**: At least 6 candidates must successfully enroll, complete one full academic year (1-Year Milestone), and have their requisite first-year college fees verified.

## 3. Verification & Anti-Fraud Governance
1. Self-referrals, fictitious registrations, duplicate phone numbers, or collusive submissions are strictly prohibited.
2. All referral claims undergo independent audit by the Student Welfare and Finance teams.
3. Approved rewards are disbursed via direct bank account transfer or official scholarship adjustment after identity and tax compliance verification.`,
  },
  {
    policyType: 'STUDY_MATERIAL_TERMS',
    slug: 'study-material-terms',
    title: 'Study Material Terms',
    version: 'v1.0',
    content: `## 1. Educational Content & Licensing
All syllabus guides, question banks, lecture notes, mock test series, and e-books provided on Swayam Admission are compiled for individual academic preparation.

## 2. License Terms
1. Purchasing or downloading material grants the student a personal, non-transferable, non-exclusive license for academic study only.
2. Commercial resale, redistribution, bulk printing, or online uploading of proprietary Swayam Admission materials is strictly prohibited and constitutes copyright infringement under the Indian Copyright Act, 1957.
3. Free materials are accessible to all verified registered students. Premium materials are unlocked upon verified payment or scholarship grant.`,
  },
  {
    policyType: 'COLLEGE_PARTNER_TERMS',
    slug: 'college-partner-terms',
    title: 'College Partner Terms',
    version: 'v1.0',
    content: `## 1. Institutional Partnership Terms
Educational institutions, universities, and colleges listed on or partnering with Swayam Admission agree to:
1. Provide accurate, truthful, and up-to-date information regarding fee structures, course approvals (UGC/AICTE/PCI/BCI/NMC), hostel amenities, and seat quotas.
2. Honor legitimate applications and student inquiries routed through the Swayam Admission Partner Portal.
3. Adhere to student welfare standards, statutory non-discrimination policies, and UGC fee refund directives.
4. Maintain confidentiality regarding student applicant dossiers in accordance with the DPDPA 2023.`,
  },
  {
    policyType: 'INTELLECTUAL_PROPERTY_POLICY',
    slug: 'intellectual-property-policy',
    title: 'Intellectual Property & Copyright Policy',
    version: 'v1.0',
    content: `## 1. Ownership of Content
All content hosted on Swayam Admission—including text, graphics, college profiles, comparative matrix systems, 9-pillar ranking methodologies, logos, software, and audio-visual assets—is protected by copyright, trademark, and other intellectual property laws of India.

## 2. Permitted Use
Users may view, download, and print reasonable excerpts from the platform solely for personal, non-commercial admission research. Any other use, including reproduction, modification, distribution, transmission, or republication, without express written permission from Swayam Admission Pvt. Ltd., is strictly prohibited.`,
  },
  {
    policyType: 'GRIEVANCE_REDRESSAL_POLICY',
    slug: 'grievance-redressal-policy',
    title: 'Grievance Redressal Policy',
    version: 'v1.0',
    content: `## 1. Student Grievance Redressal Mechanism
Swayam Admission is committed to resolving student, parent, and institutional complaints with transparency, speed, and fairness.

## 2. Grievance Officer Contact
In accordance with the Information Technology Act, 2000 and DPDPA, 2023, the designated Grievance Officer details are:
- **Designation**: Head of Legal & Student Grievance Redressal
- **Company**: Swayam Admission Pvt. Ltd.
- **Email**: grievance@swayamadmission.in / support@swayamadmission.in
- **Address**: Swayam Admission National Office, New Delhi, India
- **Helpdesk Contact**: +91 6284308664 / +91 6399102731

## 3. Resolution Timelines
1. **Acknowledgement**: All grievances submitted via the Grievance Portal or email receive an automated Complaint ID (e.g., GRV-2026-XXXX) within 24 hours.
2. **Review & Investigation**: The grievance committee examines application logs, payment records, or counselor interactions within 3 to 5 business days.
3. **Final Resolution**: A comprehensive resolution or explanatory report is communicated to the applicant within a maximum of 15 business days.`,
  },
  {
    policyType: 'CONTACT_LEGAL_INFORMATION',
    slug: 'contact-legal-information',
    title: 'Contact & Legal Information',
    version: 'v1.0',
    content: `## 1. Corporate Identity & Registered Office
**Entity Name**: Swayam Admission Pvt. Ltd.  
**Brand Identity**: Swayam Admission  
**Motto**: "India Ka Mission Swayam Admission — Your Trusted Education Partner"  
**Registered Headquarters**: New Delhi, India  

## 2. Official Communication Channels
- **General Inquiries**: info@swayamadmission.in / swayamadmissions@gmail.com
- **Admission Helpdesk**: getadmission@swayamadmission.com
- **Technical & Payment Support**: support@swayamadmission.in
- **Legal & Compliance**: legal@swayamadmission.in
- **Toll-Free / Central Helpline**: +91 6284308664 / +91 6399102731
- **Official WhatsApp Support**: +91 6284308664  
- **Official Website**: https://swayamadmission.in`,
  },
  {
    policyType: 'DOCUMENT_DELETION_DATA_REMOVAL_TERMS',
    slug: 'document-deletion-data-removal-terms',
    title: 'Document Deletion Request & Data Removal Terms',
    version: 'v1.0',
    content: `## 1. Right to Request Document Deletion
Under the Digital Personal Data Protection Act, 2023, students have the right to request the deletion or erasure of personal documents uploaded to their Swayam Admission profile when such documents are no longer required for active admission processing.

## 2. Request & Governance Workflow
1. **Submission**: Students initiate a formal deletion request via the **Student Dashboard → Documents → Request Deletion** interface.
2. **Protected Records & Statutory Retention**: Documents linked to finalized college admissions, statutory scholarship claims, or completed financial transactions are subject to regulatory retention obligations (typically retained for regulatory verification).
3. **Administrative Review**: To prevent accidental loss or fraudulent erasure of records during active college evaluation, requests are reviewed by the Data Protection Officer before execution.
4. **Permanent Removal**: Approved documents are securely purged from cloud storage buckets and database records, and an audit confirmation is provided.`,
  },
];

export const DEFAULT_CONSENT_CONFIGS = [
  {
    actionType: 'REGISTRATION',
    policyTypes: ['TERMS_AND_CONDITIONS', 'PRIVACY_POLICY'],
    isMandatory: true,
    description: 'Mandatory before student account creation.',
  },
  {
    actionType: 'APPLICATION_SUBMISSION',
    policyTypes: ['STUDENT_APPLICATION_TERMS', 'DATA_DOCUMENT_PROCESSING_CONSENT'],
    isMandatory: true,
    description: 'Mandatory before submitting an application to target college.',
  },
  {
    actionType: 'DOCUMENT_UPLOAD',
    policyTypes: ['DATA_DOCUMENT_PROCESSING_CONSENT'],
    isMandatory: true,
    description: 'Mandatory before uploading academic documents to Document Vault.',
  },
  {
    actionType: 'DOCUMENT_DELETION_REQUEST',
    policyTypes: ['DOCUMENT_DELETION_DATA_REMOVAL_TERMS', 'PRIVACY_POLICY'],
    isMandatory: true,
    description: 'Mandatory before submitting a document deletion or data removal request.',
  },
  {
    actionType: 'PAYMENT',
    policyTypes: ['PAYMENT_TERMS', 'REFUND_CANCELLATION_POLICY'],
    isMandatory: true,
    description: 'Mandatory before online payment checkout or ₹0 fee waiver settlement.',
  },
  {
    actionType: 'STUDY_MATERIAL_PURCHASE',
    policyTypes: ['STUDY_MATERIAL_TERMS', 'REFUND_CANCELLATION_POLICY'],
    isMandatory: true,
    description: 'Mandatory before purchasing premium study material.',
  },
  {
    actionType: 'AI_COUNSELOR',
    policyTypes: ['AI_COUNSELOR_TERMS_DISCLAIMER'],
    isMandatory: true,
    description: 'Acknowledged upon first use of the AI Counselor.',
  },
  {
    actionType: 'REFERRAL',
    policyTypes: ['REFERRAL_REWARDS_TERMS'],
    isMandatory: false,
    description: 'Referral program participation and rewards qualification rules.',
  },
  {
    actionType: 'COLLEGE_PARTNER_ACTION',
    policyTypes: ['COLLEGE_PARTNER_TERMS', 'PRIVACY_POLICY'],
    isMandatory: true,
    description: 'Mandatory for partner portal institution actions.',
  },
  {
    actionType: 'GRIEVANCE_DATA_REQUEST',
    policyTypes: ['GRIEVANCE_REDRESSAL_POLICY'],
    isMandatory: true,
    description: 'Acknowledged when submitting a formal student grievance.',
  },
];

export const DEFAULT_COOKIES = [
  {
    name: 'swayam_access_token',
    category: 'Necessary',
    purpose: 'Maintains secure student and staff authentication sessions.',
    provider: 'Swayam Admission',
    duration: 'Session / 30 Days',
    isActive: true,
  },
  {
    name: 'swayam_csrf_token',
    category: 'Necessary',
    purpose: 'Protects against Cross-Site Request Forgery (CSRF) on form submissions.',
    provider: 'Swayam Admission',
    duration: 'Session',
    isActive: true,
  },
  {
    name: 'swayam_app_draft',
    category: 'Functional',
    purpose: 'Caches in-progress multi-step college application drafts locally.',
    provider: 'Swayam Admission',
    duration: 'Local Storage',
    isActive: true,
  },
  {
    name: 'swayam_ui_prefs',
    category: 'Functional',
    purpose: 'Stores user UI preferences, search filters, and college shortlist selections.',
    provider: 'Swayam Admission',
    duration: '1 Year',
    isActive: true,
  },
  {
    name: 'swayam_perf_telemetry',
    category: 'Analytical',
    purpose: 'Measures page load response times and API latency without personal data.',
    provider: 'Swayam Admission',
    duration: '7 Days',
    isActive: true,
  },
];
