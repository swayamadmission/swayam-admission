import api from "./axios";

export interface ContactEnquirySubmission {
  fullName: string;
  mobile: string;
  subject: string;
  category: string;
  email?: string;
  message?: string;
  consent?: boolean;
  department?: string;
}

export interface DepartmentContactItem {
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
}

export interface ContactPageSettings {
  pageHeading: string;
  pageSubheading: string;
  helpdeskBadge: string;
  officeHours: string;
  workingDays: string;
  holidayNotice: string;
  expectedResponseTime: string;
  address: string;
  googleMapsUrl: string;
}

export interface PublicContactResponse {
  brand: {
    brandName: string;
    tagline: string;
    brandPromise: string;
    primaryColor: string;
    accentColor: string;
    socialHandle: string;
    logo?: string | null;
  };
  pageSettings: ContactPageSettings;
  departments: DepartmentContactItem[];
  contacts?: any[];
  businessHours: {
    officeHours: string;
    workingDays: string;
    holidayNotice: string;
    expectedResponseTime: string;
    address: string;
    googleMapsUrl: string;
  };
  socials: Record<string, string>;
  categories: string[];
}

export const contactApi = {
  getPublicContactData: () => api.get<PublicContactResponse>("/contact/public"),
  submitEnquiry: (data: ContactEnquirySubmission) =>
    api.post<{ success: boolean; referenceNo: string; message: string }>("/contact/enquire", data),
};
