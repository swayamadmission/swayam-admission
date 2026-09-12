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
  course?: { id: string; name: string };
  collegeId?: string;
  college?: { id: string; name: string; city: string; state: string };
  examId?: string;
  exam?: { id: string; examName: string; category?: string };
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
  createdAt: string;
  updatedAt: string;
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
  subject?: string;
  semester?: string;
  language?: string;
  sortBy?: string;
  sortOrder?: string;
}

// ─── API Client ──────────────────────────────────────────────────────────────

export const studyMaterialsApi = {
  // Public listing
  findAll: (params?: StudyMaterialQueryParams) =>
    api.get<StudyMaterialListResponse>("/study-materials", { params }),

  findById: (id: string) =>
    api.get<StudyMaterial>(`/study-materials/${id}`),

  // Curated lists
  getRecommended: (params?: {
    category?: string;
    examId?: string;
    courseId?: string;
    materialType?: string;
    limit?: number;
  }) => api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/recommended", { params }),

  getLatest: (limit = 8) =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/latest", {
      params: { limit },
    }),

  getFeatured: (limit = 8) =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/featured", {
      params: { limit },
    }),

  getPopular: (limit = 8) =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/popular", {
      params: { limit },
    }),

  // By entity
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

  // Tracking (fire-and-forget)
  trackDownload: (id: string) =>
    api.post(`/study-materials/${id}/download`).catch(() => {}),

  trackView: (id: string) =>
    api.post(`/study-materials/${id}/view`).catch(() => {}),

  // Bookmarks (require auth)
  getBookmarks: () =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/bookmarks"),

  addBookmark: (id: string) =>
    api.post<{ message: string }>(`/study-materials/${id}/bookmark`),

  removeBookmark: (id: string) =>
    api.delete<{ message: string }>(`/study-materials/${id}/bookmark`),

  // History (require auth)
  getHistory: () =>
    api.get<{ data: StudyMaterial[]; total: number }>("/study-materials/history"),
};
