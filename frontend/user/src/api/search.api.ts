import api from "./axios";

export interface SearchSuggestionItem {
  id: string;
  title: string;
  subtitle?: string;
  type:
    | 'college'
    | 'course'
    | 'study_material'
    | 'guide'
    | 'exam'
    | 'scholarship'
    | 'stream'
    | 'blog'
    | 'report'
    | 'location';
  slug?: string;
  badge?: string;
  url: string;
  meta?: any;
}

export interface SearchSuggestionsResult {
  all: SearchSuggestionItem[];
  colleges: SearchSuggestionItem[];
  courses: SearchSuggestionItem[];
  studyMaterials: SearchSuggestionItem[];
  guides: SearchSuggestionItem[];
  exams: SearchSuggestionItem[];
  scholarships: SearchSuggestionItem[];
  streams?: SearchSuggestionItem[];
  blogs?: SearchSuggestionItem[];
  reports?: SearchSuggestionItem[];
  locations: SearchSuggestionItem[];
}

export interface TrendingSearchItem {
  text: string;
  count?: number;
  type: string;
  url: string;
}

export interface TrendingContentResponse {
  searches: TrendingSearchItem[];
  colleges: SearchSuggestionItem[];
  courses: SearchSuggestionItem[];
  studyMaterials: SearchSuggestionItem[];
  guides: SearchSuggestionItem[];
  exams: SearchSuggestionItem[];
  scholarships: SearchSuggestionItem[];
  streams: string[];
  blogs?: SearchSuggestionItem[];
  reports?: SearchSuggestionItem[];
}

export interface GlobalSearchResponse {
  colleges?: any[];
  courses?: any[];
  studyMaterials?: any[];
  guides?: any[];
  exams?: any[];
  scholarships?: any[];
  streams?: any[];
  blogs?: any[];
  reports?: any[];
  locations?: any[];
}

export const searchApi = {
  getSuggestions: (q: string) => 
    api.get<SearchSuggestionsResult>("/search/suggestions", { params: { q } }),
    
  getTrending: () => 
    api.get<TrendingContentResponse>("/search/trending"),

  search: (q: string, type: string = "ALL", limit?: number) =>
    api.get<GlobalSearchResponse>("/search", { params: { q, type, limit } }),
};

