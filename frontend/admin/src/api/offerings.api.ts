import api from "./axios";

export interface FeeComponent {
  name: string;
  amount: number;
  description?: string;
  isOptional?: boolean;
}

export interface CollegeOffering {
  id: string;
  collegeId: string;
  courseId: string;
  branchId?: string;
  academicSession: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'FULL' | 'CLOSED' | 'SUSPENDED' | 'ARCHIVED';
  totalSeats: number;
  reservedSeats: number;
  availableSeats: number;
  consumedSeats: number;
  waitlistCount: number;
  tuitionFee: number;
  admissionFee: number;
  examFee: number;
  hostelFee: number;
  transportFee: number;
  otherCharges: number;
  totalFee: number;
  currency: string;
  feeComponents?: FeeComponent[];
  eligibilityCriteria?: string;
  minQualification?: string;
  minPercentage?: number;
  scholarshipRules?: any;
  submissionDate?: string;
  approvedAt?: string;
  approvedById?: string;
  changeReason?: string;
  createdAt: string;
  updatedAt: string;
  college?: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string;
    logo?: string;
    status: string;
    verified: boolean;
  };
  course?: {
    id: string;
    name: string;
    slug: string;
    level: string;
    category?: string;
    duration?: number;
    durationType?: string;
  };
  branch?: {
    id: string;
    name: string;
    code?: string;
    slug?: string;
    type?: string;
  };
  _count?: {
    applications?: number;
  };
}

export interface SeatMatrixResponse {
  success: boolean;
  data: {
    offerings: CollegeOffering[];
    summary: {
      totalSeats: number;
      availableSeats: number;
      reservedSeats: number;
      consumedSeats: number;
      waitlistCount: number;
    };
  };
}

export interface OfferingsQueryParams {
  collegeId?: string;
  courseId?: string;
  branchId?: string;
  academicSession?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const offeringsApi = {
  findOfferings: (params?: OfferingsQueryParams) =>
    api.get<{ success: boolean; data: CollegeOffering[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      "/colleges/offerings",
      { params }
    ),

  findPublicOfferings: (params?: OfferingsQueryParams) =>
    api.get<{ success: boolean; data: CollegeOffering[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      "/colleges/offerings/public",
      { params }
    ),

  findById: (id: string) =>
    api.get<{ success: boolean; data: CollegeOffering }>(`/colleges/offerings/${id}`),

  getSeatMatrix: (collegeId: string, academicSession?: string) =>
    api.get<SeatMatrixResponse>(`/colleges/offerings/matrix/${collegeId}`, {
      params: { academicSession },
    }),

  create: (data: Partial<CollegeOffering>) =>
    api.post<{ success: boolean; data: CollegeOffering }>("/colleges/offerings", data),

  update: (id: string, data: Partial<CollegeOffering> & { changeReason?: string }) =>
    api.patch<{ success: boolean; data: CollegeOffering }>(`/colleges/offerings/${id}`, data),

  submit: (id: string) =>
    api.post<{ success: boolean; data: CollegeOffering; message: string }>(`/colleges/offerings/${id}/submit`),

  approve: (id: string) =>
    api.post<{ success: boolean; data: CollegeOffering; message: string }>(`/colleges/offerings/${id}/approve`),

  close: (id: string) =>
    api.post<{ success: boolean; data: CollegeOffering; message: string }>(`/colleges/offerings/${id}/close`),
};
