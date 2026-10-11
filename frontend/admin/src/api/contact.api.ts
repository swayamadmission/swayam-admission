import api from "./axios";

export interface DepartmentContact {
  id: string;
  name: string;
  badge?: string | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  officeHours?: string | null;
  workingDays?: string | null;
  address?: string | null;
  ctaText?: string | null;
  ctaAction?: string | null;
  ctaUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactDirectoryEntry {
  id: string;
  title: string;
  department: string;
  contactType: string;
  value: string;
  label?: string | null;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  isVerified: boolean;
  isPublished: boolean;
  businessHours?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactEnquiryItem {
  id: string;
  referenceNo: string;
  fullName: string;
  email?: string | null;
  mobile: string;
  category: string;
  subject: string;
  message?: string | null;
  status: "NEW" | "IN_REVIEW" | "IN_PROGRESS" | "ASSIGNED" | "RESOLVED" | "CLOSED";
  assignedDepartment?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  ipAddress?: string | null;
  adminNotes?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignableStaff {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
  phone: string | null;
}

export interface ContactSettings {
  pageHeading?: string;
  pageSubheading?: string;
  helpdeskBadge?: string;
  officeHours: string;
  workingDays: string;
  holidayNotice: string;
  expectedResponseTime: string;
  address: string;
  googleMapsUrl: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  xUrl?: string;
  githubUrl?: string;
  redditUrl?: string;
  telegramUrl?: string;
  discordUrl?: string;
}

export const contactAdminApi = {
  // Department Contacts CRUD
  getDepartments: (params?: { search?: string; isActive?: string }) =>
    api.get<DepartmentContact[]>("/contact/admin/departments", { params }),

  createDepartment: (data: Partial<DepartmentContact>) =>
    api.post<DepartmentContact>("/contact/admin/departments", data),

  updateDepartment: (id: string, data: Partial<DepartmentContact>) =>
    api.patch<DepartmentContact>(`/contact/admin/departments/${id}`, data),

  deleteDepartment: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/contact/admin/departments/${id}`),

  reorderDepartments: (ids: string[]) =>
    api.post<{ success: boolean; message: string }>("/contact/admin/departments/reorder", { ids }),

  // Directory CRUD (backward compatibility)
  getDirectory: (params?: { department?: string; contactType?: string; search?: string }) =>
    api.get<ContactDirectoryEntry[]>("/contact/admin/directory", { params }),

  createDirectoryEntry: (data: Partial<ContactDirectoryEntry>) =>
    api.post<ContactDirectoryEntry>("/contact/admin/directory", data),

  updateDirectoryEntry: (id: string, data: Partial<ContactDirectoryEntry>) =>
    api.patch<ContactDirectoryEntry>(`/contact/admin/directory/${id}`, data),

  deleteDirectoryEntry: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/contact/admin/directory/${id}`),

  reorderDirectory: (ids: string[]) =>
    api.post<{ success: boolean; message: string }>("/contact/admin/directory/reorder", { ids }),

  // Enquiries Inbox
  getEnquiries: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    api.get<{
      items: ContactEnquiryItem[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
      summary: Record<string, number>;
    }>("/contact/admin/enquiries", { params }),

  getEnquiryById: (id: string) =>
    api.get<ContactEnquiryItem>(`/contact/admin/enquiries/${id}`),

  updateEnquiryStatus: (
    id: string,
    data: {
      status: string;
      adminNotes?: string;
      assignedDepartment?: string;
      assignedStaffId?: string;
      assignedStaffName?: string;
    },
  ) => api.patch<ContactEnquiryItem>(`/contact/admin/enquiries/${id}/status`, data),

  deleteEnquiry: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/contact/admin/enquiries/${id}`),

  getStaff: () => api.get<AssignableStaff[]>("/contact/admin/staff"),

  // Settings & Business Hours
  getSettings: () => api.get<ContactSettings>("/contact/admin/settings"),

  updateSettings: (data: Partial<ContactSettings>) =>
    api.patch<{ success: boolean; message: string; settings: ContactSettings }>(
      "/contact/admin/settings",
      data,
    ),
};
