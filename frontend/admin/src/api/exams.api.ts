import api from "./axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExamCourseLink {
  courseId: string;
  examId: string;
  course: {
    id: string;
    name: string;
    totalFees?: number;
    college?: {
      id: string;
      name: string;
      city: string;
      state: string;
    };
    _count?: {
      applications: number;
    };
  };
}

export interface Exam {
  id: string;
  examName: string;
  slug: string;
  category: string;
  level: string;
  conductedBy?: string;
  eligibility?: string;
  qualification?: string;
  ageLimit?: string;
  examMode?: string;
  applicationStart?: string;
  applicationEnd?: string;
  examDate?: string;
  resultDate?: string;
  counsellingDate?: string;
  syllabus?: string[];
  pattern?: string;
  totalMarks?: number;
  duration?: string;
  applicationFee?: number;
  officialWebsite?: string;
  preparationTips?: string;
  importantBooks?: string[];
  previousYearPapers?: string[];
  faqs?: any;
  seoTitle?: string;
  seoDescription?: string;
  featured: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  courses?: ExamCourseLink[];
}

export interface ExamDashboardStats {
  totalExams: number;
  upcomingExams: number;
  openRegistrations: number;
  closedRegistrations: number;
  resultsDeclared: number;
  featuredExams: number;
  nationalExams: number;
  stateExams: number;
  privateExams: number;
  mostAppliedExam: string;
  averageApplications: number;
  latestExam: string;
}

export interface ExamListResponse {
  data: Exam[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExamQueryParams {
  q?: string;
  page?: number;
  limit?: number;
  category?: string;
  level?: string;
  examMode?: string;
  status?: string;
  featured?: boolean;
  registrationStatus?: string;
  sortBy?: string;
  sortOrder?: string;
}

export type CreateExamPayload = {
  examName: string;
  category: string;
  level: string;
  conductedBy?: string;
  eligibility?: string;
  qualification?: string;
  ageLimit?: string;
  examMode?: string;
  applicationStart?: string;
  applicationEnd?: string;
  examDate?: string;
  resultDate?: string;
  counsellingDate?: string;
  syllabus?: string[];
  pattern?: string;
  totalMarks?: number;
  duration?: string;
  applicationFee?: number;
  officialWebsite?: string;
  preparationTips?: string;
  importantBooks?: string[];
  previousYearPapers?: string[];
  faqs?: any;
  seoTitle?: string;
  seoDescription?: string;
  featured?: boolean;
  status?: string;
  courseIds?: string[];
};

export type UpdateExamPayload = Partial<CreateExamPayload>;

// ─── API Client ──────────────────────────────────────────────────────────────

export const examsApi = {
  getStats: () =>
    api.get<ExamDashboardStats>("/exams/stats"),

  findAll: (params?: ExamQueryParams) =>
    api.get<ExamListResponse>("/exams", { params }),

  findById: (id: string) =>
    api.get<Exam>(`/exams/${id}`),

  create: (data: CreateExamPayload) =>
    api.post<Exam>("/exams", data),

  update: (id: string, data: UpdateExamPayload) =>
    api.patch<Exam>(`/exams/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string; id: string }>(`/exams/${id}`),

  export: (params?: ExamQueryParams) =>
    api.get("/exams/export", { params, responseType: "blob" }),
};
