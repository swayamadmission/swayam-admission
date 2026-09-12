import api from "./axios";

export interface UpdateStudentPayload {
  fullName?: string;
  mobile?: string;
  alternatePhone?: string;
  email?: string;
  isApproved?: boolean;
  isActive?: boolean;
  status?: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  religion?: string;
  nationality?: string;
  category?: string;
  aadhaar?: string;
  pan?: string;
  passport?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  parentName?: string;
  parentContact?: string;
  parentRelation?: string;
  tenthBoard?: string;
  tenthSchool?: string;
  tenthPassingYear?: number;
  tenthMarks?: number;
  tenthMaxMarks?: number;
  tenthObtainedMarks?: number;
  twelfthBoard?: string;
  twelfthSchool?: string;
  twelfthStream?: string;
  twelfthPassingYear?: number;
  twelfthMarks?: number;
  twelfthMaxMarks?: number;
  twelfthObtainedMarks?: number;
  diplomaCourse?: string;
  diplomaCollege?: string;
  diplomaPercentage?: number;
  diplomaPassingYear?: number;
  graduationCourse?: string;
  graduationCollege?: string;
  graduationUniversity?: string;
  graduationPercentage?: number;
  graduationCgpa?: number;
  graduationPassingYear?: number;
  previousCollege?: string;
  university?: string;
  gapYears?: number;
  backlogs?: number;
  certificates?: string[];
}

export interface AssignCounselorPayload {
  counselorId: string;
  remarks?: string;
}

export interface SendNotificationPayload {
  channel: "EMAIL" | "SMS" | "WHATSAPP" | "PUSH";
  title: string;
  message: string;
  metadata?: any;
}

export interface CreateNotePayload {
  content: string;
  title?: string;
  noteType?: string;
  isPinned?: boolean;
  attachments?: string[];
}

export interface CreateCommunicationPayload {
  channel: string;
  content: string;
  subject?: string;
  type?: string;
  status?: string;
  metadata?: any;
  attachments?: string[];
}

export interface StudentQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  isApproved?: string;
  status?: string;
  state?: string;
  district?: string;
  counselorId?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const studentsApi = {
  // GET /students (Paginated list with filters)
  getAll: (params?: StudentQueryParams) => api.get<PaginatedResponse<any>>("/students", { params }),

  // 1. GET /students/:id
  getStudent: (id: string) => api.get<any>(`/students/${id}`),

  // 2. PATCH /students/:id
  updateStudent: (id: string, data: UpdateStudentPayload) => api.patch<any>(`/students/${id}`, data),

  // 3. GET /students/:id/overview
  getOverview: (id: string) => api.get<any>(`/students/${id}/overview`),

  // 4. GET /students/:id/applications
  getApplications: (id: string) => api.get<any>(`/students/${id}/applications`),

  // 5. GET /students/:id/documents
  getDocuments: (id: string) => api.get<any>(`/students/${id}/documents`),

  // 6. GET /students/:id/payments
  getPayments: (id: string) => api.get<any>(`/students/${id}/payments`),

  // 7. GET /students/:id/timeline
  getTimeline: (id: string) => api.get<any>(`/students/${id}/timeline`),

  // 8. GET /students/:id/activity
  getActivity: (id: string) => api.get<any>(`/students/${id}/activity`),

  // 9. GET /students/:id/counselor
  getCounselor: (id: string) => api.get<any>(`/students/${id}/counselor`),

  // 10. GET /students/:id/notes
  getNotes: (id: string) => api.get<any>(`/students/${id}/notes`),

  // POST /students/:id/notes
  createNote: (id: string, data: CreateNotePayload) => api.post<any>(`/students/${id}/notes`, data),

  // 11. GET /students/:id/support
  getSupport: (id: string) => api.get<any>(`/students/${id}/support`),

  // 12. GET /students/:id/analytics
  getAnalytics: (id: string) => api.get<any>(`/students/${id}/analytics`),

  // 13. GET /students/:id/communication
  getCommunication: (id: string) => api.get<any>(`/students/${id}/communication`),

  // POST /students/:id/communication
  createCommunication: (id: string, data: CreateCommunicationPayload) => api.post<any>(`/students/${id}/communication`, data),

  // 14. POST /students/:id/assign-counselor
  assignCounselor: (id: string, data: AssignCounselorPayload) => api.post<any>(`/students/${id}/assign-counselor`, data),

  // 15. POST /students/:id/send-notification
  sendNotification: (id: string, data: SendNotificationPayload) => api.post<any>(`/students/${id}/send-notification`, data),

  // 16. POST /students/:id/export
  exportProfile: (id: string) => api.post<any>(`/students/${id}/export`),
};
