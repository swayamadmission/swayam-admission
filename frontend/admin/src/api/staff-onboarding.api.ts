import api from './axios';

export interface StaffRegistrationItem {
  id: string;
  userId: string;
  requestedRoleSlug: string;
  requestedPositionId?: string;
  requestedStateId?: string;
  requestedDistrictId?: string;
  referralCode?: string;
  personalEmail: string;
  personalMobile: string;
  fullName: string;
  kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  mobileVerifiedAt?: string;
  emailVerifiedAt?: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  assignedPositionId?: string;
  assignedRoleId?: string;
  assignedDepartmentId?: string;
  submittedAt: string;
  reviewedAt?: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    mobile: string;
    personalEmail?: string;
    personalMobile?: string;
    status: string;
    isActive: boolean;
    isApproved: boolean;
    kycStatus: string;
    selfServicePasswordReset: boolean;
    staffKycDocuments?: any[];
    positionAssignments?: any[];
  };
  requestedPosition?: { id: string; code: string; title: string; companyEmail: string };
  assignedPosition?: { id: string; code: string; title: string; companyEmail: string };
  assignedRole?: { id: string; name: string; slug: string };
  assignedDepartment?: { id: string; name: string; code: string };
  requestedState?: { id: string; name: string; code: string };
  requestedDistrict?: { id: string; name: string; code: string };
  reviewedBy?: { id: string; fullName: string; email: string };
}

export const staffOnboardingApi = {
  getAllowedRoles: async () => {
    const response = await api.get('/staff-onboarding/allowed-roles');
    return response.data as {
      id: string;
      name: string;
      slug: string;
      description?: string;
      color?: string;
    }[];
  },

  register: async (data: {
    fullName: string;
    personalEmail: string;
    personalMobile: string;
    password: string;
    requestedRoleSlug: string;
    requestedStateId?: string;
    requestedDistrictId?: string;
    referralCode?: string;
    city?: string;
  }) => {
    const response = await api.post('/staff-onboarding/register', data);
    return response.data;
  },

  verifyOtp: async (data: {
    type: 'mobile' | 'email';
    identifier: string;
    otp: string;
  }) => {
    const response = await api.post('/staff-onboarding/verify-otp', data);
    return response.data;
  },

  uploadKyc: async (data: {
    userId: string;
    documentType: string;
    documentNumber?: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }) => {
    const response = await api.post('/staff-onboarding/upload-kyc', data);
    return response.data;
  },

  changePasswordFirstLogin: async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const response = await api.post(
      '/staff-onboarding/change-password-first-login',
      data,
    );
    return response.data;
  },

  getRequests: async (params?: {
    page?: number;
    limit?: number;
    approvalStatus?: string;
    kycStatus?: string;
    roleSlug?: string;
    stateId?: string;
    search?: string;
  }) => {
    const response = await api.get('/staff-onboarding/requests', { params });
    return response.data as {
      data: StaffRegistrationItem[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    };
  },

  getRequestById: async (id: string) => {
    const response = await api.get(`/staff-onboarding/requests/${id}`);
    return response.data as StaffRegistrationItem;
  },

  verifyKyc: async (
    requestId: string,
    data: {
      action: 'APPROVE' | 'REJECT';
      documentId?: string;
      rejectionReason?: string;
    },
  ) => {
    const response = await api.post(
      `/staff-onboarding/requests/${requestId}/kyc-verify`,
      data,
    );
    return response.data;
  },

  approveStaff: async (
    requestId: string,
    data: {
      departmentId: string;
      unitId?: string;
      roleId?: string;
      positionId?: string;
      stateId?: string;
      districtId?: string;
      companyEmail?: string;
      temporaryPassword?: string;
      forcePasswordChange?: boolean;
    },
  ) => {
    const response = await api.post(
      `/staff-onboarding/requests/${requestId}/approve`,
      data,
    );
    return response.data;
  },

  rejectStaff: async (requestId: string, data: { reason: string }) => {
    const response = await api.post(
      `/staff-onboarding/requests/${requestId}/reject`,
      data,
    );
    return response.data;
  },

  resignStaff: async (
    userId: string,
    data: { reason?: string; handoverNotes?: string },
  ) => {
    const response = await api.post(
      `/staff-onboarding/staff/${userId}/resign`,
      data,
    );
    return response.data;
  },

  adminPasswordReset: async (
    userId: string,
    data: {
      reason: string;
      customReason?: string;
      temporaryPassword?: string;
      forcePasswordChange?: boolean;
    },
  ) => {
    const response = await api.post(
      `/staff-onboarding/staff/${userId}/admin-password-reset`,
      data,
    );
    return response.data as {
      message: string;
      temporaryPassword: string;
      mustChangePassword: boolean;
      sessionVersion: number;
    };
  },

  adminPasswordChange: async (
    userId: string,
    data: {
      newPassword: string;
      reason: string;
      customReason?: string;
    },
  ) => {
    const response = await api.post(
      `/staff-onboarding/staff/${userId}/admin-password-change`,
      data,
    );
    return response.data;
  },

  revokeSessions: async (userId: string, reason: string) => {
    const response = await api.post(
      `/staff-onboarding/staff/${userId}/revoke-sessions`,
      { reason },
    );
    return response.data;
  },

  lockAccount: async (userId: string, reason: string) => {
    const response = await api.post(`/staff-onboarding/staff/${userId}/lock`, {
      reason,
    });
    return response.data;
  },

  unlockAccount: async (userId: string) => {
    const response = await api.post(
      `/staff-onboarding/staff/${userId}/unlock`,
      {},
    );
    return response.data;
  },

  disableAccount: async (userId: string, reason: string) => {
    const response = await api.post(
      `/staff-onboarding/staff/${userId}/disable`,
      { reason },
    );
    return response.data;
  },

  enableAccount: async (userId: string) => {
    const response = await api.post(
      `/staff-onboarding/staff/${userId}/enable`,
      {},
    );
    return response.data;
  },
};
