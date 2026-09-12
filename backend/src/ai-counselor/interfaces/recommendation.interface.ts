/**
 * Interfaces for the AI Counselor recommendation engine.
 * Designed to be pluggable — future Gemini/OpenAI integration
 * just needs to return these same types.
 */

export interface StudentInput {
  stream: string;
  tenthMarks: number;
  twelfthMarks: number;
  budgetMin?: number;
  budgetMax: number;
  interests: string[];
  preferredStates: string[];
  preferredCities: string[];
  collegeType: string; // GOVERNMENT, PRIVATE, ANY
  careerGoal?: string;
}

export interface ScoreBreakdown {
  marksScore: number;
  budgetScore: number;
  locationScore: number;
  streamScore: number;
  collegeTypeScore: number;
  seatScore: number;
}

export interface RecommendationResult {
  collegeId: string;
  collegeName: string;
  collegeCity: string;
  collegeState: string;
  collegeType: string;
  courseId: string;
  courseName: string;
  courseFees: number;
  courseDuration: string;
  courseSeats: number;
  totalScore: number; // 0-100 weighted score
  scoreBreakdown: ScoreBreakdown;
  reasoning: string; // human-readable explanation
  matchLevel: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'LOW';
}

export interface ExamSuggestion {
  name: string;
  fullName: string;
  stream: string[];
  description: string;
  eligibility: string;
  isEligible: boolean;
  examMonth: string;
  preparationTips: string[];
  officialWebsite: string;
}

export interface CareerPath {
  title: string;
  stream: string[];
  description: string;
  requiredExams: string[];
  averageSalary: string;
  growthOutlook: string;
  steps: string[];
  relevanceScore: number; // 0-100
}

export interface ScholarshipInfo {
  name: string;
  provider: string;
  amount: string;
  eligibility: string;
  category: string;
  isEligible: boolean;
  applicationDeadline: string;
  website: string;
}

export interface CounselorResponse {
  conversationId: string;
  summary: string;
  recommendations: RecommendationResult[];
  examSuggestions: ExamSuggestion[];
  careerPaths: CareerPath[];
  scholarships: ScholarshipInfo[];
  personalizedAdvice: string[];
}
