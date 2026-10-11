import api from "./axios";

export interface CollegeGallery {
  id?: string;
  collegeId?: string;
  imageUrl: string;
  caption?: string;
  sortOrder?: number;
  isCover?: boolean;
  createdAt?: string;
}

export interface College {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: string;
  logo?: string;
  banner?: string;
  brochureUrl?: string;
  establishedYear?: number;
  ownership?: string;
  type?: string;
  university?: string;
  accreditation?: string;
  approvals?: string[];
  ranking?: number;
  nirfRanking?: number;
  naacGrade?: string;
  rating?: number;
  city: string;
  state: string;
  stateId?: string;
  districtId?: string;
  stateRelation?: { id: string; name: string; code: string };
  districtRelation?: { id: string; name: string; code?: string };
  address?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  contactPerson?: string;
  description?: string;
  placementPercentage?: number;
  placementRate?: number;
  highestPackage?: number;
  averagePackage?: number;
  medianPackage?: number;
  placementCompanies?: string[];
  placementInfo?: string;
  placementYear?: string;
  hostelAvailable?: boolean;
  boysHostelAvailable?: boolean;
  girlsHostelAvailable?: boolean;
  hostelFee?: string;
  hostelFacilities?: string[];
  messInfo?: string;
  otherFacilities?: string | string[];
  transportAvailable?: boolean;
  scholarshipAvailable?: boolean;
  applicationFee?: number;
  featured?: boolean;
  verified?: boolean;
  status: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  gallery?: Array<{
    id?: string;
    collegeId?: string;
    imageUrl: string;
    caption?: string;
    sortOrder?: number;
    isCover?: boolean;
    createdAt?: string;
  }>;
  galleries?: Array<{
    id?: string;
    collegeId?: string;
    imageUrl: string;
    caption?: string;
    sortOrder?: number;
    isCover?: boolean;
    createdAt?: string;
  }>;
  faqs?: any[];
  courses?: Array<{
    id: string;
    collegeId?: string;
    name: string;
    slug?: string;
    duration: string;
    seats?: number;
    totalFees?: number;
    fees?: number;
    semesterFees?: number;
    applicationFee?: number;
    level?: string;
    degree?: string;
    category?: string;
    specialization?: string;
    eligibility?: string;
    scholarshipInfo?: string;
    status: string;
    branches?: any[];
  }>;
  StudyMaterial?: Array<{
    id: string;
    title: string;
    slug?: string;
    materialType?: string;
    category?: string;
    subject?: string;
    stream?: string;
    fileUrl?: string;
    downloads?: number;
    downloadCount?: number;
    status?: string;
  }>;
  studyMaterials?: Array<{
    id: string;
    title: string;
    slug?: string;
    materialType?: string;
    category?: string;
    subject?: string;
    stream?: string;
    fileUrl?: string;
    downloads?: number;
    downloadCount?: number;
    status?: string;
  }>;
  _count?: {
    applications?: number;
    courses?: number;
    gallery?: number;
    galleries?: number;
    StudyMaterial?: number;
    studyMaterials?: number;
  };
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

export interface BulkValidationPreviewRow {
  rowIndex: number;
  action: 'CREATE' | 'UPDATE' | 'INVALID';
  name: string;
  city: string;
  state: string;
  ownership: string;
  type: string;
  fees?: number | string;
  placementRate?: number | string;
  hasHostel: boolean;
  galleryCount: number;
  coursesCount: number;
  status: string;
  errors: string[];
  mediaStatus?: {
    logo: 'VALID' | 'MISSING' | 'INVALID';
    banner: 'VALID' | 'MISSING' | 'INVALID';
    brochure: 'VALID' | 'MISSING' | 'INVALID';
  };
  sanitizedData?: any;
}

export interface BulkValidationResponse {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  rowsToCreate: number;
  rowsToUpdate: number;
  errors: Array<{
    row: number;
    collegeName?: string;
    field: string;
    message: string;
  }>;
  previewRows: BulkValidationPreviewRow[];
}

export interface BulkImportResponse {
  totalProcessed: number;
  successfullyCreated: number;
  successfullyUpdated: number;
  skipped: number;
  failed: number;
  duplicateRecords: number;
  items: Array<{
    row: number;
    name: string;
    city: string;
    state: string;
    status: 'CREATED' | 'UPDATED' | 'SKIPPED' | 'FAILED';
    collegeId?: string;
    message?: string;
  }>;
  reportCsv: string;
}

export const collegesApi = {
  getStats: () =>
    api.get<CollegeDashboardStats>("/colleges/dashboard/stats"),

  findAll: (params?: CollegeQueryParams) => 
    api.get<{ data: College[]; total: number; page: number; limit: number }>("/colleges", { params }),

  findById: (id: string) => 
    api.get<College>(`/colleges/${id}`),

  findOne: (id: string) => 
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

  setPublishStatus: (id: string, publish: boolean | string) => {
    const isPublish = typeof publish === "boolean" ? publish : publish === "PUBLISHED";
    return api.patch<College>(`/colleges/${id}/publish`, { publish: isPublish, status: isPublish ? "PUBLISHED" : "DRAFT" });
  },

  setFeaturedStatus: (id: string, featured: boolean) =>
    api.patch<College>(`/colleges/${id}`, { featured }),

  // Bulk Import
  downloadTemplate: async (format: 'csv' | 'xlsx' = 'xlsx') => {
    const res = await api.get(`/colleges/bulk/template`, {
      params: { format },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], {
      type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swayam_colleges_bulk_template.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  validateBulkUpload: (fileOrRows: File | any[]) => {
    if (fileOrRows instanceof File) {
      const formData = new FormData();
      formData.append('file', fileOrRows);
      return api.post<{ success: boolean; data: BulkValidationResponse }>('/colleges/bulk/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post<{ success: boolean; data: BulkValidationResponse }>('/colleges/bulk/validate', { rows: fileOrRows });
  },

  executeBulkImport: (rows: any[], updateStrategy: 'UPDATE_EXISTING' | 'SKIP_EXISTING' = 'UPDATE_EXISTING') =>
    api.post<{ success: boolean; data: BulkImportResponse }>('/colleges/bulk/import', { rows, updateStrategy }),

  // Courses
  addCourse: (collegeId: string, data: any) =>
    api.post(`/colleges/${collegeId}/courses`, data),

  updateCourse: (courseId: string, data: any) =>
    api.patch(`/colleges/courses/${courseId}`, data),

  deleteCourse: (courseId: string) =>
    api.delete(`/colleges/courses/${courseId}`),

  // Media & Uploads
  uploadMedia: (
    collegeId: string,
    file: File,
    type: 'logo' | 'banner' | 'brochure' | 'gallery',
    extra?: { caption?: string; isCover?: boolean },
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (extra?.caption) formData.append('caption', extra.caption);
    if (extra?.isCover !== undefined) formData.append('isCover', String(extra.isCover));
    return api.post<{ success: boolean; url: string; type: string }>(`/colleges/${collegeId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Gallery
  addGalleryImage: (collegeId: string, data: { imageUrl: string; caption?: string; sortOrder?: number; isCover?: boolean }) =>
    api.post(`/colleges/${collegeId}/gallery`, data),

  updateGalleryImage: (collegeId: string, imageId: string, data: { caption?: string; sortOrder?: number; isCover?: boolean }) =>
    api.patch(`/colleges/${collegeId}/gallery/${imageId}`, data),

  deleteGalleryImage: (collegeId: string, imageId: string) =>
    api.delete(`/colleges/${collegeId}/gallery/${imageId}`),

  // Study Materials
  getStudyMaterials: (collegeId: string) =>
    api.get(`/colleges/${collegeId}/study-materials`),

  linkStudyMaterial: (collegeId: string, materialId: string) =>
    api.post(`/colleges/${collegeId}/study-materials/link`, { materialId }),

  unlinkStudyMaterial: (collegeId: string, materialId: string) =>
    api.delete(`/colleges/${collegeId}/study-materials/${materialId}`),

  // Portal & IAM
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
