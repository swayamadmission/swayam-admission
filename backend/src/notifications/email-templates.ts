/**
 * Swayam Admission — Professional Responsive Email Templates for Nodemailer
 */

export interface OtpEmailTemplateParams {
  otp: string;
  title?: string;
  greetingName?: string;
  purpose?: string;
  expiryMinutes?: number;
}

export interface PasswordResetSuccessTemplateParams {
  greetingName?: string;
  supportEmail?: string;
}

export interface WelcomeEmailTemplateParams {
  greetingName?: string;
  email?: string;
  loginUrl?: string;
}

const BASE_STYLES = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #1F2937;
  background-color: #F9FAFB;
  margin: 0;
  padding: 24px 12px;
`;

const CONTAINER_STYLES = `
  max-width: 580px;
  margin: 0 auto;
  background: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #E5E7EB;
`;

const HEADER_STYLES = `
  background: linear-gradient(135deg, #4338CA 0%, #6366F1 50%, #7C3AED 100%);
  padding: 32px 24px;
  text-align: center;
  color: #FFFFFF;
`;

const FOOTER_STYLES = `
  background: #F9FAFB;
  padding: 20px 24px;
  text-align: center;
  font-size: 12px;
  color: #6B7280;
  border-top: 1px solid #E5E7EB;
`;

/**
 * Clean 6-digit OTP verification email template
 */
export function buildOtpEmailHtml(params: OtpEmailTemplateParams): string {
  const {
    otp,
    title = 'Email Verification Code',
    greetingName = 'Student',
    purpose = 'verifying your email address on Swayam Admission',
    expiryMinutes = 15,
  } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="${BASE_STYLES}">
  <div style="${CONTAINER_STYLES}">
    <!-- Header -->
    <div style="${HEADER_STYLES}">
      <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">SWAYAM ADMISSION</h1>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9; font-weight: 500;">Career Guidance & Admission Portal</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 28px;">
      <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 700;">${title}</h2>
      <p style="color: #374151; font-size: 15px; margin-bottom: 20px;">
        Dear <strong>${greetingName}</strong>,
      </p>
      <p style="color: #4B5563; font-size: 14px; margin-bottom: 24px;">
        Your one-time verification code for ${purpose} is provided below:
      </p>

      <!-- OTP Display Box -->
      <div style="background: #EEF2FF; border: 2px dashed #6366F1; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #4F46E5; display: block; margin-bottom: 8px;">
          One-Time Password (OTP)
        </span>
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #312E81; display: inline-block;">
          ${otp}
        </span>
      </div>

      <div style="background: #F3F4F6; border-left: 4px solid #6366F1; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #4B5563;">
          ⏳ <strong>Validity:</strong> This code is valid for <strong>${expiryMinutes} minutes</strong>.
        </p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #EF4444;">
          🔒 <strong>Security Notice:</strong> Never share this OTP with anyone, including Swayam Admission staff.
        </p>
      </div>

      <p style="color: #6B7280; font-size: 13px; margin-top: 24px;">
        If you did not request this verification code, please ignore this email or contact support.
      </p>
    </div>

    <!-- Footer -->
    <div style="${FOOTER_STYLES}">
      <p style="margin: 0 0 6px;">© ${new Date().getFullYear()} Swayam Admission. All rights reserved.</p>
      <p style="margin: 0;">This is an automated security email. Please do not reply directly to this message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dedicated high-priority Forgot Password OTP template
 */
export function buildForgotPasswordOtpEmailHtml(params: OtpEmailTemplateParams): string {
  const {
    otp,
    greetingName = 'User',
    expiryMinutes = 10,
  } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Code — Swayam Admission</title>
</head>
<body style="${BASE_STYLES}">
  <div style="${CONTAINER_STYLES}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 30px 24px; text-align: center; color: #FFFFFF;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">SWAYAM ADMISSION</h1>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95; font-weight: 500;">Account Security Notification</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 28px;">
      <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 700;">Password Reset Request</h2>
      <p style="color: #374151; font-size: 15px; margin-bottom: 16px;">
        Hello <strong>${greetingName}</strong>,
      </p>
      <p style="color: #4B5563; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        We received a request to reset the password for your Swayam Admission account. Use the 6-digit verification code below to reset your password:
      </p>

      <!-- OTP Display Box -->
      <div style="background: #FEF2F2; border: 2px dashed #EF4444; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #DC2626; display: block; margin-bottom: 8px;">
          Password Reset OTP
        </span>
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #991B1B; display: inline-block;">
          ${otp}
        </span>
      </div>

      <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #92400E;">
          ⏱️ <strong>Valid for:</strong> ${expiryMinutes} minutes only.
        </p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #92400E;">
          🛡️ <strong>Didn't request this?</strong> If you did not make this request, someone may have entered your email address by mistake. Your account is still safe, and no changes have been made.
        </p>
      </div>

      <p style="color: #6B7280; font-size: 13px; margin-top: 24px;">
        For your security, never forward or share this code with anyone.
      </p>
    </div>

    <!-- Footer -->
    <div style="${FOOTER_STYLES}">
      <p style="margin: 0 0 6px;">© ${new Date().getFullYear()} Swayam Admission. All rights reserved.</p>
      <p style="margin: 0;">Automated account security alert. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Confirmation template when password has been successfully reset
 */
export function buildPasswordResetSuccessEmailHtml(params: PasswordResetSuccessTemplateParams): string {
  const { greetingName = 'User' } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful — Swayam Admission</title>
</head>
<body style="${BASE_STYLES}">
  <div style="${CONTAINER_STYLES}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 30px 24px; text-align: center; color: #FFFFFF;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800;">SWAYAM ADMISSION</h1>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95;">Security Confirmation</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 28px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 48px;">✅</span>
      </div>
      <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 700; text-align: center;">Password Updated Successfully</h2>
      <p style="color: #374151; font-size: 15px; margin-top: 20px;">
        Hello <strong>${greetingName}</strong>,
      </p>
      <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
        The password for your Swayam Admission account was successfully changed just now. You can now use your new password to sign in.
      </p>

      <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px 16px; border-radius: 4px; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #991B1B;">
          ⚠️ <strong>Didn't make this change?</strong>
        </p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #991B1B;">
          If you did not perform this action, please reset your password immediately or contact our support team to secure your account.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="${FOOTER_STYLES}">
      <p style="margin: 0 0 6px;">© ${new Date().getFullYear()} Swayam Admission. All rights reserved.</p>
      <p style="margin: 0;">Automated security notification.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Welcome & Account Confirmation Email Template
 */
export function buildWelcomeEmailHtml(params: WelcomeEmailTemplateParams): string {
  const {
    greetingName = 'Student',
    email = '',
    loginUrl = 'https://swayam-admission.vercel.app',
  } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Swayam Admission</title>
</head>
<body style="${BASE_STYLES}">
  <div style="${CONTAINER_STYLES}">
    <!-- Header -->
    <div style="${HEADER_STYLES}">
      <h1 style="margin: 0; font-size: 26px; font-weight: 800;">WELCOME TO SWAYAM ADMISSION</h1>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Your Gateway to Higher Education & Career Success</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 28px;">
      <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 700;">Welcome, ${greetingName}!</h2>
      <p style="color: #374151; font-size: 15px;">
        Thank you for joining <strong>Swayam Admission</strong>. Your account has been created successfully.
      </p>

      <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #374151;">
          <strong>Registered Email:</strong> ${email}
        </p>
      </div>

      <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">
        With Swayam Admission, you can:
      </p>
      <ul style="color: #4B5563; font-size: 14px; line-height: 1.8; padding-left: 20px;">
        <li>Explore top colleges, universities, and specialized programs</li>
        <li>Connect with expert admission counselors for personalized guidance</li>
        <li>Track your application status and documents in real time</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="background: #4F46E5; color: #FFFFFF; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block;">
          Go to Student Portal
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="${FOOTER_STYLES}">
      <p style="margin: 0 0 6px;">© ${new Date().getFullYear()} Swayam Admission. All rights reserved.</p>
      <p style="margin: 0;">Empowering student aspirations across India.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export interface EmployeeActivationEmailTemplateParams {
  employeeName: string;
  employeeId: string;
  officialEmail: string;
  activationUrl: string;
  expiryHours?: number;
  expiresInHours?: number;
  portalUrl?: string;
  portalName?: string;
  roleName?: string;
  designation?: string;
  departmentName?: string;
  supportEmail?: string;
}

/**
 * Secure Employee Account Activation Email Template
 * NO temporary password is included. Recipient sets their own password via the single-use activation link.
 */
export function buildEmployeeActivationEmailHtml(params: EmployeeActivationEmailTemplateParams): string {
  const {
    employeeName,
    employeeId,
    officialEmail,
    activationUrl,
    portalUrl = 'https://admin.swayamadmission.com',
    portalName = 'Swayam Staff & Administration Portal',
    roleName,
    designation,
    departmentName,
    supportEmail = 'swayamadmissions@gmail.com',
  } = params;
  const expiryHours = params.expiryHours || params.expiresInHours || 24;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activate Your Swayam Admission Staff Account</title>
</head>
<body style="${BASE_STYLES}">
  <div style="${CONTAINER_STYLES}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #312E81 100%); padding: 36px 24px; text-align: center; color: #FFFFFF;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">SWAYAM ADMISSION</h1>
      <p style="margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; font-weight: 600;">Staff & Employee Activation</p>
    </div>

    <!-- Body -->
    <div style="padding: 36px 28px;">
      <h2 style="margin-top: 0; color: #0F172A; font-size: 21px; font-weight: 700;">Welcome to the Team, ${employeeName}!</h2>
      <p style="color: #334155; font-size: 15px; margin-bottom: 22px;">
        An employee profile has been created for you at <strong>Swayam Admission</strong>. To begin using your workspace, please activate your account and set your permanent password.
      </p>

      <!-- Account Details Card -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748B; width: 140px; font-weight: 500;">Employee ID:</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 700; font-family: monospace; font-size: 15px;">${employeeId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Official Email:</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${officialEmail}</td>
          </tr>
          ${designation || roleName ? `
          <tr>
            <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Designation / Role:</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${designation || roleName}</td>
          </tr>` : ''}
          ${departmentName ? `
          <tr>
            <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Department:</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${departmentName}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Login Portal:</td>
            <td style="padding: 6px 0; color: #4338CA; font-weight: 600;"><a href="${portalUrl}" style="color: #4338CA; text-decoration: none;">${portalName}</a></td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 32px 0 24px;">
        <a href="${activationUrl}" style="background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%); color: #FFFFFF; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);">
          Activate Account & Set Password
        </a>
      </div>

      <!-- Expiry Notice -->
      <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px 16px; border-radius: 4px; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #1E40AF;">
          ⏳ <strong>Single-Use Link Security:</strong> This activation link is valid for <strong>${expiryHours} hours</strong> and can only be used once. For security reasons, no temporary password is provided. You will create your own secure password upon clicking the link.
        </p>
      </div>

      <!-- Plain Text Link Fallback -->
      <p style="color: #64748B; font-size: 12px; margin-top: 24px; word-break: break-all;">
        If the button above doesn't work, copy and paste this link into your browser:<br>
        <a href="${activationUrl}" style="color: #4F46E5;">${activationUrl}</a>
      </p>

      <p style="color: #475569; font-size: 13px; margin-top: 24px;">
        If you experience any issues or need assistance, please contact the Swayam Admissions IT / HR team at <a href="mailto:${supportEmail}" style="color: #4F46E5;">${supportEmail}</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="${FOOTER_STYLES}">
      <p style="margin: 0 0 6px;">© ${new Date().getFullYear()} Swayam Admission. All rights reserved.</p>
      <p style="margin: 0;">Confidential — for intended recipient employee only.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export interface EmployeeActivationSuccessTemplateParams {
  employeeName: string;
  employeeId: string;
  officialEmail: string;
  portalUrl: string;
  portalName?: string;
  supportEmail?: string;
}

/**
 * Confirmation template when employee account has been successfully activated
 */
export function buildEmployeeActivationSuccessEmailHtml(params: EmployeeActivationSuccessTemplateParams): string {
  const {
    employeeName,
    employeeId,
    officialEmail,
    portalUrl,
    portalName = 'Swayam Admission Portal',
    supportEmail = 'swayamadmissions@gmail.com',
  } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Activated Successfully — Swayam Admission</title>
</head>
<body style="${BASE_STYLES}">
  <div style="${CONTAINER_STYLES}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 32px 24px; text-align: center; color: #FFFFFF;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800;">SWAYAM ADMISSION</h1>
      <p style="margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.95;">Account Activated</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 28px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 44px;">🎉</span>
      </div>
      <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 700; text-align: center;">Welcome, ${employeeName}!</h2>
      <p style="color: #374151; font-size: 15px; margin-top: 16px; text-align: center;">
        Your employee account has been successfully activated. You can now log in using your Employee ID or official email address with your chosen password.
      </p>

      <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #6B7280; width: 140px;">Employee ID:</td>
            <td style="padding: 4px 0; color: #111827; font-weight: 700; font-family: monospace;">${employeeId}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6B7280;">Official Email:</td>
            <td style="padding: 4px 0; color: #111827; font-weight: 600;">${officialEmail}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6B7280;">Portal:</td>
            <td style="padding: 4px 0; color: #059669; font-weight: 600;">${portalName}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${portalUrl}" style="background: #059669; color: #FFFFFF; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block;">
          Sign In to Portal
        </a>
      </div>

      <p style="color: #6B7280; font-size: 13px; text-align: center; margin-top: 24px;">
        If you did not activate this account, please immediately contact our team at <a href="mailto:${supportEmail}" style="color: #059669;">${supportEmail}</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="${FOOTER_STYLES}">
      <p style="margin: 0 0 6px;">© ${new Date().getFullYear()} Swayam Admission. All rights reserved.</p>
      <p style="margin: 0;">Automated account activation confirmation.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export interface EmployeePasswordResetEmailTemplateParams {
  employeeName: string;
  employeeId: string;
  officialEmail: string;
  resetUrl: string;
  expiryHours?: number;
  portalUrl?: string;
  portalName?: string;
  roleName?: string;
  departmentName?: string;
  supportEmail?: string;
}

/**
 * Dedicated secure password recovery email template for administrator-dispatched recovery
 * Single-use, expiring link with zero temporary password.
 */
export function buildEmployeeAdminPasswordResetEmailHtml(params: EmployeePasswordResetEmailTemplateParams): string {
  const {
    employeeName,
    employeeId,
    officialEmail,
    resetUrl,
    portalUrl = 'https://admin.swayamadmission.com',
    portalName = 'Swayam Staff & Administration Portal',
    roleName,
    departmentName,
    supportEmail = 'swayamadmissions@gmail.com',
  } = params;
  const expiryHours = params.expiryHours || 24;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Recovery Request — Swayam Admission</title>
</head>
<body style="${BASE_STYLES}">
  <div style="${CONTAINER_STYLES}">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #4338CA 100%); padding: 36px 24px; text-align: center; color: #FFFFFF;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">SWAYAM ADMISSION</h1>
      <p style="margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; font-weight: 600;">Authorized Password Recovery</p>
    </div>

    <!-- Body -->
    <div style="padding: 36px 28px;">
      <h2 style="margin-top: 0; color: #0F172A; font-size: 21px; font-weight: 700;">Password Recovery Request</h2>
      <p style="color: #334155; font-size: 15px; margin-bottom: 22px;">
        Dear <strong>${employeeName}</strong>,
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 22px;">
        An authorized administrator has issued a secure password recovery request for your official Swayam Admission account. Use the single-use button below to set your new permanent password:
      </p>

      <!-- Account Details Card -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748B; width: 140px; font-weight: 500;">Employee ID:</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 700; font-family: monospace; font-size: 15px;">${employeeId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Official Email:</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${officialEmail}</td>
          </tr>
          ${roleName ? `
          <tr>
            <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Role:</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${roleName}</td>
          </tr>` : ''}
          ${departmentName ? `
          <tr>
            <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Department:</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${departmentName}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Authorized Portal:</td>
            <td style="padding: 6px 0; color: #4338CA; font-weight: 600;"><a href="${portalUrl}" style="color: #4338CA; text-decoration: none;">${portalName}</a></td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 32px 0 24px;">
        <a href="${resetUrl}" style="background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%); color: #FFFFFF; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);">
          Set New Password
        </a>
      </div>

      <!-- Security Notice -->
      <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px 16px; border-radius: 4px; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #1E40AF;">
          ⏳ <strong>Single-Use Link Security:</strong> This password recovery link is valid for <strong>${expiryHours} hours</strong> and can only be used once. For your protection, no temporary password has been generated.
        </p>
        <p style="margin: 6px 0 0; font-size: 13px; color: #DC2626;">
          🔒 <strong>Didn't request this?</strong> If you did not request a password recovery, please notify IT Security immediately at <a href="mailto:${supportEmail}" style="color: #DC2626; font-weight: 600;">${supportEmail}</a>.
        </p>
      </div>

      <!-- Plain Text Link Fallback -->
      <p style="color: #64748B; font-size: 12px; margin-top: 24px; word-break: break-all;">
        If the button above does not work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #4F46E5;">${resetUrl}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="${FOOTER_STYLES}">
      <p style="margin: 0 0 6px;">© ${new Date().getFullYear()} Swayam Admission. All rights reserved.</p>
      <p style="margin: 0;">Confidential security communication — intended for account owner only.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}


