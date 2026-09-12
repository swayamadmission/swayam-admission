import api from "./axios";

export interface FaqQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  status?: string;
  featured?: string;
  language?: string;
  tags?: string;
  collegeId?: string;
  courseId?: string;
  examId?: string;
  scholarshipId?: string;
  blogId?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface FaqDto {
  id?: string;
  question: string;
  answer: string;
  slug?: string;
  category: string;
  tags?: string[];
  language?: string;
  featured?: boolean;
  priority?: number;
  displayOrder?: number;
  status?: string;
  collegeId?: string;
  courseId?: string;
  examId?: string;
  scholarshipId?: string;
  studyMaterialId?: string;
  blogId?: string;
  aiSummary?: string;
  keywords?: string[];
  entities?: any;
  searchTerms?: string[];
  semanticKeywords?: string[];
  geoScore?: number;
  aiReadinessScore?: number;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  metaRobots?: string;
}

export const faqsApi = {
  getStats: () =>
    api.get("/faqs/stats"),

  findAll: (params?: FaqQueryParams) =>
    api.get("/faqs", { params }),

  findById: (id: string) =>
    api.get(`/faqs/${id}`),

  create: (data: FaqDto) =>
    api.post("/faqs", data),

  update: (id: string, data: Partial<FaqDto>) =>
    api.patch(`/faqs/${id}`, data),

  delete: (id: string) =>
    api.delete(`/faqs/${id}`),

  restore: (id: string) =>
    api.post(`/faqs/${id}/restore`),

  duplicate: (id: string) =>
    api.post(`/faqs/${id}/duplicate`),

  exportCsv: (params?: FaqQueryParams) =>
    api.get("/faqs/export", { params, responseType: "blob" }),

  bulkPublish: (ids: string[]) =>
    api.post("/faqs/bulk/publish", { ids }),

  bulkArchive: (ids: string[]) =>
    api.post("/faqs/bulk/archive", { ids }),

  bulkDelete: (ids: string[]) =>
    api.post("/faqs/bulk/delete", { ids }),
};
