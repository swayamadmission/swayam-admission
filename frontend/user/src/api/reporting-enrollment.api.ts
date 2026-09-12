import api from "./axios";

export const reportingEnrollmentApi = {
  getReportingByApplication: (applicationId: string) =>
    api.get(`/reporting-enrollment/application/${applicationId}`),

  submitReporting: (applicationId: string, data: {
    reportingDate?: string;
    collegeCampus?: string;
    collegeReferenceNumber?: string;
    proofDocumentUrl?: string;
    proofDocumentName?: string;
    studentRemarks?: string;
  }) =>
    api.post(`/reporting-enrollment/application/${applicationId}/submit`, data),

  getStudentEnrollments: (studentId: string) =>
    api.get(`/reporting-enrollment/student/${studentId}/enrollments`),
};
