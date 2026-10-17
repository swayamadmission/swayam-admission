import api from "./axios";

export interface EmployeeListItem {
  id: string;
  employeeId: string | null;
  fullName: string;
  email: string | null;
  mobile: string | null;
  role: string;
  department: string | null;
  designation: string | null;
  status: string | null;
  isActive: boolean;
  isApproved: boolean;
  joiningDate: string | null;
  createdAt: string;
  lastLogin: string | null;
  avatar: string | null;
  mustChangePassword: boolean;
  emailVerified?: boolean;
  activationExpiresAt?: string | null;
  activatedAt?: string | null;
  assignedRoles: string[];
}

export interface EmployeeListResponse {
  success: boolean;
  data: EmployeeListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  metrics: {
    totalEmployees: number;
    activeEmployees: number;
    suspendedEmployees: number;
    newJoinersThisMonth: number;
  };
  filters: {
    departments: string[];
    designations: string[];
  };
}

export interface Employee360Response {
  success: boolean;
  user: any;
  recruitment: {
    onboardingId: string;
    applicationId?: string;
    vacancyTitle?: string;
    vacancyCode?: string;
    hiredDepartment?: string;
    hiredDesignation?: string;
    joiningDate?: string;
    workMode?: string;
    workLocation?: string;
    employmentType?: string;
    status?: string;
  } | null;
  stats: {
    assignedLeads: number;
    applicationsProcessed: number;
    documentsVerified: number;
    supportTicketsCount: number;
  };
  activityTimeline: any[];
  deviceSessions: any[];
  loginHistories: any[];
}

export interface CreateEmployeePayload {
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  department?: string;
  designation?: string;
  gender?: string;
  joiningDate?: string;
  city?: string;
  state?: string;
  sendWelcomeEmail?: boolean;
}

export interface UpdateEmployeePayload {
  fullName?: string;
  email?: string;
  mobile?: string;
  personalEmail?: string;
  personalMobile?: string;
  department?: string;
  designation?: string;
  role?: string;
  gender?: string;
  city?: string;
  state?: string;
  address?: string;
  pincode?: string;
  joiningDate?: string;
  bio?: string;
  qualification?: string;
  experience?: string;
  preferences?: Record<string, any>;
  socialLinks?: Record<string, any>;
}

export const employeesApi = {
  getEmployees: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    designation?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => api.get<EmployeeListResponse>("/employees", { params }).then((res) => res.data),

  getEmployee360: (id: string) =>
    api.get<Employee360Response>(`/employees/${id}`).then((res) => res.data),

  createEmployee: (data: CreateEmployeePayload) =>
    api.post("/employees", data).then((res) => res.data),

  updateEmployee: (id: string, data: UpdateEmployeePayload) =>
    api.patch(`/employees/${id}`, data).then((res) => res.data),

  updateStatus: (id: string, data: { status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED"; reason?: string }) =>
    api.patch(`/employees/${id}/status`, data).then((res) => res.data),

  resetPassword: (id: string, sendEmail: boolean = true) =>
    api.post(`/employees/${id}/reset-password`, { sendEmail }).then((res) => res.data),

  resendActivation: (id: string) =>
    api.post<{ success: boolean; message: string; activationExpiresAt?: string }>(`/employees/${id}/resend-activation`).then((res) => res.data),

  revokeSessions: (id: string) =>
    api.post(`/employees/${id}/revoke-sessions`).then((res) => res.data),

  getActivityTimeline: (id: string) =>
    api.get(`/employees/${id}/activity`).then((res) => res.data),
};
