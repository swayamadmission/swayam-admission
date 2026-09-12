import api from "./axios";

export const reportingEnrollmentApi = {
  getReportingByApplication: (applicationId: string) =>
    api.get(`/reporting-enrollment/application/${applicationId}`),

  submitReporting: (applicationId: string, data: any) =>
    api.post(`/reporting-enrollment/application/${applicationId}/submit`, data),

  getQueue: (params?: any) =>
    api.get("/reporting-enrollment/queue", { params }),

  claimReporting: (id: string) =>
    api.post(`/reporting-enrollment/${id}/claim`),

  requestCorrection: (id: string, data: { correctionReason: string; publicCorrectionReason?: string }) =>
    api.post(`/reporting-enrollment/${id}/request-correction`, data),

  verifyReporting: (id: string, data: { verificationSource?: string; verificationRemarks?: string }) =>
    api.post(`/reporting-enrollment/${id}/verify`, data),

  confirmEnrollment: (applicationId: string, data?: { remarks?: string }) =>
    api.post(`/reporting-enrollment/application/${applicationId}/confirm-enrollment`, data || {}),

  getStudentEnrollments: (studentId: string) =>
    api.get(`/reporting-enrollment/student/${studentId}/enrollments`),
};
