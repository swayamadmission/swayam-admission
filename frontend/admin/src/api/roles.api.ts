import api from "./axios";

export interface RoleQueryParams {
  search?: string;
  department?: string;
  isActive?: boolean;
  status?: string;
  isProtected?: boolean;
  isSystem?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  level?: number;
  priority?: number;
  department?: string;
  departmentId?: string;
  parentRoleId?: string;
  isActive?: boolean;
  selfRegistrable?: boolean;
  approvalRequired?: boolean;
  status?: 'ACTIVE' | 'DISABLED' | 'LOCKED' | 'ARCHIVED';
  isProtected?: boolean;
  dataScope?: 'GLOBAL' | 'DEPARTMENT' | 'TEAM' | 'REGION' | 'STATE' | 'DISTRICT' | 'ASSIGNED' | 'SELF';
  roleType?: string;
  stateRestricted?: boolean;
  permissionCodes?: string[];
  permissionsMatrix?: Record<string, Record<string, boolean>>;
  states?: string[];
  restrictions?: Record<string, any>;
  policies?: Record<string, any>;
}

export interface GovernanceRequest {
  id: string;
  actionType: string;
  targetRoleId?: string;
  targetRole?: { id: string; name: string; slug: string; isProtected: boolean; status: string };
  payload?: any;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requestedById?: string;
  requestedBy?: { id: string; fullName: string; email: string; role: string };
  approvedById?: string;
  approvedBy?: { id: string; fullName: string; email: string; role: string };
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  executedAt?: string;
}

export const rolesApi = {
  getStats: () => api.get("/roles/stats"),

  getHierarchy: () => api.get("/roles/hierarchy"),

  previewReparent: (roleId: string, newParentRoleId?: string) =>
    api.get("/roles/hierarchy/preview-reparent", {
      params: { roleId, newParentRoleId },
    }),

  getAuditLogs: (roleId?: string) =>
    api.get("/roles/audit", { params: { roleId } }),

  getPermissions: () => api.get("/roles/permissions/all"),

  getGovernanceRequests: (status?: string) =>
    api.get("/roles/governance/requests", { params: { status } }),

  createGovernanceRequest: (data: {
    actionType: string;
    targetRoleId?: string;
    payload?: any;
    reason: string;
  }) => api.post("/roles/governance/requests", data),

  approveGovernanceRequest: (id: string) =>
    api.post(`/roles/governance/requests/${id}/approve`),

  rejectGovernanceRequest: (id: string, reason: string) =>
    api.post(`/roles/governance/requests/${id}/reject`, { reason }),

  getRoles: (params?: RoleQueryParams) => api.get("/roles", { params }),

  getRole: (id: string) => api.get(`/roles/${id}`),

  createRole: (data: CreateRoleDto) => api.post("/roles", data),

  cloneRole: (id: string, name?: string) => api.post("/roles/clone", { id, name }),

  updateRole: (id: string, data: Partial<CreateRoleDto>) => api.patch(`/roles/${id}`, data),

  updatePermissionsMatrix: (id: string, matrix: Record<string, Record<string, boolean>>) =>
    api.patch(`/roles/${id}/permissions`, { matrix }),

  reparentRole: (id: string, parentRoleId: string | null) =>
    api.post(`/roles/${id}/reparent`, { parentRoleId }),

  disableRole: (id: string, reason?: string) =>
    api.post(`/roles/${id}/disable`, { reason }),

  enableRole: (id: string) => api.post(`/roles/${id}/enable`),

  lockRole: (id: string, reason: string) =>
    api.post(`/roles/${id}/lock`, { reason }),

  unlockRole: (id: string) => api.post(`/roles/${id}/unlock`),

  archiveRole: (id: string, reason?: string) =>
    api.post(`/roles/${id}/archive`, { reason }),

  assignUser: (id: string, userId: string) =>
    api.post(`/roles/${id}/users`, { userId }),

  removeUser: (id: string, userId: string) =>
    api.delete(`/roles/${id}/users/${userId}`),

  deleteRole: (id: string) => api.delete(`/roles/${id}`),
};
