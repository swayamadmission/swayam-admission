import api from "./axios";

export interface AuditLogQuery {
  search?: string;
  module?: string;
  action?: string;
  severity?: string;
  status?: string;
  userId?: string;
  roleId?: string;
  entityType?: string;
  entityId?: string;
  positionId?: string;
  targetUserId?: string;
  requestId?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  securityOnly?: boolean;
}

export interface AuditLogItem {
  id: string;
  module: string;
  action: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;

  userId?: string;
  roleId?: string;
  positionId?: string;
  positionCode?: string;
  companyEmail?: string;
  targetUserId?: string;
  userName?: string;
  email?: string;
  avatar?: string;

  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  operatingSystem?: string;
  deviceType?: string;
  requestMethod?: string;
  endpoint?: string;
  sessionId?: string;
  requestId?: string;
  executionTime?: number;

  severity: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "CRITICAL" | "SECURITY" | "SYSTEM";
  status: "SUCCESS" | "FAILED" | "PENDING" | "CANCELLED" | "ROLLBACK";

  oldData?: any;
  newData?: any;
  oldValue?: any;
  newValue?: any;
  changes?: {
    added?: Record<string, any>;
    removed?: Record<string, any>;
    updated?: Record<string, { from: any; to: any }>;
  };

  country?: string;
  state?: string;
  city?: string;

  createdAt: string;
}

export const activityLogsApi = {
  getLogs: (params?: AuditLogQuery) => api.get("/audit", { params }),

  getStats: () => api.get("/audit/stats"),

  getSecurityLogs: (params?: AuditLogQuery) => api.get("/audit/security", { params }),

  getErrorLogs: (params?: AuditLogQuery) => api.get("/audit/errors", { params }),

  getEntityTimeline: (entityType: string, entityId: string) =>
    api.get(`/audit/entity/${entityType}/${entityId}`),

  getLog: (id: string) => api.get(`/audit/${id}`),

  exportLogs: (params?: AuditLogQuery, format: "csv" | "json" = "csv") =>
    api.get("/audit/export", { params: { ...params, format }, responseType: format === "csv" ? "blob" : "json" }),

  archiveLogs: () => api.post("/audit/archive"),

  restoreLogs: () => api.post("/audit/restore"),
};

