import api from "./axios";

export interface LoginPayload {
  email: string;
  password: string;
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

  getMe: () =>
    api.get<AuthUser>("/users/me"),

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
