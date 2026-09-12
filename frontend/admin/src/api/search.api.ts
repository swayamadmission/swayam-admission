import api from "./axios";

export interface SearchResultItem {
  id: string;
  name?: string;
  fullName?: string;
  title?: string;
  email?: string;
  mobile?: string;
  city?: string;
  state?: string;
  status?: string;
  type: "colleges" | "courses" | "students" | "leads" | "applications" | "counselors" | "exams" | "scholarships" | "blogs" | "studyMaterials";
  [key: string]: any;
}

export interface SearchResponse {
  students?: any[];
  leads?: any[];
  applications?: any[];
  counselors?: any[];
  colleges?: any[];
  courses?: any[];
  exams?: any[];
  scholarships?: any[];
  blogs?: any[];
  studyMaterials?: any[];
  [key: string]: any[] | undefined;
}

export const searchApi = {
  search: async (q: string, type: string = "ALL"): Promise<SearchResponse> => {
    const res = await api.get<SearchResponse>("/search", {
      params: { q, type },
    });
    return res.data;
  },

  getSuggestions: async (q: string): Promise<any> => {
    const res = await api.get("/search/suggestions", {
      params: { q },
    });
    return res.data;
  },
};
