import api from "./axios";

export interface TestimonialDto {
  id?: string;
  name: string;
  role?: string;
  course?: string;
  college?: string;
  state?: string;
  text: string;
  rating?: number;
  image?: string;
  videoUrl?: string;
  featured?: boolean;
  isVerified?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestimonialQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  state?: string;
}

export const testimonialsApi = {
  getStats: () => api.get("/testimonials/stats"),
  findAll: (params?: TestimonialQueryParams) =>
    api.get<{ data: TestimonialDto[]; total: number; page: number; limit: number; totalPages: number }>(
      "/testimonials/admin",
      { params }
    ),
  findById: (id: string) => api.get<TestimonialDto>(`/testimonials/${id}`),
  create: (data: TestimonialDto) => api.post<TestimonialDto>("/testimonials", data),
  update: (id: string, data: Partial<TestimonialDto>) => api.patch<TestimonialDto>(`/testimonials/${id}`, data),
  publish: (id: string) => api.patch(`/testimonials/${id}/publish`),
  unpublish: (id: string) => api.patch(`/testimonials/${id}/unpublish`),
  archive: (id: string) => api.patch(`/testimonials/${id}/archive`),
  delete: (id: string) => api.delete(`/testimonials/${id}`),
  exportCsv: () => api.get("/testimonials/export", { responseType: "blob" }),
};
