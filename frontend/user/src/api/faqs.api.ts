import api from "./axios";

export interface PublicFaqQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  featured?: boolean;
}

export interface FaqCategoryCount {
  category: string;
  count: number;
}

export const faqsApi = {
  findPublic: (params?: PublicFaqQueryParams) =>
    api.get("/faqs/public", { params }),

  findBySlug: (slug: string) =>
    api.get(`/faqs/slug/${slug}`),

  getCategories: () =>
    api.get<FaqCategoryCount[]>("/faqs/categories"),

  getPopular: (limit?: number) =>
    api.get("/faqs/popular", { params: { limit } }),

  getFeatured: (limit?: number) =>
    api.get("/faqs/featured", { params: { limit } }),

  getByEntity: (type: string, id: string) =>
    api.get(`/faqs/entity/${type}/${id}`),

  markHelpful: (slug: string) =>
    api.post(`/faqs/slug/${slug}/helpful`),

  markNotHelpful: (slug: string) =>
    api.post(`/faqs/slug/${slug}/not-helpful`),

  recordView: (slug: string) =>
    api.post<{ success: boolean; views: number }>(`/faqs/slug/${slug}/view`),

  askQuestion: (data: { question: string; category: string; additionalDetails?: string }) =>
    api.post<{ success: boolean; message: string; data: any }>("/faqs/questions/ask", data),

  getMyQuestions: () =>
    api.get<
      Array<{
        id: string;
        question: string;
        answer?: string | null;
        category: string;
        status: string;
        slug: string;
        createdAt: string;
        updatedAt: string;
      }>
    >("/faqs/questions/my"),
};

