import api from "./axios";

export interface JourneyCheckpoint {
  id: string;
  priority: number;
  title: string;
  label: string;
  level: "STUDENT" | "APPLICATION";
  isOptional?: boolean;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  completed: boolean;
  date: string;
  description: string;
}

export interface ApplicationJourneyPayload {
  applicationId: string;
  studentUserId: string;
  applicationNumber: string;
  college: {
    id?: string;
    name: string;
    city?: string;
    state?: string;
    logo?: string;
  };
  course: {
    id?: string;
    name: string;
    totalFees?: number;
  };
  branch: {
    id?: string;
    name: string;
    code: string;
  };
  status: string;
  paymentStatus: string;
  checkpoints: JourneyCheckpoint[];
  progress: number;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  timeline: {
    id: string;
    applicationId: string;
    title: string;
    description: string;
    timestamp: string;
    status: string;
    type: string;
    source: string;
  }[];
}

export interface StudentOverallJourneyPayload {
  studentUserId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    mobile?: string;
    createdAt: string;
    assignedCounselor?: {
      id: string;
      fullName: string;
      email?: string;
    } | null;
  };
  checkpoints: JourneyCheckpoint[];
  progress: number;
  shortlistedColleges: {
    id: string;
    collegeId: string;
    collegeName: string;
    courseName: string;
    branchCode: string;
    shortlistedAt: string;
  }[];
  documentsCount: number;
  verifiedDocumentsCount: number;
}

export interface UnifiedStudentJourneyPayload {
  overallJourney: StudentOverallJourneyPayload;
  applicationsCount: number;
  applications: ApplicationJourneyPayload[];
}

export const journeyApi = {
  getStudentJourney: (studentId: string) =>
    api.get<UnifiedStudentJourneyPayload>(`/counselor/students/${studentId}/journey`),

  getApplicationJourney: (applicationId: string) =>
    api.get<ApplicationJourneyPayload>(`/counselor/applications/${applicationId}/journey`),
};
