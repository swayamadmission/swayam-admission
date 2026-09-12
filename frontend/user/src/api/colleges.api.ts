import api from "./axios";

export interface College {
  id: string;
  name: string;
  slug: string;
  type: string;
  state: string;
  city: string;
  isApproved: boolean;
  featured: boolean;
  ranking: number;
  totalFees?: number;
  hasHostel: boolean;
  approvals?: string[];
  img?: string;
  banner?: string;
  courses?: any[];
}

export interface CollegeQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  state?: string;
  type?: string;
  featured?: boolean;
  budgetMin?: number;
  budgetMax?: number;
  placementMin?: number;
  ownership?: string;
  hostel?: boolean;
}

export const collegesApi = {
  findAll: (params?: CollegeQueryParams) => 
    api.get<{ data: College[], total: number }>("/colleges", { params }),

  findById: (id: string) => 
    api.get<College>(`/colleges/${id}`),

  compare: (ids: string[]) =>
    api.get<any[]>("/colleges/compare", { params: { ids: ids.join(',') } }),
};
