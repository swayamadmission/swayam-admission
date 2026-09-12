import api from "./axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudyMaterial {
  id: string;
  title: string;
  slug: string;
  description?: string;
  materialType: string;
  category: string;
  stream?: string;
  courseId?: string;
  course?: { id: string; name: string; totalFees?: number; slug?: string };
  collegeId?: string;
  college?: { id: string; name: string; city: string; state: string; slug?: string };
  examId?: string;
  exam?: { id: string; examName: string; category?: string; slug?: string };
  subject?: string;
  semester?: string;
  language?: string;
  fileName?: string;
  fileUrl?: string;
  thumbnail?: string;
  fileSize?: string;
  fileExtension?: string;
  pages?: number;
  downloadCount: number;
  viewCount: number;
  featured: boolean;
  premium: boolean;
  tags?: string[];
  status: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyMaterialStats {
  totalMaterials: number;
  activeMaterials: number;
  draftMaterials: number;
  featuredMaterials: number;
  premiumMaterials: number;
  totalDownloads: number;
  totalViews: number;
  totalPDFs: number;
  totalMockTests: number;
  uploadsThisMonth: number;
}

export interface StudyMaterialListResponse {
  data: StudyMaterial[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudyMaterialQueryParams {
  q?: string;
  page?: number;
  limit?: number;
  category?: string;
  materialType?: string;
  stream?: string;
  courseId?: string;
  collegeId?: string;
  examId?: string;
  scholarshipId?: string;
  subject?: string;
  semester?: string;
  language?: string;
  status?: string;
  featured?: boolean;
  premium?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export type CreateStudyMaterialPayload = {
  title: string;
  materialType: string;
  category: string;
  description?: string;
  stream?: string;
  courseId?: string;
  collegeId?: string;
  examId?: string;
  subject?: string;
  semester?: string;
  language?: string;
  fileName?: string;
  fileUrl?: string;
  thumbnail?: string;
  fileSize?: string;
  fileExtension?: string;
  pages?: number;
  featured?: boolean;
  premium?: boolean;
  tags?: string[];
  status?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type UpdateStudyMaterialPayload = Partial<CreateStudyMaterialPayload>;

// ─── API Client ──────────────────────────────────────────────────────────────

export const materialsApi = {
  // Stats
  getStats: () =>
    api.get<StudyMaterialStats>("/study-materials/stats"),

  // List / search
  findAll: (params?: StudyMaterialQueryParams) =>
    api.get<StudyMaterialListResponse>("/study-materials", { params }),

  findById: (id: string) =>
    api.get<StudyMaterial>(`/study-materials/${id}`),

  // By relations
  getByCollege: (collegeId: string, limit = 10) =>
    api.get<{ data: StudyMaterial[]; total: number }>(`/study-materials/by-college/${collegeId}`, {
      params: { limit },
    }),

  getByCourse: (courseId: string, limit = 10) =>
    api.get<{ data: StudyMaterial[]; total: number }>(`/study-materials/by-course/${courseId}`, {
      params: { limit },
    }),

  getByExam: (examId: string, limit = 12) =>
    api.get<{ data: StudyMaterial[]; total: number }>(`/study-materials/by-exam/${examId}`, {
      params: { limit },
    }),

  // Curated lists
  getRecommended: (params?: {
    category?: string;
    examId?: string;
    courseId?: string;
    materialType?: string;
    limit?: number;
  }) => api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/recommended", { params }),

  getLatest: (limit = 8) =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/latest", { params: { limit } }),

  getFeatured: (limit = 8) =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/featured", { params: { limit } }),

  getPopular: (limit = 8) =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/popular", { params: { limit } }),

  // CRUD
  create: (data: CreateStudyMaterialPayload) =>
    api.post<StudyMaterial>("/study-materials", data),

  update: (id: string, data: UpdateStudyMaterialPayload) =>
    api.patch<StudyMaterial>(`/study-materials/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string; id: string }>(`/study-materials/${id}`),

  restore: (id: string) =>
    api.post<StudyMaterial>(`/study-materials/${id}/restore`),

  duplicate: (id: string) =>
    api.post<StudyMaterial>(`/study-materials/${id}/duplicate`),

  // Tracking
  download: (id: string) =>
    api.post<StudyMaterial>(`/study-materials/${id}/download`),

  view: (id: string) =>
    api.post<StudyMaterial>(`/study-materials/${id}/view`),

  // Bookmarks
  getBookmarks: () =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/bookmarks"),

  addBookmark: (id: string) =>
    api.post<{ message: string; materialId: string }>(`/study-materials/${id}/bookmark`),

  removeBookmark: (id: string) =>
    api.delete<{ message: string; materialId: string }>(`/study-materials/${id}/bookmark`),

  // History
  getHistory: () =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/history"),

  // Export
  export: (params?: StudyMaterialQueryParams) =>
    api.get("/study-materials/export", { params, responseType: "blob" }),
};
