import api from "./axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Scholarship {
  id: string;
  scholarshipName: string;
  slug: string;
  provider?: string;
  description?: string;
  scholarshipType?: string;
  category?: string;
  gender?: string;
  state?: string;
  stateId?: string;
  states?: string[];
  stateRelation?: { id: string; name: string; code: string };
  country?: string;
  incomeLimit?: number;
  requiredMarks?: number;
  eligibility?: string;
  amount?: number;
  currency?: string;
  percentage?: number;
  applicationMode?: string;
  applicationStart?: string;
  applicationEnd?: string;
  renewalRequired?: boolean;
  requiredDocuments?: string[];
  officialWebsite?: string;
  faqs?: any;
  featured: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScholarshipDashboardStats {
  totalScholarships: number;
  activeScholarships: number;
  featuredScholarships: number;
  expiringSoon: number;
  totalApplications: number;
  totalProviders: number;
}

export interface ScholarshipListResponse {
  data: Scholarship[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ScholarshipQueryParams {
  q?: string;
  page?: number;
  limit?: number;
  category?: string;
  scholarshipType?: string;
  provider?: string;
  state?: string;
  stateId?: string;
  status?: string;
  featured?: boolean;
  expiringSoon?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export type CreateScholarshipPayload = {
  scholarshipName: string;
  provider?: string;
  description?: string;
  scholarshipType?: string;
  category?: string;
  gender?: string;
  state?: string;
  stateId?: string;
  states?: string[];
  country?: string;
  incomeLimit?: number;
  requiredMarks?: number;
  eligibility?: string;
  amount?: number;
  currency?: string;
  percentage?: number;
  applicationMode?: string;
  applicationStart?: string;
  applicationEnd?: string;
  renewalRequired?: boolean;
  requiredDocuments?: string[];
  officialWebsite?: string;
  faqs?: any;
  featured?: boolean;
  status?: string;
};

export type UpdateScholarshipPayload = Partial<CreateScholarshipPayload>;

// ─── API Client ──────────────────────────────────────────────────────────────

export const scholarshipsApi = {
  getStats: () =>
    api.get<ScholarshipDashboardStats>("/scholarships/stats"),

  findAll: (params?: ScholarshipQueryParams) =>
    api.get<ScholarshipListResponse>("/scholarships", { params }),

  findById: (id: string) =>
    api.get<Scholarship>(`/scholarships/${id}`),

  create: (data: CreateScholarshipPayload) =>
    api.post<Scholarship>("/scholarships", data),

  update: (id: string, data: UpdateScholarshipPayload) =>
    api.patch<Scholarship>(`/scholarships/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string; id: string }>(`/scholarships/${id}`),

  export: (params?: ScholarshipQueryParams) =>
    api.get("/scholarships/export", { params, responseType: "blob" }),
};
