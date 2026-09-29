import api from './axios';

export interface ModerationQueueItem {
  id: string;
  rating: number;
  title?: string;
  content?: string;
  comment?: string;
  isVerifiedStudent?: boolean;
  status: string;
  moderationReason?: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
  student?: {
    id: string;
    fullName: string;
    email: string;
    mobile?: string;
  };
  counselor?: {
    id: string;
    fullName: string;
    email: string;
  };
  college?: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
  application?: {
    id: string;
    applicationNumber: string;
    status: string;
  };
  enrollment?: {
    id: string;
    enrollmentNumber: string;
  };
  moderatedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
  category?: string;
  severity?: string;
  description?: string;
  evidenceUrl?: string;
}

export interface RankingEditionItem {
  id: string;
  year: number;
  title: string;
  algorithmVersion: string;
  status: 'DRAFT' | 'DATA_COLLECTION' | 'SURVEY_ACTIVE' | 'ANALYSIS' | 'REPORT_GENERATED' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  weightsConfig: any;
  minReviewThreshold: number;
  dataCutoffDate?: string;
  dataCollectionStart?: string;
  dataCollectionEnd?: string;
  surveyStart?: string;
  surveyEnd?: string;
  reviewStart?: string;
  reviewEnd?: string;
  analysisStart?: string;
  reportGeneratedAt?: string;
  calculatedAt?: string;
  approvedAt?: string;
  publishedAt?: string;
  calculatedBy?: { id: string; fullName: string; email: string };
  approvedBy?: { id: string; fullName: string; email: string };
  publishedBy?: { id: string; fullName: string; email: string };
  methodology?: { id: string; version: string; name: string };
  _count?: { results: number; surveys?: number; dataPoints?: number; annualReports?: number };
}

export interface PillarBreakdown {
  academicExcellence: number;
  placementCareer: number;
  studentDemandExperience: number;
  infrastructureCampus: number;
  locationConnectivity: number;
  hostelLivingExperience: number;
  dailyConvenienceScore: number;
  safetyHealthcare: number;
  affordabilityRoi: number;
  trustTransparency: number;
}

export interface CollegeRankingResultItem {
  id: string;
  rank: number;
  score: number;
  percentile?: number;
  tier?: string;
  confidenceScore: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  pillarScores?: PillarBreakdown;
  factorBreakdown?: PillarBreakdown;
  rawMetrics?: Record<string, any>;
  normalizedMetrics?: Record<string, any>;
  previousRank?: number;
  rankChange?: number;
  scoreChange?: number;
  movement?: 'IMPROVED' | 'DECLINED' | 'STABLE' | 'NEW_ENTRY';
  specialBadges?: string[];
  strengths?: string[];
  gaps?: string[];
  verifiedReviewCount: number;
  averageReviewRating?: number;
  dataProvenance?: Record<string, string>;
  college: {
    id: string;
    name: string;
    city: string;
    state: string;
    logo?: string;
    ownership?: string;
    naacGrade?: string;
    nirfRanking?: number;
    establishedYear?: number;
    averagePackage?: number;
    highestPackage?: number;
  };
}

export interface StudentReportItem {
  id: string;
  studentId: string;
  collegeId: string;
  rankingYear: number;
  title?: string;
  detailedReview?: string;
  evidenceUrls?: string[];
  isVerifiedStudent: boolean;
  status: 'PENDING' | 'VERIFIED' | 'PUBLISHED' | 'REJECTED' | 'FLAGGED' | 'ARCHIVED';
  academicRating?: number;
  placementRating?: number;
  studentDemandRating?: number;
  infrastructureRating?: number;
  connectivityRating?: number;
  hostelLivingRating?: number;
  dailyConvenienceRating?: number;
  safetyHealthcareRating?: number;
  affordabilityRoiRating?: number;
  trustTransparencyRating?: number;
  overallRating: number;
  moderatedAt?: string;
  moderationReason?: string;
  createdAt: string;
  student?: { id: string; fullName: string; email: string; mobile?: string };
  college?: { id: string; name: string; city: string; state: string };
  course?: { id: string; name: string };
  application?: { id: string; status: string; applicationNumber?: string };
  moderatedBy?: { id: string; fullName: string; email: string };
}

