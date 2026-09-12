import api from "./axios";
import type { AuthUser } from "./auth.api";

export interface UpdateProfilePayload {
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  role?: string;
  q?: string;
  isApproved?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const usersApi = {
  getMe: () =>
    api.get<AuthUser>("/users/me"),

  updateProfile: (data: UpdateProfilePayload) =>
    api.patch("/users/me/profile", data),

  getAll: (params?: UserQueryParams) =>
    api.get<PaginatedResponse<any>>("/users", { params }),

  getAllCounselors: (params?: UserQueryParams) =>
    api.get<PaginatedResponse<any>>("/users/counselors", { params }),

  getById: (id: string) =>
    api.get<any>(`/users/${id}`),

  toggleApproval: (id: string) =>
    api.patch(`/users/${id}/toggle-approval`),

  updateStudent: (id: string, data: any) =>
    api.patch(`/users/${id}`, data),

  getStudentJourney: (id: string) =>
    api.get<any>(`/users/${id}/journey`),

  getCounselorStats: () =>
    api.get<any>("/users/counselors/stats"),

  createCounselor: (data: any) =>
    api.post<any>("/users/counselors", data),

  updateCounselor: (id: string, data: any) =>
    api.patch(`/users/counselors/${id}`, data),
};
