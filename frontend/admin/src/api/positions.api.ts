import api from './axios';

export interface PositionItem {
  id: string;
  code: string;
  title: string;
  description?: string;
  companyEmail: string;
  emailStatus: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'RETIRED';
  positionStatus: 'ACTIVE' | 'VACANT' | 'SUSPENDED' | 'RETIRED';
  isMultiHolder: boolean;
  selfServicePasswordReset: boolean;
  department?: { id: string; name: string; code: string };
  unit?: { id: string; name: string; code: string };
  role?: { id: string; name: string; slug: string; color?: string };
  state?: { id: string; name: string; code: string };
  district?: { id: string; name: string; code: string };
  isVacant: boolean;
  totalHistoricalHolders?: number;
  createdAt: string;
  currentHolder?: {
    assignmentId: string;
    joinedAt: string;
    mailboxHandoverStatus: string;
    user: {
      id: string;
      fullName: string;
      employeeId?: string;
      email: string;
      mobile: string;
      avatar?: string;
      status: string;
      isActive: boolean;
    };
  } | null;
  historicalHolders?: any[];
}

export const positionsApi = {
  getPositions: async (params?: {
    search?: string;
    departmentId?: string;
    unitId?: string;
    roleId?: string;
    stateId?: string;
    districtId?: string;
    positionStatus?: string;
    emailStatus?: string;
    vacantOnly?: boolean;
  }) => {
    const response = await api.get('/positions', { params });
    return response.data as PositionItem[];
  },

  getPositionById: async (id: string) => {
    const response = await api.get(`/positions/${id}`);
    return response.data;
  },

  createPosition: async (data: {
    title: string;
    code?: string;
    description?: string;
    departmentId: string;
    unitId?: string;
    roleId?: string;
    companyEmail?: string;
    stateId?: string;
    districtId?: string;
    isMultiHolder?: boolean;
    selfServicePasswordReset?: boolean;
  }) => {
    const response = await api.post('/positions', data);
    return response.data;
  },

  updatePosition: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      departmentId?: string;
      unitId?: string;
      roleId?: string;
      stateId?: string;
      districtId?: string;
      positionStatus?: string;
      emailStatus?: string;
      selfServicePasswordReset?: boolean;
    },
  ) => {
    const response = await api.put(`/positions/${id}`, data);
    return response.data;
  },

  assignEmployee: async (
    id: string,
    data: {
      userId: string;
      reason?: string;
      notes?: string;
      forcePasswordChange?: boolean;
    },
  ) => {
    const response = await api.post(`/positions/${id}/assign`, data);
    return response.data;
  },

  transferEmployee: async (
    id: string,
    data: {
      targetPositionId: string;
      reason?: string;
      notes?: string;
    },
  ) => {
    const response = await api.post(`/positions/${id}/transfer`, data);
    return response.data;
  },

  retirePosition: async (id: string, reason?: string) => {
    const response = await api.post(`/positions/${id}/retire`, { reason });
    return response.data;
  },

  previewEmail: async (data: {
    roleSlug: string;
    stateCode?: string;
    districtName?: string;
    departmentCode?: string;
  }) => {
    const response = await api.post('/positions/preview-email', data);
    return response.data as { generatedEmail: string };
  },
};
