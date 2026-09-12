import api from "./axios";

export interface LeadAssignmentRecord {
  id: string;
  leadId: string;
  assignedToUserId: string;
  assignedPositionId?: string;
  assignedById?: string;
  assignmentType: string;
  reason?: string;
  status: string;
  assignedAt: string;
  endedAt?: string;
  assignedToUser?: {
    id: string;
    fullName: string;
    email?: string;
  };
  assignedBy?: {
    id: string;
    fullName: string;
  };
  assignedPosition?: {
    code: string;
    title: string;
  };
}

export interface Lead {
  id: string;
  userId?: string;
  fullName: string;
  mobile: string;
  email?: string;
  state?: string;
  district?: string;
  city?: string;
  educationLevel?: string;
  passingYear?: number;
  stream?: string;
  preferredCourse?: string;
  preferredCollege?: string;
  preferredCollegeText?: string;
  budget?: string;
  message?: string;
  hasConsent?: boolean;
  source: string;
  campaign?: string;
  status: string;
  priority: string;
  assignedCounselorId?: string;
  assignedSeniorCounselorId?: string;
  assignedPositionId?: string;
  isRoutingException?: boolean;
  routingExceptionReason?: string;
  createdAt: string;
  updatedAt: string;
  assignedCounselor?: {
    id: string;
    fullName: string;
    email?: string;
    mobile?: string;
    counselorProfile?: {
      employmentStatus?: string;
    };
  };
  assignedSeniorCounselor?: {
    id: string;
    fullName: string;
    email?: string;
    mobile?: string;
  };
  assignedPosition?: {
    id: string;
    code: string;
    title: string;
    companyEmail?: string;
  };
  counselor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  courseRel?: {
    id: string;
    name: string;
  };
  branchRel?: {
    id: string;
    name: string;
  };
  collegeRel?: {
    id: string;
    name: string;
  };
  notes?: {
    id: string;
    content: string;
    createdAt: string;
    user?: {
      fullName: string;
    };
  }[];
  activities?: {
    id: string;
    action: string;
    details?: string;
    createdAt: string;
    user?: {
      fullName: string;
    };
  }[];
  leadAssignments?: LeadAssignmentRecord[];
}

export interface AssignableCounselor {
  id: string;
  fullName: string;
  email: string;
  mobile?: string;
  department?: string;
  city?: string;
  activeLeadsCount: number;
  activeCasesCount: number;
  maxCapacity: number;
  status: 'ACTIVE' | 'FULL' | 'UNAVAILABLE';
  capacityOverrideAllowed: boolean;
}

export interface EligibleSeniorCounselor {
  id: string;
  fullName: string;
  email: string;
  mobile?: string;
  designation: string;
  positionCode?: string | null;
  activeLeadsCount: number;
  isGeographicMatch: boolean;
  matchType: 'GEOGRAPHIC_ASSIGNED' | 'STATE_MATCH' | 'GENERAL_POOL';
  priority: number;
  badge?: string;
}

export interface TeamCounselorSummary {
  id: string;
  fullName: string;
  email: string;
  employeeId: string;
  positionCode: string;
  positionTitle: string;
  activeCasesCount: number;
  maxCapacity: number;
  status: 'ACTIVE' | 'FULL' | 'UNAVAILABLE';
  employmentStatus: string;
  pendingFollowUps: number;
}

export interface BulkReassignResponse {
  successCount: number;
  failureCount: number;
  failures: { leadId: string; reason: string }[];
}

export interface SeniorCounselorStats {
  totalLeads: number;
  newLeads: number;
  unassignedCounselorCount: number;
  counselingPending: number;
  followUpsDue: number;
  routingExceptions: number;
}

export interface CounselorStats {
  myStudents: number;
  newLeads: number;
  pendingFollowUps: number;
  convertedLeads: number;
}

export interface LeadQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const leadsApi = {
  findAll: (params?: LeadQueryParams) => 
    api.get<{ data: Lead[]; total: number }>("/leads", { params }),

  findById: (id: string) => 
    api.get<Lead>(`/leads/${id}`),

  create: (data: Partial<Lead>) =>
    api.post("/leads", data),

  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/leads/${id}/status`, { status, notes }),

  assignCounselor: (id: string, counselorId: string) =>
    api.patch(`/leads/${id}/assign`, { counselorId }),

  assignCounselorToLead: (id: string, payload: { counselorId: string; reason?: string; overrideCapacity?: boolean }) =>
    api.post(`/leads/${id}/assign-counselor`, payload),

  getEligibleCounselors: (id: string) =>
    api.get<AssignableCounselor[]>(`/leads/${id}/eligible-counselors`),

  getEligibleSeniorCounselors: (id?: string) =>
    api.get<EligibleSeniorCounselor[]>(
      id ? `/leads/${id}/eligible-senior-counselors` : '/leads/eligible-senior-counselors',
    ),

  getAssignableCounselors: (id: string) =>
    api.get<AssignableCounselor[]>(`/leads/${id}/assignable-counselors`),

  reassignCounselorForLead: (id: string, payload: { targetUserId: string; targetRole: 'SENIOR_COUNSELOR' | 'COUNSELOR'; reason: string; overrideCapacity?: boolean }) =>
    api.post(`/leads/${id}/reassign-counselor`, payload),

  bulkReassignLeads: (payload: { leadIds: string[]; targetCounselorId: string; reason: string; overrideCapacity?: boolean }) =>
    api.post<BulkReassignResponse>("/leads/bulk-reassign", payload),

  getSeniorCounselorQueue: (params?: LeadQueryParams) =>
    api.get<{ data: Lead[]; total: number }>("/leads/senior-counselor/my-queue", { params }),

  getSeniorCounselorStats: () =>
    api.get<SeniorCounselorStats>("/leads/senior-counselor/stats"),

  getSeniorCounselorTeamSummary: () =>
    api.get<TeamCounselorSummary[]>("/leads/senior-counselor/team-summary"),

  getCounselorUnavailabilityQueue: (params?: LeadQueryParams) =>
    api.get<{ data: Lead[]; total: number }>("/leads/senior-counselor/unavailability-queue", { params }),

  getCounselorQueue: (params?: LeadQueryParams) =>
    api.get<{ data: Lead[]; total: number }>("/leads/counselor/my-students", { params }),

  getCounselorStats: () =>
    api.get<CounselorStats>("/leads/counselor/stats"),

  getRoutingExceptions: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<{ data: Lead[]; total: number }>("/leads/routing-exceptions", { params }),

  getAssignmentHistory: (id: string) =>
    api.get<LeadAssignmentRecord[]>(`/leads/${id}/assignment-history`),

  manualRoute: (id: string, seniorCounselorId: string, reason: string) =>
    api.post(`/leads/${id}/manual-route`, { seniorCounselorId, reason }),

  reassignLead: (id: string, targetUserId: string, targetRole: 'SENIOR_COUNSELOR' | 'COUNSELOR', reason: string) =>
    api.post(`/leads/${id}/reassign`, { targetUserId, targetRole, reason }),

  addNote: (id: string, content: string) =>
    api.post(`/leads/${id}/notes`, { content }),

  update: (id: string, data: Partial<Lead>) =>
    api.patch(`/leads/${id}`, data),

  delete: (id: string) =>
    api.delete(`/leads/${id}`),
};
