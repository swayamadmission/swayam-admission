import api from "./axios";

export interface College {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: string;
  logo?: string;
  banner?: string;
  establishedYear?: number;
  ownership?: string;
  type?: string;
  university?: string;
  accreditation?: string;
  approvals?: string[];
  ranking?: number;
  nirfRanking?: number;
  naacGrade?: string;
  city: string;
  state: string;
  address?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  placementPercentage?: number;
  highestPackage?: number;
  averagePackage?: number;
  hostelAvailable?: boolean;
  transportAvailable?: boolean;
  scholarshipAvailable?: boolean;
  applicationFee?: number;
  featured?: boolean;
  verified?: boolean;
  status: string;
  seoTitle?: string;
  seoDescription?: string;
  gallery?: any[];
  faqs?: any[];
  courses?: any[];
  _count?: {
    applications?: number;
  }
}

export interface CollegeQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  state?: string;
  city?: string;
  ownership?: string;
  type?: string;
  budgetMin?: number;
  budgetMax?: number;
  placementMin?: number;
  hostel?: boolean;
  approval?: string;
  naacGrade?: string;
  featured?: boolean;
  status?: string;
}

export interface CollegeDashboardStats {
  totalColleges: number;
  statesCovered: number;
  featuredColleges: number;
  activeColleges: number;
  totalStudentsEnrolled: number;
  averageRating: string | number;
  governmentCount: number;
  privateCount: number;
  deemedCount: number;
  autonomousCount: number;
}

export interface CollegeStaff {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  designation?: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  userRoles?: Array<{
    role: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

export interface CollegeDocument {
  id: string;
  collegeId: string;
  type: string;
  title: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
}

export interface CollegeChangeRequest {
  id: string;
  collegeId: string;
  offeringId?: string;
  requestType: string;
  title: string;
  description?: string;
  currentData?: any;
  proposedData: any;
  status: string;
  reviewRemarks?: string;
  createdAt: string;
  college?: { id: string; name: string };
  offering?: {
    course?: { name: string };
    branch?: { name: string };
  };
}

export interface CollegePortalMetricsResponse {
  success: boolean;
  data: {
    college: {
      id: string;
      name: string;
      slug: string;
      status: string;
      verified: boolean;
      logo?: string;
      city: string;
      state: string;
      email?: string;
      phone?: string;
    };
    metrics: {
      totalApplications: number;
      newApplications: number;
      underReview: number;
      correctionRequired: number;
      approved: number;
      rejected: number;
      paymentPending: number;
      admissionConfirmed: number;
      reportingPending: number;
      reportingCompleted: number;
      enrolled: number;
      activeOfferingsCount: number;
      seatAccounting: {
        totalSeats: number;
        availableSeats: number;
        consumedSeats: number;
        reservedSeats: number;
      };
    };
  };
}

export const collegesApi = {
  getStats: () =>
    api.get<CollegeDashboardStats>("/colleges/dashboard/stats"),

  findAll: (params?: CollegeQueryParams) => 
    api.get<{ data: College[], total: number, page: number, limit: number }>("/colleges", { params }),

  findById: (id: string) => 
    api.get<College>(`/colleges/${id}`),

  create: (data: Partial<College>) =>
    api.post<College>("/colleges", data),

  update: (id: string, data: Partial<College>) =>
    api.patch<College>(`/colleges/${id}`, data),

  delete: (id: string) =>
    api.delete(`/colleges/${id}`),

  verify: (id: string) =>
    api.post<{ success: boolean; data: College; message: string }>(`/colleges/${id}/verify`),

  activate: (id: string) =>
    api.post<{ success: boolean; data: College; message: string }>(`/colleges/${id}/activate`),

  suspend: (id: string, reason?: string) =>
    api.post<{ success: boolean; data: College; message: string }>(`/colleges/${id}/suspend`, { reason }),

  getPortalMetrics: (id: string) =>
    api.get<CollegePortalMetricsResponse>(`/colleges/${id}/portal-metrics`),

  getStaff: (id: string) =>
    api.get<{ success: boolean; data: CollegeStaff[] }>(`/colleges/${id}/staff`),

  inviteStaff: (id: string, data: { fullName: string; email: string; mobile: string; roleSlug?: string; designation?: string; password?: string }) =>
    api.post<{ success: boolean; data: any; message: string }>(`/colleges/${id}/staff`, data),

  updateStaffStatus: (id: string, staffUserId: string, isActive: boolean) =>
    api.patch<{ success: boolean; data: any }>(`/colleges/${id}/staff/${staffUserId}/status`, { isActive }),

  getDocuments: (id: string) =>
    api.get<{ success: boolean; data: CollegeDocument[] }>(`/colleges/${id}/documents`),

  uploadDocument: (id: string, data: { type: string; title: string; fileName: string; fileUrl: string; mimeType: string; fileSize?: number; validFrom?: string; validUntil?: string }) =>
    api.post<{ success: boolean; data: CollegeDocument }>(`/colleges/${id}/documents`, data),

  deleteDocument: (id: string, docId: string) =>
    api.delete<{ success: boolean; message: string }>(`/colleges/${id}/documents/${docId}`),

  getChangeRequests: (collegeId?: string) =>
    api.get<{ success: boolean; data: CollegeChangeRequest[] }>(`/colleges/change-requests`, { params: { collegeId } }),

  submitChangeRequest: (id: string, data: { offeringId?: string; requestType: string; title: string; description?: string; currentData?: any; proposedData: any }) =>
    api.post<{ success: boolean; data: CollegeChangeRequest; message: string }>(`/colleges/${id}/change-requests`, data),

  reviewChangeRequest: (requestId: string, data: { status: 'APPROVED' | 'REJECTED'; remarks?: string }) =>
    api.post<{ success: boolean; data: any; message: string }>(`/colleges/change-requests/${requestId}/review`, data),
};

