import api from "./axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourseCollege {
  id: string;
  name: string;
  city: string;
  state: string;
  university?: string;
  logo?: string;
  website?: string;
  phone?: string;
  email?: string;
  naacGrade?: string;
  accreditation?: string;
  approvals?: string[];
}

export interface CourseApplication {
  id: string;
  applicationId: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
}

export interface CourseBranch {
  id: string;
  courseId: string;
  name: string;
  code?: string | null;
  slug: string;
  type?: string | null;
  eligibility?: string | null;
  status: 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  id: string;
  collegeId: string;
  college?: CourseCollege;
  name: string;
  slug: string;
  category: string;
  level: string;
  duration: string;
  durationType: string;
  mode: string;
  eligibility?: string;
  entranceExam?: string;
  totalFees?: number;
  semesterFees?: number;
  seats?: number;
  description?: string;
  syllabus?: string[];
  careerScope?: string;
  averageSalary?: number;
  featured: boolean;
  allowOtherBranch?: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  branches?: CourseBranch[];
  applications?: CourseApplication[];
  _count?: { applications?: number; branches?: number };
}

export interface CourseDashboardStats {
  totalCourses: number;
  activeCourses: number;
  featuredCourses: number;
  totalApplications: number;
  collegesOffering: number;
  averageFee: number;
  highestFee: number;
  lowestFee: number;
  mostPopularCourse: string | null;
  topCategory: string | null;
}

export interface CourseListResponse {
  data: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CourseQueryParams {
  q?: string;
  page?: number;
  limit?: number;
  category?: string;
  level?: string;
  mode?: string;
  collegeId?: string;
  state?: string;
  status?: string;
  featured?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export type CreateCoursePayload = {
  name: string;
  collegeId: string;
  category?: string;
  level?: string;
  duration?: string;
  durationType?: string;
  mode?: string;
  featured?: boolean;
  status?: string;
  description?: string;
  eligibility?: string;
  entranceExam?: string;
  seats?: number;
  syllabus?: string[];
  totalFees?: number;
  semesterFees?: number;
  careerScope?: string;
  averageSalary?: number;
};

export type UpdateCoursePayload = Partial<CreateCoursePayload>;

// ─── API ─────────────────────────────────────────────────────────────────────

export const coursesApi = {
  getStats: () =>
    api.get<CourseDashboardStats>("/courses/stats"),

  findAll: (params?: CourseQueryParams) =>
    api.get<CourseListResponse>("/courses", { params }),

  findById: (id: string) =>
    api.get<Course>(`/courses/${id}`),

  create: (data: CreateCoursePayload) =>
    api.post<Course>("/courses", data),

  update: (id: string, data: UpdateCoursePayload) =>
    api.patch<Course>(`/courses/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string; id: string }>(`/courses/${id}`),

  export: (params?: CourseQueryParams) =>
    api.get("/courses/export", { params, responseType: "blob" }),
};
