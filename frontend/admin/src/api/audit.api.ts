import api from "./axios";

export interface AuditQueryParams {
  skip?: number;
  limit?: number;
}

export const auditApi = {
  findAll: (params?: AuditQueryParams) => 
    api.get("/audit", { params }),
};
