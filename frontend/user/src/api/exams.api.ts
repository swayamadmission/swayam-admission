import api from "./axios";

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
  featured: boolean;
  status: string;
}

export interface ExamQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  featured?: boolean;
}

export const examsApi = {
  findAll: (params?: ExamQueryParams) => 
    api.get<{ data: Exam[], total: number }>("/exams", { params }),

  findById: (id: string) => 
    api.get<Exam>(`/exams/${id}`),
};
