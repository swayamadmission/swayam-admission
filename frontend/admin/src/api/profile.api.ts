import api from "./axios";

export interface UserProfileResponse {
  user: {
    id: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    displayName?: string;
    username?: string;
    email: string;
    mobile: string;
    alternatePhone?: string;
    role: string;
    isApproved: boolean;
    gender?: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    designation?: string;
    department?: string;
    employeeId?: string;
    bio?: string;
    experience?: string;
    qualification?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    timezone?: string;
    language?: string;
    avatar?: string;
    coverImage?: string;
    signature?: string;
    joiningDate?: string;
    lastLogin?: string;
    lastSeen?: string;
    status?: string;
    isActive?: boolean;
    isVerified?: boolean;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    twoFactorEnabled?: boolean;
    backupCodes?: string[];
    preferences?: any;
    socialLinks?: any;
    emergencyContact?: any;
    createdAt: string;
    updatedAt: string;
  };
  completionPercentage: number;
  stats: {
    assignedLeads: number;
    myApplications: number;
    counseledApplications: number;
    documentsCount: number;
    supportTicketsCount: number;
    studentsManaged: number;
    admissionsConfirmed: number;
    totalRevenue: number;
    pendingTasksCount: number;
  };
}

export const profileApi = {
  getProfile: () => api.get("/profile"),

  updateProfile: (data: any) => api.patch("/profile", data),

  updateAvatar: (avatar: string) => api.patch("/profile/avatar", { avatar }),

  deleteAvatar: () => api.post("/profile/delete-avatar"),

  updateCover: (coverImage: string) => api.patch("/profile/cover", { coverImage }),

  updateSignature: (signature: string) => api.patch("/profile/signature", { signature }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch("/profile/password", data),

  updateEmail: (email: string) => api.patch("/profile/email", { email }),

  updateMobile: (mobile: string) => api.patch("/profile/mobile", { mobile }),

  updatePreferences: (preferences: any) => api.patch("/profile/preferences", { preferences }),

  toggleTwoFactor: (enable: boolean) => api.patch("/profile/2fa", { enable }),

  getLoginHistory: () => api.get("/profile/login-history"),

  getDevices: () => api.get("/profile/devices"),

  deleteDevice: (id: string) => api.delete(`/profile/device/${id}`),

  logoutAllDevices: () => api.post("/profile/logout-all"),

  getActivity: () => api.get("/profile/activity"),

  exportProfile: (format: string = "json") => api.get("/profile/export", { params: { format } }),
};
