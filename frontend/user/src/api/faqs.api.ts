import api from "./axios";

export interface PublicFaqQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  featured?: boolean;
}

export const faqsApi = {
  findPublic: (params?: PublicFaqQueryParams) =>
    api.get("/faqs/public", { params }),

  findBySlug: (slug: string) =>
    api.get(`/faqs/slug/${slug}`),

  getCategories: () =>
    api.get("/faqs/categories"),

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
};
