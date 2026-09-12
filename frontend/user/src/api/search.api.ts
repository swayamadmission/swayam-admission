import api from "./axios";

export const searchApi = {
  getSuggestions: (q: string) => 
    api.get<any[]>("/search/suggestions", { params: { q } }),
    
  getTrending: () => 
    api.get<any[]>("/search/trending"),
};
