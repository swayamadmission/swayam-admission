import api from "./axios";

export interface StateItem {
  id: string;
  name: string;
  code: string;
  type?: string;
  status?: string;
  heroImage?: string;
  description?: string;
  region?: string;
  popularCourses?: string[];
  collegesCount?: number;
  districtsCount?: number;
  examsCount?: number;
  scholarshipsCount?: number;
  updatesCount?: number;
}

export interface DistrictItem {
  id: string;
  name: string;
  code?: string;
  stateId: string;
  collegesCount?: number;
}

export interface StateDetailResponse {
  id: string;
  name: string;
  code: string;
  type: string;
  status?: string;
  region?: string;
  heroImage?: string;
  description?: string;
  popularCourses?: string[];
  districts: DistrictItem[];
  collegesCount: number;
  governmentColleges?: number;
  privateColleges?: number;
  scholarshipsCount?: number;
  examsCount?: number;
  districtsCount: number;
  updatesCount?: number;
}

export interface PincodeValidationResult {
  isValid: boolean;
  message: string;
  state?: string;
  district?: string;
}

export const geographyApi = {
  getStates: async (): Promise<StateItem[]> => {
    const res = await api.get<StateItem[]>("/geography/states");
    return res.data;
  },

  getStateDetail: async (slugOrId: string): Promise<StateDetailResponse> => {
    const res = await api.get<StateDetailResponse>(`/geography/states/detail/${slugOrId}`);
    return res.data;
  },

  getStateUpdates: async (slugOrId: string) => {
    const res = await api.get<any[]>(`/geography/states/${slugOrId}/updates`);
    return res.data;
  },

  getDistricts: async (stateId: string): Promise<DistrictItem[]> => {
    if (!stateId) return [];
    const res = await api.get<DistrictItem[]>(`/geography/states/${stateId}/districts`);
    return res.data;
  },

  validate: async (stateId: string, districtId: string) => {
    const res = await api.get<{ isValid: boolean; district?: any; state?: any }>(
      "/geography/validate",
      { params: { stateId, districtId } }
    );
    return res.data;
  },

  validatePincode: async (
    stateId: string,
    districtId: string,
    pincode: string
  ): Promise<PincodeValidationResult> => {
    const res = await api.get<PincodeValidationResult>(
      "/geography/validate-pincode",
      { params: { stateId, districtId, pincode } }
    );
    return res.data;
  },
};

