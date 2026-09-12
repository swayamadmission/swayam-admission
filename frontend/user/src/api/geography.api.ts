import api from "./axios";

export interface StateItem {
  id: string;
  name: string;
  code: string;
  type?: string;
}

export interface DistrictItem {
  id: string;
  name: string;
  code?: string;
  stateId: string;
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
