import api from "./axios";

export interface Scholarship {
  id: string;
  scholarshipName: string;
  slug: string;
  provider?: string;
  scholarshipType?: string;
  category?: string;
  gender?: string;
  state?: string;
  incomeLimit?: number;
  eligibility?: string;
  amount?: number;
  applicationStart?: string;
  applicationEnd?: string;
  renewalRequired: boolean;
  requiredDocuments?: string[];
  officialWebsite?: string;
  faqs?: any;
  featured: boolean;
  status: string;
}

export interface ScholarshipQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  state?: string;
  stateId?: string;
  featured?: boolean;
}

export const scholarshipsApi = {
  findAll: (params?: ScholarshipQueryParams) => 
    api.get<{ data: Scholarship[], total: number }>("/scholarships", { params }),

  findById: (id: string) => 
    api.get<Scholarship>(`/scholarships/${id}`),
};
