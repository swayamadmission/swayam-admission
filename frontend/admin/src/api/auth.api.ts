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
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  refreshToken?: string;
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

  getMe: () =>
    api.get<AuthUser>("/users/me"),
};
