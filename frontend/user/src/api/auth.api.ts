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
  referralCode?: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  isApproved: boolean;
  hasCompletedReferralOnboarding?: boolean;
  referredByCode?: string;
  counsellingDiscountUsed?: boolean;
  assignedCounselor?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  user: AuthUser;
}

export interface SignupResponse {
  message: string;
  user: AuthUser;
}

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<LoginResponse>("/auth/login", data),

  googleAuth: (data: { email: string; fullName: string; referralCode?: string }) =>
    api.post<LoginResponse>("/auth/google", data),

  signup: (data: SignupPayload) =>
    api.post<SignupResponse>("/auth/signup", data),

  getMe: () =>
    api.get<AuthUser>("/users/me"),
};

