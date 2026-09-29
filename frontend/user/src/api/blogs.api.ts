import api from "./axios";

export interface PublicBlogQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  guideType?: string; // "CAREER" | "ADMISSION" | "All"
  educationLevel?: string;
  stream?: string;
  specialization?: string;
  state?: string;
  courseId?: string;
  featured?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface AdmissionStage {
  stageNumber: number;
  title: string;
  description: string;
  tentativeDate?: string;
}

export interface GuideItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  thumbnail?: string;
  guideType: "CAREER" | "ADMISSION" | string;
  educationLevel?: string;
  stream?: string;
  specialization?: string;
  careerPath?: string;
  skills: string[];
  eligibility?: string;
  entranceExams: string[];
  salaryRange?: string;
  averageSalary?: string;
  growthRate?: string;
  higherStudyOptions: string[];
  jobRoles: string[];
  govPrivatePaths?: string;
  admissionProcess?: string;
  applicationProcess?: string;
  requiredDocuments: string[];
  admissionStages?: AdmissionStage[];
  feesInfo?: string;
  counsellingInfo?: string;
  scholarshipInfo?: string;
  stateSchemesInfo?: string;
  importantTimelines?: any;
  prepGuidance?: string;
  relatedCourseIds: string[];
  relatedCollegeIds: string[];
  relatedExamIds: string[];
  relatedScholarshipIds: string[];
  stateId?: string;
  districtId?: string;
  state?: string;
  city?: string;
  governmentScheme?: string;
  tags: string[];
  faqs?: GuideFaq[];
  status: string;
  featured: boolean;
  readingTime?: number;
  views: number;
  likes: number;
  shares: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    fullName: string;
    email?: string;
  };
  college?: {
    id: string;
    name: string;
    slug: string;
    city?: string;
    state?: string;
    logo?: string;
  };
  course?: {
    id: string;
    name: string;
    slug: string;
    durationYears?: number;
    feeAmount?: number;
    stream?: string;
  };
  exam?: {
    id: string;
    examName: string;
    slug: string;
  };
  scholarship?: {
    id: string;
    scholarshipName: string;
    slug: string;
    amount?: number;
  };
  resolvedRelatedCourses?: Array<{
    id: string;
    name: string;
    slug: string;
    durationYears?: number;
    feeAmount?: number;
    stream?: string;
  }>;
  resolvedRelatedColleges?: Array<{
    id: string;
    name: string;
    slug: string;
    city?: string;
    state?: string;
    logo?: string;
  }>;
  resolvedRelatedExams?: Array<{
    id: string;
    examName: string;
    slug: string;
  }>;
  resolvedRelatedScholarships?: Array<{
    id: string;
    scholarshipName: string;
    slug: string;
    amount?: number;
  }>;
  recommendationScore?: number;
  matchReason?: string;
  savedAt?: string;
}

export const blogsApi = {
  findPublic: (params?: PublicBlogQueryParams) =>
    api.get<{ data: GuideItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      "/blogs/public",
      { params }
    ),

  findBySlug: (slug: string) =>
    api.get<{ blog: GuideItem; relatedBlogs: GuideItem[]; schemaOrg: any }>(
      `/blogs/slug/${slug}`
    ),

  findById: (id: string) =>
    api.get<GuideItem>(`/blogs/${id}`),

  getPersonalizedGuides: (userId?: string) =>
    api.get<GuideItem[]>("/blogs/guides/personalized", {
      params: userId ? { userId } : undefined,
    }),

  getSavedGuides: (userId?: string) =>
    api.get<GuideItem[]>("/blogs/guides/saved", {
      params: userId ? { userId } : undefined,
    }),

  saveGuide: (guideId: string, userId?: string) =>
    api.post<{ success: boolean; message: string; guideId: string }>(
      `/blogs/guides/${guideId}/save`,
      userId ? { userId } : {}
    ),

  unsaveGuide: (guideId: string, userId?: string) =>
    api.delete<{ success: boolean; message: string; guideId: string }>(
      `/blogs/guides/${guideId}/save`,
      { params: userId ? { userId } : undefined }
    ),

  getCounselorGuidance: (userId?: string) =>
    api.get<{
      hasCounselor: boolean;
      counselor: {
        id: string;
        fullName: string;
        email?: string;
        mobile?: string;
        avatar?: string;
        designation?: string;
      } | null;
      message?: string;
      guides?: GuideItem[];
    }>("/blogs/guides/counselor", {
      params: userId ? { userId } : undefined,
    }),

  likeBlog: (slug: string) =>
    api.post(`/blogs/slug/${slug}/like`),

  shareBlog: (slug: string) =>
    api.post(`/blogs/slug/${slug}/share`),
};
