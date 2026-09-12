import api from "./axios";

export interface PublicBlogQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  featured?: boolean;
}

export const blogsApi = {
  findPublic: (params?: PublicBlogQueryParams) =>
    api.get("/blogs/public", { params }),

  findBySlug: (slug: string) =>
    api.get(`/blogs/slug/${slug}`),

  likeBlog: (slug: string) =>
    api.post(`/blogs/slug/${slug}/like`),

  shareBlog: (slug: string) =>
    api.post(`/blogs/slug/${slug}/share`),
};
