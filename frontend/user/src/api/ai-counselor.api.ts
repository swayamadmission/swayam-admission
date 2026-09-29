import api from "./axios";

export interface CollegeCardData {
  id: string;
  name: string;
  slug?: string;
  location: string;
  fees: string;
  rating?: number;
  match?: number;
  ownership?: string;
  nirfRanking?: string | number | null;
  naacGrade?: string | null;
  highestPackage?: string | null;
  averagePackage?: string | null;
  placementPercentage?: number | null;
  hostelAvailable?: boolean;
  coursesCount?: number;
  officialRank?: number | null;
  badges?: string[];
}

export interface CourseCardData {
  id: string;
  name: string;
  collegeName?: string;
  collegeId?: string;
  location?: string;
  duration?: string;
  totalFees?: string | number;
  eligibility?: string;
  entranceExam?: string;
}

export interface ExamCardData {
  name: string;
  fullName: string;
  stream: string[];
  description: string;
  eligibility: string;
  examMonth: string;
  preparationTips: string[];
  officialWebsite: string;
}

export interface ScholarshipCardData {
  name: string;
  provider: string;
  amount: string;
  eligibility: string;
  deadline?: string;
  website?: string;
}

export interface StudyMaterialCardData {
  id: string;
  title: string;
  stream?: string;
  subject?: string;
  fileType?: string;
  isFree?: boolean;
  price?: number;
  downloadUrl?: string;
}

export interface GuideCardData {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  readingTime?: string;
}

export interface ComparisonCardData {
  title: string;
  colleges: {
    id: string;
    name: string;
    city: string;
    state: string;
    ownership: string;
    rank?: number | null;
    score?: number | null;
    tier?: string | null;
    fees: string;
    placement: string;
    highestPackage?: string;
    averagePackage?: string;
    hostel: string;
    infrastructureScore?: number;
    safetyScore?: number;
    roiScore?: number;
    studentExperienceScore?: number;
    badges?: string[];
    strengths?: string[];
  }[];
  verdict?: string;
}

export interface CounselorHandoffData {
  assignedCounselor?: {
    id: string;
    fullName: string;
    mobile?: string;
    email?: string;
    designation?: string;
  } | null;
  isPending?: boolean;
  handoffAvailable: boolean;
}

export interface AICounselorResponse {
  conversationId: string;
  messageId: string;
  role: "ASSISTANT";
  reply: string;
  content: string;
  colleges?: CollegeCardData[];
  courses?: CourseCardData[];
  exams?: ExamCardData[];
  scholarships?: ScholarshipCardData[];
  studyMaterials?: StudyMaterialCardData[];
  guides?: GuideCardData[];
  comparison?: ComparisonCardData;
  counselorHandoff?: CounselorHandoffData;
  applicationStatus?: any;
  chips?: string[];
  suggestedQuestions?: string[];
  retrievedSources?: { title: string; category: string; type: string }[];
  confidenceScore?: number;
  provider?: string;
  model?: string;
  createdAt?: string;
}

export interface AiMessage {
  id: string;
  type: "ai" | "user";
  content: string;
  reply?: string;
  chips?: string[];
  colleges?: CollegeCardData[];
  courses?: CourseCardData[];
  exams?: ExamCardData[];
  scholarships?: ScholarshipCardData[];
  studyMaterials?: StudyMaterialCardData[];
  guides?: GuideCardData[];
  comparison?: ComparisonCardData;
  counselorHandoff?: CounselorHandoffData;
  applicationStatus?: any;
  createdAt?: string;
  isError?: boolean;
}

export interface ChatPayload {
  message: string;
  conversationId?: string;
  language?: string;
  category?: string;
  studentProfile?: any;
}

export interface PublicAIConfig {
  isEnabled: boolean;
  welcomeMessage: string;
  suggestedChips: string[];
  counselorStatus: {
    phone: string;
    whatsapp: string;
    workingHours: string;
  };
  disclaimer: string;
}

export const aiCounselorApi = {
  getConfig: () =>
    api.get<PublicAIConfig>("/ai/config"),

  chat: (data: ChatPayload) =>
    api.post<AICounselorResponse>("/ai/chat", data),

  getHistory: () =>
    api.get<any[]>("/ai/conversations"),

  getConversations: () =>
    api.get<any[]>("/ai/conversations"),

  getConversationById: (id: string) =>
    api.get<any>(`/ai/conversation/${id}`),

  deleteConversation: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/ai/conversations/${id}`),

  getCounselorStatus: () =>
    api.get<{
      hasAssignedCounselor: boolean;
      counselor: {
        id: string;
        fullName: string;
        mobile?: string;
        email?: string;
        designation?: string;
      } | null;
      isRequestPending: boolean;
    }>("/ai/counselor-status"),

  getRecommendations: () =>
    api.get<any[]>("/ai/recommendations"),

  submitFeedback: (data: { conversationId: string; messageId?: string; rating: number; feedbackText?: string }) =>
    api.post("/ai/feedback", data),

  escalate: (data: { conversationId: string; reason?: string; summary?: string }) =>
    api.post("/ai/escalate", data),
};