export interface SurveyItem {
  id: string;
  rankingYear: number;
  templateName: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  overallScore?: number;
  scheduledDate?: string;
  conductedAt?: string;
  submittedAt?: string;
  reviewNotes?: string;
  college: { id: string; name: string; city: string; state: string; logo?: string };
  surveyor?: { id: string; fullName: string; email: string };
  reviewedBy?: { id: string; fullName: string; email: string };
  responses?: any[];
  _count?: { responses: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface RankingMethodologyItem {
  id: string;
  version: string;
  title: string;
  description?: string;
  isActive: boolean;
  academicExcellenceWeight: number;
  placementCareerWeight: number;
  studentDemandExperienceWeight: number;
  infraCampusWeight: number;
  locationConnectivityWeight: number;
  hostelLivingWeight: number;
  safetyHealthcareWeight: number;
  affordabilityRoiWeight: number;
  trustTransparencyWeight: number;
  createdAt: string;
}

export interface RankingCycleItem {
  id: string;
  year: number;
  status: string;
  dataCollectionStart?: string;
  dataCollectionEnd?: string;
  surveyStart?: string;
  surveyEnd?: string;
  reviewStart?: string;
  reviewEnd?: string;
  publicationDate?: string;
  createdAt: string;
}

export type StudentCollegeReportItem = StudentReportItem;
export type RankingSurveyItem = SurveyItem;
export type RankingVerificationItem = DataPointItem;

export interface RankingAnnualReportItem {
  id: string;
  year: number;
  rankingYear: number;
  title: string;
  version: string;
  reportVersion: number;
  methodologyVersion: string;
  status: string;
  executiveSummary?: string;
  methodologySummary?: string;
  keyFindings?: any[];
  limitations?: string;
  sections: any;
  fullReportJson?: any;
  generatedBy: string | { id: string; fullName: string; email: string };
  generatedAt: string;
  approvedBy?: string | { id: string; fullName: string; email: string };
  approvedAt?: string;
  publishedAt?: string;
}

export interface DataPointItem {
  id: string;
  collegeId: string;
  rankingYear: number;
  pillar: string;
  metricKey: string;
  metricName: string;
  rawValue: string;
  normalizedValue: number;
  sourceType: string;
  evidenceUrl?: string;
  status: 'PENDING' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'FLAGGED' | 'EXPIRED';
  confidenceWeight: number;
  collectedAt: string;
  verifiedAt?: string;
  verifierNotes?: string;
  createdAt?: string;
  college: { id: string; name: string; city: string; state: string; logo?: string };
  verifiedBy?: { id: string; fullName: string; email: string };
}

export const reviewsRankingApi = {
  // Moderation
  getModerationQueue: async (params: {
    type?: 'college' | 'counselor' | 'complaints';
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get('/reviews/moderation/queue', { params });
    return res.data;
  },

  moderateCollegeReview: async (
    id: string,
    payload: { action: 'APPROVE' | 'REJECT' | 'HIDE' | 'FLAG'; reason?: string },
  ) => {
    const res = await api.post(`/reviews/${id}/moderate-college`, payload);
    return res.data;
  },

  moderateCounselorReview: async (
    id: string,
    payload: { action: 'APPROVE' | 'REJECT' | 'HIDE' | 'FLAG'; reason?: string },
  ) => {
    const res = await api.post(`/reviews/${id}/moderate-counselor`, payload);
    return res.data;
  },

  // Ranking Editions & Lifecycle
  getRankingEditions: async () => {
    const res = await api.get('/rankings/editions');
    return res.data;
  },

  getEditionDetails: async (
    year: number,
    params?: { tier?: string; state?: string; search?: string; page?: number; limit?: number },
  ) => {
    const res = await api.get(`/rankings/edition/${year}`, { params });
    return res.data;
  },

  calculateRanking: async (payload: {
    year: number;
    title?: string;
    algorithmVersion?: string;
    weightsConfig?: any;
    minReviewThreshold?: number;
    dataCutoffDate?: string;
  }) => {
    const res = await api.post('/rankings/calculate', payload);
    return res.data;
  },

  approveRankingEdition: async (year: number, payload?: { remarks?: string }) => {
    const res = await api.post(`/rankings/edition/${year}/approve`, payload || {});
    return res.data;
  },

  publishRankingEdition: async (year: number) => {
    const res = await api.post(`/rankings/edition/${year}/publish`, {});
    return res.data;
  },

  unpublishRankingEdition: async (year: number, payload?: { unpublishReason?: string }) => {
    const res = await api.post(`/rankings/edition/${year}/unpublish`, payload || {});
    return res.data;
  },

  // Special Rankings
  getSpecialRankingsAdmin: async (year: number, type: string, params?: any) => {
    const res = await api.get(`/rankings/edition/${year}/special/${type}`, { params });
    return res.data;
  },

  // Ranking Cycles
  getCycles: async () => {
    const res = await api.get('/rankings/cycles');
    return res.data;
  },

  createCycle: async (payload: any) => {
    const data = {
      ...payload,
      title: payload.title || `Swayam National Ranking Cycle ${payload.year}`,
    };
    const res = await api.post('/rankings/cycles', data);
    return res.data;
  },

  updateCycle: async (year: number, payload: any) => {
    const res = await api.put(`/rankings/cycles/${year}`, payload);
    return res.data;
  },

  // Methodology
  getActiveMethodology: async () => {
    const res = await api.get('/rankings/methodology/active');
    return res.data;
  },

  getMethodologyVersions: async () => {
    const res = await api.get('/rankings/methodology/versions');
    return res.data;
  },

  createMethodologyVersion: async (payload: any) => {
    const res = await api.post('/rankings/methodology/versions', payload);
    return res.data;
  },

  activateMethodologyVersion: async (id: string) => {
    const res = await api.post(`/rankings/methodology/${id}/activate`, {});
    return res.data;
  },

  // Student Reports Moderation
  getStudentReportsAdmin: async (params?: any) => {
    const res = await api.get('/rankings/student-reports/admin', { params });
    return res.data;
  },

  moderateStudentReport: async (id: string, payload: { action: string; reason?: string }) => {
    const res = await api.post(`/rankings/student-reports/${id}/moderate`, payload);
    return res.data;
  },

  // Surveys
  getSurveys: async (params?: any) => {
    const res = await api.get('/rankings/surveys', { params });
    return res.data;
  },

  getSurveyDetail: async (id: string) => {
    const res = await api.get(`/rankings/surveys/${id}`);
    return res.data;
  },

  createSurvey: async (payload: any) => {
    const res = await api.post('/rankings/surveys', payload);
    return res.data;
  },

  submitSurveyResponses: async (id: string, payload: { responses: any[] }) => {
    const res = await api.post(`/rankings/surveys/${id}/responses`, payload);
    return res.data;
  },

  reviewSurvey: async (id: string, payload: { action: string; reviewNotes?: string }) => {
    const res = await api.post(`/rankings/surveys/${id}/review`, payload);
    return res.data;
  },

  // Verification Queue
  getVerificationQueue: async (params?: any) => {
    const res = await api.get('/rankings/verification/queue', { params });
    return res.data;
  },

  getVerificationStats: async (year?: number) => {
    const res = await api.get('/rankings/verification/stats', { params: { year } });
    return res.data;
  },

  createDataPoint: async (payload: any) => {
    const res = await api.post('/rankings/verification/datapoints', payload);
    return res.data;
  },

  verifyDataPoint: async (id: string, payload: { action: string; verifierNotes?: string }) => {
    const res = await api.post(`/rankings/verification/${id}`, payload);
    return res.data;
  },

  // Annual Research Reports
  generateAnnualReport: async (payload: { rankingYear?: number; year?: number; title?: string }) => {
    const rankingYear = Number(payload.rankingYear || payload.year);
    const res = await api.post('/rankings/annual-reports/generate', {
      ...payload,
      rankingYear,
    });
    return res.data;
  },

  getAnnualReport: async (year: number) => {
    const res = await api.get(`/rankings/annual-reports/${year}`);
    const report = res.data?.data || res.data;
    if (!report || !report.id) return { data: null };
    const normalized: RankingAnnualReportItem = {
      ...report,
      year: report.rankingYear || report.year,
      rankingYear: report.rankingYear || report.year,
      version: report.reportVersion ? `v${report.reportVersion}.0` : (report.version || report.methodologyVersion || 'v1.0.0'),
      reportVersion: report.reportVersion || 1,
      methodologyVersion: report.methodologyVersion || 'v1.0.0',
      title: report.title || `Swayam Admission National College Ranking & Research Report ${report.rankingYear || year}`,
      generatedBy: typeof report.generatedBy === 'object' ? (report.generatedBy?.fullName || report.generatedBy?.email || 'Swayam Admission Research Council') : (report.generatedBy || 'Swayam Admission Research Council'),
      approvedBy: typeof report.approvedBy === 'object' ? (report.approvedBy?.fullName || report.approvedBy?.email || 'Swayam Admission Board') : report.approvedBy,
      executiveSummary: report.executiveSummary || report.fullReportJson?.section2_ExecutiveSummary?.summary || 'Annual executive research intelligence summary.',
      methodologySummary: report.methodologySummary || report.fullReportJson?.section3_Methodology?.description || 'The 9-pillar deterministic ranking methodology framework.',
      sections: {
        executiveSummary: report.executiveSummary || report.fullReportJson?.section2_ExecutiveSummary?.summary || 'Annual executive research intelligence summary.',
        methodologyNotes: report.methodologySummary || report.fullReportJson?.section3_Methodology?.description || 'The 9-pillar deterministic ranking methodology framework.',
        studentVoiceSummary: report.fullReportJson?.section8_StudentVoice?.sentimentSummary || 'Empirical student sentiment and verified review telemetry.',
        surveyFindings: report.fullReportJson?.section9_SwayamSurveyFindings?.summary || 'Comprehensive on-ground audit and infrastructure telemetry across campuses.',
        yearOverYearTrends: report.fullReportJson?.section10_YearOverYearTrends?.analysis || 'Longitudinal institutional performance trajectories across academic years.',
      },
    };
    return { success: true, data: normalized };
  },

  approveAnnualReport: async (year: number, payload?: { remarks?: string }) => {
    const res = await api.post(`/rankings/annual-reports/${year}/approve`, payload || {});
    return res.data;
  },

  publishAnnualReport: async (yearOrId: any) => {
    const res = await api.post(`/rankings/annual-reports/${yearOrId}/publish`, {});
    return res.data;
  },

  getAnnualReports: async (params?: { year?: number }) => {
    if (!params?.year) return { data: [] };
    try {
      const res = await api.get(`/rankings/annual-reports/${params.year}`);
      const report = res.data?.data || res.data;
      if (!report || !report.id) return { data: [] };
      const normalized: RankingAnnualReportItem = {
        ...report,
        year: report.rankingYear || report.year,
        rankingYear: report.rankingYear || report.year,
        version: report.reportVersion ? `v${report.reportVersion}.0` : (report.version || report.methodologyVersion || 'v1.0.0'),
        reportVersion: report.reportVersion || 1,
        methodologyVersion: report.methodologyVersion || 'v1.0.0',
        title: report.title || `Swayam Admission National College Ranking & Research Report ${report.rankingYear || params.year}`,
        generatedBy: typeof report.generatedBy === 'object' ? (report.generatedBy?.fullName || report.generatedBy?.email || 'Swayam Admission Research Council') : (report.generatedBy || 'Swayam Admission Research Council'),
        approvedBy: typeof report.approvedBy === 'object' ? (report.approvedBy?.fullName || report.approvedBy?.email || 'Swayam Admission Board') : report.approvedBy,
        executiveSummary: report.executiveSummary || report.fullReportJson?.section2_ExecutiveSummary?.summary || 'Annual executive research intelligence summary.',
        methodologySummary: report.methodologySummary || report.fullReportJson?.section3_Methodology?.description || 'The 9-pillar deterministic ranking methodology framework.',
        sections: {
          executiveSummary: report.executiveSummary || report.fullReportJson?.section2_ExecutiveSummary?.summary || 'Annual executive research intelligence summary.',
          methodologyNotes: report.methodologySummary || report.fullReportJson?.section3_Methodology?.description || 'The 9-pillar deterministic ranking methodology framework.',
          studentVoiceSummary: report.fullReportJson?.section8_StudentVoice?.sentimentSummary || 'Empirical student sentiment and verified review telemetry.',
          surveyFindings: report.fullReportJson?.section9_SwayamSurveyFindings?.summary || 'Comprehensive on-ground audit and infrastructure telemetry across campuses.',
          yearOverYearTrends: report.fullReportJson?.section10_YearOverYearTrends?.analysis || 'Longitudinal institutional performance trajectories across academic years.',
        },
      };
      return { data: [normalized] };
    } catch {
      return { data: [] };
    }
  },

  getOverviewStats: async (year: number) => {
    try {
      const res = await api.get(`/rankings/edition/${year}`);
      const results = res.data?.results || [];
      return {
        data: {
          totalEvaluated: results.length,
          verifiedReportsCount: results.reduce((acc: number, r: any) => acc + (r.verifiedReviewCount || 0), 0),
          surveysCompleted: res.data?.edition?._count?.surveys || 0,
        },
      };
    } catch {
      return { data: { totalEvaluated: 0, verifiedReportsCount: 0, surveysCompleted: 0 } };
    }
  },

  getMethodologies: async () => {
    const res = await api.get('/rankings/methodology/versions');
    return res.data;
  },

  createMethodology: async (payload: any) => {
    const res = await api.post('/rankings/methodology/versions', payload);
    return res.data;
  },

  getStudentReports: async (params?: any) => {
    const res = await api.get('/rankings/student-reports/admin', { params });
    return res.data;
  },

  verifyStudentReport: async (id: string, payload: { status: string; adminNotes?: string }) => {
    const res = await api.post(`/rankings/student-reports/${id}/moderate`, {
      action: payload.status,
      reason: payload.adminNotes,
    });
    return res.data;
  },

  approveSurvey: async (id: string) => {
    const res = await api.post(`/rankings/surveys/${id}/review`, { action: 'APPROVE' });
    return res.data;
  },

  processVerification: async (id: string, payload: { status: string; notes?: string }) => {
    const res = await api.post(`/rankings/verification/${id}`, {
      action: payload.status,
      verifierNotes: payload.notes,
    });
    return res.data;
  },

  getSpecialRankings: async (year: number, type: string, limit: number = 50) => {
    const res = await api.get(`/rankings/edition/${year}/special/${type}`, { params: { limit } });
    const payload = res.data?.data || res.data;
    const results = Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload)
      ? payload
      : [];
    return {
      success: true,
      data: results,
      edition: payload?.edition || null,
      specialType: payload?.specialType || type,
      meta: res.data?.meta || { total: results.length },
    };
  },
};
