import api from "./axios";

export interface EnterpriseAnalyticsQueryParams {
  period?:
    | "today"
    | "yesterday"
    | "7days"
    | "30days"
    | "thisMonth"
    | "lastMonth"
    | "quarter"
    | "year"
    | "custom";
  startDate?: string;
  endDate?: string;
  academicSession?: string;
  state?: string;
  district?: string;
  collegeId?: string;
  courseId?: string;
  branchId?: string;
  counselorId?: string;
  seniorCounselorId?: string;
  source?: string;
  channel?: string;
  metricKey?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SaveReportPayload {
  title: string;
  description?: string;
  reportType: string;
  filters: Record<string, any>;
  scheduleFrequency?: string;
}

export interface ExportReportPayload {
  reportType: string;
  filters?: Record<string, any>;
  format?: "CSV" | "JSON";
}

export const analyticsApi = {
  // 1. Executive Overview & KPIs
  getOverview: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/overview", { params }),

  // 2. 7-Stage Admission Funnel
  getFunnel: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/funnel", { params }),

  // 3. Counselor Performance & Workload
  getCounselors: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/counselors", { params }),

  // 4. Senior Counselor Team Rollups
  getSeniorCounselors: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/senior-counselors", { params }),

  // 5. College Performance
  getColleges: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/colleges", { params }),

  // 6. Course & Branch Demand
  getCourses: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/courses", { params }),

  // 7. Geographic Analytics (State & District Drilldown)
  getGeography: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/geography", { params }),

  // 8. Financial Collections & Reconciliation
  getFinance: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/finance", { params }),

  // 9. Operational SLA & Bottlenecks
  getSla: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/sla", { params }),

  // 10. Daily & Monthly Trends
  getTrends: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/trends", { params }),

  // 11. Record Drilldown
  getDrilldown: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/drilldown", { params }),

  // 12. Export Report (CSV)
  exportReport: (payload: ExportReportPayload) =>
    api.post("/analytics/export", payload, { responseType: "blob" }),

  // 13. Saved Reports
  getSavedReports: () => api.get("/analytics/saved-reports"),
  saveReport: (payload: SaveReportPayload) => api.post("/analytics/saved-reports", payload),
  deleteSavedReport: (id: string) => api.delete(`/analytics/saved-reports/${id}`),

  // Legacy Mappings
  getDashboard: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/dashboard", { params }),
  getRevenue: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/revenue", { params }),
  getLeads: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/leads", { params }),
  getConversions: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/conversions", { params }),
  getStudents: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/students", { params }),
  getStudentStats: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/students", { params }),
  getPaymentStats: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/payments", { params }),
  getApplicationStats: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/applications", { params }),
  getMarketingStats: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/marketing", { params }),
  getReports: (params?: EnterpriseAnalyticsQueryParams) =>
    api.get("/analytics/reports", { params }),
};
