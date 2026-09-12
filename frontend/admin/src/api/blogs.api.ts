import api from "./axios";

export interface BlogQueryParams {
  page?: number;
  limit?: number;
  skip?: number;
  q?: string;
  category?: string;
  status?: string;
  featured?: boolean;
  tag?: string;
  authorId?: string;
  collegeId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface BlogDto {
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  thumbnail?: string;
  gallery?: string[];
  category: string;
  tags?: string[];
  authorId?: string;
  publishedAt?: string;
  status?: string;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  canonicalUrl?: string;
  metaRobots?: string;
  openGraph?: any;
  twitterCard?: any;
  isIndexed?: boolean;
  aiSummary?: string;
  tldr?: string;
  keyTakeaways?: string[];
  faqs?: { question: string; answer: string }[];
  entities?: any;
  readabilityScore?: number;
  seoScore?: number;
  geoScore?: number;
  aiReadinessScore?: number;
  collegeId?: string;
  courseId?: string;
  examId?: string;
  scholarshipId?: string;
  studyMaterialId?: string;
  state?: string;
  city?: string;
  governmentScheme?: string;
  career?: string;
  readingTime?: number;
}

export const blogsApi = {
  getStats: () =>
    api.get("/blogs/stats"),

  findAll: (params?: BlogQueryParams) =>
    api.get("/blogs", { params }),

  findById: (id: string) =>
    api.get(`/blogs/${id}`),

  create: (data: BlogDto) =>
    api.post("/blogs", data),

  update: (id: string, data: Partial<BlogDto>) =>
    api.patch(`/blogs/${id}`, data),

  delete: (id: string) =>
    api.delete(`/blogs/${id}`),

  restore: (id: string) =>
    api.post(`/blogs/${id}/restore`),

  duplicate: (id: string) =>
    api.post(`/blogs/${id}/duplicate`),

  getRevisions: (id: string) =>
    api.get(`/blogs/${id}/revisions`),

  rollbackRevision: (id: string, revisionId: string) =>
    api.post(`/blogs/${id}/rollback/${revisionId}`),

  exportCsv: (params?: BlogQueryParams) =>
    api.get("/blogs/export", { params, responseType: "blob" }),
};
