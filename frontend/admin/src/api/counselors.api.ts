import api from './axios';

export interface CounselorQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  isApproved?: string;
  department?: string;
  state?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const counselorsApi = {
  getAll: (params?: CounselorQueryParams) =>
    api.get<any>('/counselors', { params }),

  getById: (id: string) =>
    api.get<any>(`/counselors/${id}`),

  create: (data: any) =>
    api.post<any>('/counselors', data),

  update: (id: string, data: any) =>
    api.patch<any>(`/counselors/${id}`, data),

  delete: (id: string) =>
    api.delete<any>(`/counselors/${id}`),

  getStats: () =>
    api.get<any>('/counselors/stats'),

  getPerformance: (counselorId?: string) =>
    api.get<any>('/counselors/performance', { params: { counselorId } }),

  getRevenue: (counselorId?: string) =>
    api.get<any>('/counselors/revenue', { params: { counselorId } }),

  getCommission: (counselorId?: string) =>
    api.get<any>('/counselors/commission', { params: { counselorId } }),

  getActivity: (counselorId?: string) =>
    api.get<any>('/counselors/activity', { params: { counselorId } }),

  getStudents: (counselorId?: string) =>
    api.get<any>('/counselors/students', { params: { counselorId } }),

  getLeads: (counselorId?: string) =>
    api.get<any>('/counselors/leads', { params: { counselorId } }),

  getApplications: (counselorId?: string) =>
    api.get<any>('/counselors/applications', { params: { counselorId } }),

  getDashboard: () =>
    api.get<any>('/counselors/dashboard'),

  assignStudent: (data: { counselorId: string; studentId: string; remarks?: string }) =>
    api.post<any>('/counselors/assign/student', data),

  assignLead: (data: { counselorId: string; leadId: string; remarks?: string }) =>
    api.post<any>('/counselors/assign/lead', data),

  assignApplication: (data: { counselorId: string; applicationId: string; remarks?: string }) =>
    api.post<any>('/counselors/assign/application', data),

  unassign: (data: { studentId?: string; leadId?: string; applicationId?: string; remarks?: string }) =>
    api.post<any>('/counselors/unassign', data),

  reassign: (data: {
    oldCounselorId: string;
    newCounselorId: string;
    studentId?: string;
    leadId?: string;
    applicationId?: string;
    remarks?: string;
  }) => api.post<any>('/counselors/reassign', data),
};
