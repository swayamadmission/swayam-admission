import api from "./axios";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  fullName: string;
  mobile: string;
  email?: string;
  password: string;
  confirmPassword: string;
  state: string;
  district: string;
  referralCode?: string;
  verificationToken: string;
  acceptedPolicies?: Array<{
    policyId?: string;
    policyType: string;
    policyVersion: string;
  }>;
  termsAccepted?: boolean;
}

export interface SendRegistrationMobileOtpPayload {
  mobile: string;
}

export interface VerifyRegistrationMobileOtpPayload {
  mobile: string;
  otp: string;
}

export interface ForgotPasswordSendOtpPayload {
  method: "MOBILE" | "EMAIL";
  identifier: string;
}

export interface ForgotPasswordVerifyOtpPayload {
  method: "MOBILE" | "EMAIL";
  identifier: string;
  otp: string;
}

export interface ResetPasswordWithTokenPayload {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SendMobileVerificationPayload {
  mobile: string;
}

export interface VerifyUserMobilePayload {
  mobile: string;
  otp: string;
}

export interface SendMobileOtpPayload {
  mobile: string;
}

export interface VerifyMobileOtpPayload {
  mobile: string;
  otp: string;
  fullName?: string;
  referralCode?: string;
}

export interface GoogleAuthPayload {
  idToken?: string;
  credential?: string;
  email?: string;
  fullName?: string;
  googleId?: string;
  referralCode?: string;
}

export interface VerifyEmailPayload {
  email?: string;
  code: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  personalEmail?: string | null;
  personalMobile?: string | null;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN" | string;
  isApproved: boolean;
  status?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  phoneVerified?: boolean;
  mobileVerified?: boolean;
  state?: string | null;
  city?: string | null;
  hasCompletedReferralOnboarding?: boolean;
  referredByCode?: string | null;
  counsellingDiscountUsed?: boolean;
  assignedCounselor?: any;
  profile?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  refresh_token?: string;
  isNewUser?: boolean;
  user: AuthUser;
}

export interface SignupResponse {
  message: string;
  access_token?: string;
  refresh_token?: string;
  user: AuthUser;
}

export const authApi = {
  // Registration Mobile OTP Flow
  sendRegistrationMobileOtp: (data: SendRegistrationMobileOtpPayload) =>
    api.post<{
      success: boolean;
      mobile: string;
      message: string;
      resendCooldownSeconds: number;
      expiresInSeconds: number;
      devOtp?: string;
    }>("/auth/register/send-mobile-otp", data),

  verifyRegistrationMobileOtp: (data: VerifyRegistrationMobileOtpPayload) =>
    api.post<{
      success: boolean;
      mobile: string;
      verificationToken: string;
      message: string;
    }>("/auth/register/verify-mobile-otp", data),

  // Logged-in User Mobile Verification
  sendMobileVerification: (data: SendMobileVerificationPayload) =>
    api.post<{
      success: boolean;
      message: string;
      resendCooldownSeconds: number;
      expiresInSeconds: number;
      devOtp?: string;
    }>("/auth/mobile/send-verification", data),

  verifyUserMobile: (data: VerifyUserMobilePayload) =>
    api.post<{
      success: boolean;
      mobileVerified: boolean;
      message: string;
    }>("/auth/mobile/verify", data),

  // Mobile Login OTP
  sendMobileOtp: (data: SendMobileOtpPayload) =>
    api.post<{
      success: boolean;
      mobile: string;
      message: string;
      resendCooldownSeconds: number;
      expiresInSeconds: number;
      devOtp?: string;
    }>("/auth/mobile/send-otp", data),

  verifyMobileOtp: (data: VerifyMobileOtpPayload) =>
    api.post<LoginResponse>("/auth/mobile/verify-otp", data),

  // Google OAuth
  googleAuth: (data: GoogleAuthPayload) =>
    api.post<LoginResponse>("/auth/google", data),

  // Email Verification
  sendEmailVerification: (email?: string) =>
    api.post<{
      success: boolean;
      message: string;
      resendCooldownSeconds: number;
      expiresInSeconds: number;
      devCode?: string;
    }>("/auth/email/send-verification", { email }),

  verifyEmail: (data: VerifyEmailPayload) =>
    api.post<{ success: boolean; message: string }>("/auth/email/verify", data),

  // Password Login & Registration
  login: (data: LoginPayload) =>
    api.post<LoginResponse>("/auth/login", data),

  signup: (data: SignupPayload) =>
    api.post<SignupResponse>("/auth/signup", data),

  // Forgot / Reset Password Flow (Mobile OR Email OTP)
  forgotPasswordSendOtp: (data: ForgotPasswordSendOtpPayload) =>
    api.post<{
      success: boolean;
      method: "MOBILE" | "EMAIL";
      message: string;
      resendCooldownSeconds: number;
      expiresInSeconds: number;
      devOtp?: string;
    }>("/auth/forgot-password/send-otp", data),

  forgotPasswordVerifyOtp: (data: ForgotPasswordVerifyOtpPayload) =>
    api.post<{
      success: boolean;
      resetToken: string;
      message: string;
    }>("/auth/forgot-password/verify-otp", data),

  resetPasswordWithToken: (data: ResetPasswordWithTokenPayload) =>
    api.post<{ success: boolean; message: string }>("/auth/reset-password", data),

  forgotPassword: (email: string) =>
    api.post<{ message: string; devResetToken?: string }>("/auth/forgot-password", { email }),

  resetPassword: (data: ResetPasswordPayload) =>
    api.post<{ message: string }>("/auth/reset-password", data),

  // Session Security & Tokens
  refreshToken: (refreshToken: string) =>
    api.post<LoginResponse>("/auth/refresh", { refreshToken }),

  logout: (refreshToken?: string) =>
    api.post<{ message: string }>("/auth/logout", { refreshToken }),

  getMe: () =>
    api.get<AuthUser>("/users/me"),
};
