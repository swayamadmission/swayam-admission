import api from "./axios";

export interface CourseEligibility {
  id: string;
  courseId: string;
  educationLevel: string;
  stream?: string | null;
  entryType: string;
  lateralEntry: boolean;
  status: string;
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

export interface CourseBranchResponse {
  data: CourseBranch[];
  total: number;
  allowOtherBranch?: boolean;
}

export interface Course {
  id: string;
  name: string;
  slug: string;
  category: string;
  level: string;
  duration: string;
  durationType?: string;
  totalFees?: number;
  semesterFees?: number;
  seats?: number;
  eligibility?: string;
  eligibleLevels?: string[];
  eligibleStreams?: string[];
  eligibilities?: CourseEligibility[];
  allowOtherBranch?: boolean;
  branches?: CourseBranch[];
  _count?: {
    branches?: number;
    applications?: number;
  };
  careerScope?: string;
  careerOpportunities?: string;
  status: string;
  featured?: boolean;
  rating?: number;
  students?: string;
  badge?: string;
  color?: string;
}

export interface CourseListResponse {
  data: Course[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface CourseQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  level?: string;
  mode?: string;
  collegeId?: string;
  state?: string;
  status?: string;
  featured?: boolean;
  educationLevel?: string;
  stream?: string;
  entryType?: string;
  feeRange?: string;
  duration?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const coursesApi = {
  findAll: async (params?: CourseQueryParams): Promise<CourseListResponse> => {
    const res = await api.get<CourseListResponse>("/courses", { params });
    return res.data;
  },

  findById: async (id: string): Promise<Course> => {
    const res = await api.get<Course>(`/courses/${id}`);
    return res.data;
  },

  getBranches: async (courseId: string): Promise<CourseBranchResponse> => {
    const res = await api.get<CourseBranchResponse>(`/courses/${courseId}/branches`);
    return res.data;
  },

  getStreams: async (educationLevel?: string): Promise<{ success: boolean; data: string[] }> => {
    const res = await api.get<{ success: boolean; data: string[] }>("/courses/streams", {
      params: { educationLevel },
    });
    return res.data;
  },
};


