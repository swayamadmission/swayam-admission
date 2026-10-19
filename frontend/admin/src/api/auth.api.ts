import api from "./axios";

export interface LoginPayload {
  email: string;
  password: string;
  domain?: 'PUBLIC' | 'ADMIN' | 'ERP';
}

export interface SignupPayload {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
}

export interface UserRoleInfo {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'DISABLED' | 'LOCKED' | 'ARCHIVED';
  isProtected: boolean;
  dataScope: string;
  department?: string;
  isActive?: boolean;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  roles?: UserRoleInfo[];
  effectivePermissions?: string[];
  dataScopes?: string[];
  isSuperAdmin?: boolean;
  isApproved: boolean;
  mustChangePassword?: boolean;
  employeeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
  mustChangePassword?: boolean;
  position?: any;
  user: AuthUser;
}

export interface SignupResponse {
  message: string;
  user: AuthUser;
}

export interface ActivationVerifyResponse {
  success?: boolean;
  valid?: boolean;
  isReset?: boolean;
  message: string;
  user: {
    fullName: string;
    employeeId: string | null;
    email: string | null;
    role: string;
    department?: string | null;
    designation?: string | null;
  };
  loginPortalUrl?: string;
  portalUrl?: string;
  portalName?: string;
}

export interface ActivateAccountResponse {
  success: boolean;
  message: string;
  loginPortalUrl: string;
  user: {
    fullName: string;
    employeeId: string | null;
    email: string | null;
    role: string;
  };
}

export interface ForgotPasswordSendOtpPayload {
  identifier: string; // Registered Official Email Address or permanent Employee ID
  method?: 'EMAIL' | 'SMS';
}

export interface ForgotPasswordSendOtpResponse {
  success: boolean;
  message: string;
  maskedDestination?: string;
  isProtected?: boolean;
}

export interface ForgotPasswordVerifyOtpPayload {
  identifier: string;
  otp: string;
  method?: 'EMAIL' | 'SMS';
}

export interface ForgotPasswordVerifyOtpResponse {
  success: boolean;
  message: string;
  resetToken: string;
  expiresInSeconds?: number;
}

export interface ResetPasswordWithTokenPayload {
  resetToken: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface ResetPasswordWithTokenResponse {
  success: boolean;
  message: string;
  portalUrl?: string;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  isReset?: boolean;
  reason?: string;
  message?: string;
  user?: {
    fullName: string;
    email: string;
    employeeId: string;
    role: string;
  };
  portalUrl?: string;
}

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<LoginResponse>("/auth/login", data),

  signup: (data: SignupPayload) =>
    api.post<SignupResponse>("/auth/signup", data),

  refreshToken: (refreshToken: string) =>
    api.post<LoginResponse>("/auth/refresh", { refreshToken, refresh_token: refreshToken }),

  logout: (refreshToken?: string) =>
    api.post("/auth/logout", { refreshToken, refresh_token: refreshToken }),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/auth/forgot-password", { email }),

  forgotPasswordSendOtp: (data: ForgotPasswordSendOtpPayload) =>
    api.post<ForgotPasswordSendOtpResponse>("/auth/forgot-password/send-otp", data).then((res) => res.data),

  forgotPasswordVerifyOtp: (data: ForgotPasswordVerifyOtpPayload) =>
    api.post<ForgotPasswordVerifyOtpResponse>("/auth/forgot-password/verify-otp", data).then((res) => res.data),

  resetPasswordWithToken: (data: ResetPasswordWithTokenPayload) =>
    api.post<ResetPasswordWithTokenResponse>("/auth/reset-password", data).then((res) => res.data),

  verifyResetToken: (token: string) =>
    api.get<VerifyResetTokenResponse>("/auth/reset-password/verify", { params: { token } }).then((res) => res.data),

  getMe: () =>
    api.get<AuthUser>("/users/me"),

  verifyActivationToken: (token: string) =>
    api.get<ActivationVerifyResponse>("/auth/activate-account/verify", { params: { token } }).then((res) => res.data),

  activateAccount: (data: { token: string; password: string; confirmPassword?: string }) =>
    api.post<ActivateAccountResponse>("/auth/activate-account", data).then((res) => res.data),

  firstLoginSendOtp: (userId: string) =>
    api.post<{ success: boolean; message: string; maskedEmail: string }>("/auth/first-login/send-otp", { userId }),

  firstLoginChangePassword: (data: {
    userId: string;
    currentPassword: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }) =>
    api.post<{ success: boolean; message: string; user: AuthUser; accessToken: string; refreshToken?: string }>(
      "/auth/first-login/change-password",
      data,
    ),
};

