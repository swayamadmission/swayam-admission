import api from "./axios";

export interface College {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: string;
  logo?: string;
  banner?: string;
  img?: string;
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
  address?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  contactPerson?: string;
  placementPercentage?: number;
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
  totalFees?: number;
  hasHostel?: boolean;
  featured?: boolean;
  verified?: boolean;
  status?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  gallery?: Array<{
    id: string;
    imageUrl: string;
    caption?: string;
    sortOrder?: number;
    isCover?: boolean;
  }>;
  galleries?: Array<{
    id: string;
    imageUrl: string;
    caption?: string;
    sortOrder?: number;
    isCover?: boolean;
  }>;
  studyMaterials?: Array<{
    id: string;
    title: string;
    subject?: string;
    stream?: string;
    fileUrl: string;
    downloads?: number;
  }>;
  courses?: Array<{
    id: string;
    name: string;
    duration: string;
    seats?: number;
    totalFees?: number;
    semesterFees?: number;
    applicationFee?: number;
    fees?: string | number;
    level?: string;
    eligibility?: string;
    scholarshipInfo?: string;
    status?: string;
    branches?: any[];
  }>;
  StudyMaterial?: Array<{
    id: string;
    title: string;
    slug: string;
    materialType: string;
    category: string;
    subject?: string;
    fileUrl?: string;
    downloadCount?: number;
    premium?: boolean;
  }>;
  _count?: {
    applications?: number;
    courses?: number;
    gallery?: number;
    StudyMaterial?: number;
  };
}

export interface CollegeQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  state?: string;
  city?: string;
  type?: string;
  featured?: boolean;
  budgetMin?: number;
  budgetMax?: number;
  placementMin?: number;
  ownership?: string;
  hostel?: boolean;
}

export const collegesApi = {
  findAll: (params?: CollegeQueryParams) => 
    api.get<{ data: College[]; total: number }>("/colleges", { params }),

  findById: (id: string) => 
    api.get<College>(`/colleges/${id}`),

  compare: (ids: string[]) =>
    api.get<any[]>("/colleges/compare", { params: { ids: ids.join(',') } }),
};
