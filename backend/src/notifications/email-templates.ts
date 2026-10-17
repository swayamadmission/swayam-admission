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
    expiryMinutes = 5,
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
