import api from "./axios";

export const recommendationApi = {
  getHomepage: () => 
    api.get<any>("/recommendation/homepage"),
    
  getMatchScore: (collegeId: string) => 
    api.get<any>(`/recommendation/match-score/${collegeId}`),
};
