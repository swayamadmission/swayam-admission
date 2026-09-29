import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy,
  Award,
  Sparkles,
  CheckCircle2,
  Globe,
  Sliders,
  Calendar,
  Layers,
  Search,
  ArrowUpDown,
  FileCheck2,
  Archive,
  BarChart3,
  ShieldCheck,
  Building2,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  MapPin,
  Users,
  Download,
  RefreshCw,
  Plus,
  BookOpen,
  Compass,
} from 'lucide-react';
import { collegesApi } from '../../api/colleges.api';
import {
  reviewsRankingApi,
  RankingEditionItem,
  CollegeRankingResultItem,
  RankingMethodologyItem,
  RankingCycleItem,
  StudentCollegeReportItem,
  RankingSurveyItem,
  RankingVerificationItem,
  RankingAnnualReportItem,
} from '../../api/reviews-ranking.api';
import { formatIndianDate, formatIndianDateTime } from '../../utils/date.utils';

// Defensive helper to prevent 'Objects are not valid as a React child'
const getActorName = (actor: any): string => {
  if (!actor) return 'Swayam Admission Research Board';
  if (typeof actor === 'string') return actor;
  return actor.fullName || actor.name || actor.email || 'Swayam Admission Admin';
};

// Defensive helper to ensure report sections never render raw JSON objects into React tree
const getSectionText = (val: any, fallback = 'No verified data available for this section.'): string => {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (typeof val.summary === 'string') return val.summary;
    if (typeof val.statement === 'string') return val.statement;
    if (typeof val.description === 'string') return val.description;
    if (Array.isArray(val.keyHighlights)) return val.keyHighlights.join('; ');
    try {
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  return String(val);
};

type TabType =
  | 'overview'
  | 'rankings'
  | 'methodology'
  | 'cycles'
  | 'student_reports'
  | 'surveys'
  | 'verification'
  | 'annual_reports'
  | 'special_rankings';

export const CollegeRankingAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpecialType, setSelectedSpecialType] = useState<string>('BEST_ACADEMIC');
  const [selectedCollegeDetail, setSelectedCollegeDetail] = useState<CollegeRankingResultItem | null>(null);

  // Modals state
  const [showCalcModal, setShowCalcModal] = useState<boolean>(false);
  const [showCycleModal, setShowCycleModal] = useState<boolean>(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState<boolean>(false);
  const [showSurveyModal, setShowSurveyModal] = useState<boolean>(false);
  const [showReportGenModal, setShowReportGenModal] = useState<boolean>(false);
  const [viewingReport, setViewingReport] = useState<RankingAnnualReportItem | null>(null);

  // Form states
  const [calcYear, setCalcYear] = useState<number>(currentYear);
  const [calcMethodologyVersion, setCalcMethodologyVersion] = useState<string>('v1.0.0');

  // Cycle form state
  const [cycleForm, setCycleForm] = useState({
    year: currentYear,
    title: `Swayam Admission National Ranking Cycle ${currentYear}`,
    dataCollectionStart: `${currentYear}-01-01`,
    dataCollectionEnd: `${currentYear}-06-30`,
    surveyStart: `${currentYear}-03-01`,
    surveyEnd: `${currentYear}-07-31`,
    reviewStart: `${currentYear}-08-01`,
    reviewEnd: `${currentYear}-08-31`,
    notes: '',
  });

  // Methodology form state
  const [methForm, setMethForm] = useState({
    version: 'v1.1.0',
    title: 'Swayam Admission Nine-Pillar Standard Methodology',
    academicExcellenceWeight: 0.15,
    placementCareerWeight: 0.10,
    studentDemandExperienceWeight: 0.20,
    infraCampusWeight: 0.15,
    locationConnectivityWeight: 0.10,
    hostelLivingWeight: 0.10,
    safetyHealthcareWeight: 0.05,
    affordabilityRoiWeight: 0.05,
    trustTransparencyWeight: 0.10,
    description: '',
  });

  // Survey form state
  const [surveyForm, setSurveyForm] = useState({
    collegeId: '',
    year: currentYear,
    surveyorName: '',
    surveyorRole: 'Swayam Admission Senior Field Auditor',
    notes: '',
  });

  // Report gen form state
  const [reportGenForm, setReportGenForm] = useState({
    year: currentYear,
    title: `Swayam Admission National College Ranking & Research Report ${currentYear}`,
    author: 'Swayam Admission Research Governance Board',
  });

  // ================= QUERIES =================
  const { data: statsRes } = useQuery({
    queryKey: ['ranking_overview_stats', selectedYear],
    queryFn: () => reviewsRankingApi.getOverviewStats(selectedYear),
  });

  const { data: editionsRes } = useQuery({
    queryKey: ['ranking_editions'],
    queryFn: () => reviewsRankingApi.getRankingEditions(),
  });

  const { data: detailsRes, isLoading: isRankingLoading } = useQuery({
    queryKey: ['ranking_edition_details', selectedYear, tierFilter, searchQuery],
    queryFn: () =>
      reviewsRankingApi.getEditionDetails(selectedYear, {
        tier: tierFilter === 'all' ? undefined : tierFilter,
        search: searchQuery.trim() || undefined,
      }),
  });

  const { data: cyclesRes } = useQuery({
    queryKey: ['ranking_cycles'],
    queryFn: () => reviewsRankingApi.getCycles(),
    enabled: activeTab === 'cycles' || activeTab === 'overview',
  });

  const { data: methodologiesRes } = useQuery({
    queryKey: ['ranking_methodologies'],
    queryFn: () => reviewsRankingApi.getMethodologies(),
    enabled: activeTab === 'methodology' || showCalcModal,
  });

  const { data: studentReportsRes, isLoading: isReportsLoading } = useQuery({
    queryKey: ['ranking_student_reports', selectedYear],
    queryFn: () => reviewsRankingApi.getStudentReports({ year: selectedYear }),
    enabled: activeTab === 'student_reports',
  });

  const { data: surveysRes, isLoading: isSurveysLoading } = useQuery({
    queryKey: ['ranking_surveys', selectedYear],
    queryFn: () => reviewsRankingApi.getSurveys({ year: selectedYear }),
    enabled: activeTab === 'surveys',
  });

  const { data: verifRes, isLoading: isVerifLoading } = useQuery({
    queryKey: ['ranking_verification_queue'],
    queryFn: () => reviewsRankingApi.getVerificationQueue({ status: 'PENDING' }),
    enabled: activeTab === 'verification',
  });

  const { data: annualReportsRes, isLoading: isAnnualReportsLoading } = useQuery({
    queryKey: ['ranking_annual_reports', selectedYear],
    queryFn: () => reviewsRankingApi.getAnnualReports({ year: selectedYear }),
    enabled: activeTab === 'annual_reports',
  });

  const { data: specialRankingsRes, isLoading: isSpecialLoading } = useQuery({
    queryKey: ['ranking_special', selectedYear, selectedSpecialType],
    queryFn: () => reviewsRankingApi.getSpecialRankings(selectedYear, selectedSpecialType, 50),
    enabled: activeTab === 'special_rankings',
  });

  const { data: collegesRes } = useQuery({
    queryKey: ['colleges_for_ranking_survey'],
    queryFn: () => collegesApi.findAll({ limit: 100 }),
    enabled: showSurveyModal,
  });
  const availableColleges = (collegesRes?.data as any)?.data || [];

  // ================= MUTATIONS =================
  const calculateMutation = useMutation({
    mutationFn: (payload: any) => reviewsRankingApi.calculateRanking(payload),
    onSuccess: (data) => {
      setSelectedYear(calcYear);
      queryClient.invalidateQueries({ queryKey: ['ranking_editions'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_edition_details'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_overview_stats'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_special'] });
      setShowCalcModal(false);
      alert(data.message || 'Official 9-pillar ranking calculated successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Calculation failed');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (year: number) => reviewsRankingApi.approveRankingEdition(year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_editions'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_edition_details'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_overview_stats'] });
      alert(`Edition ${selectedYear} approved successfully!`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Approval failed');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (year: number) => reviewsRankingApi.publishRankingEdition(year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_editions'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_edition_details'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_overview_stats'] });
      alert(`🎉 Official Swayam College Rankings ${selectedYear} PUBLISHED!`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Publishing failed');
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (year: number) =>
      reviewsRankingApi.unpublishRankingEdition(year, { unpublishReason: 'Administrative revision' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_editions'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_edition_details'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_overview_stats'] });
      alert(`Edition ${selectedYear} archived.`);
    },
  });

  const createCycleMutation = useMutation({
    mutationFn: (payload: any) => reviewsRankingApi.createCycle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_cycles'] });
      setShowCycleModal(false);
      alert('Annual ranking cycle registered successfully');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Unable to create ranking cycle. Please verify that the year does not already exist and dates are valid.');
    },
  });

  const createMethodologyMutation = useMutation({
    mutationFn: (payload: any) => reviewsRankingApi.createMethodology(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_methodologies'] });
      setShowMethodologyModal(false);
      alert('Methodology version created successfully');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to create methodology'),
  });

  const activateMethodologyMutation = useMutation({
    mutationFn: (id: string) => reviewsRankingApi.activateMethodologyVersion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_methodologies'] });
      alert('Methodology version activated.');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to activate methodology'),
  });

  const verifyStudentReportMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      reviewsRankingApi.verifyStudentReport(id, { status, adminNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_student_reports'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_overview_stats'] });
      alert('Student report moderation updated.');
    },
  });

  const createSurveyMutation = useMutation({
    mutationFn: (payload: any) => reviewsRankingApi.createSurvey(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_surveys'] });
      setShowSurveyModal(false);
      alert('Manual survey scheduled.');
    },
  });

  const approveSurveyMutation = useMutation({
    mutationFn: (id: string) => reviewsRankingApi.approveSurvey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_surveys'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_overview_stats'] });
      alert('Survey approved and verified data promoted to ranking dataset.');
    },
  });

  const processVerifMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      reviewsRankingApi.processVerification(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_verification_queue'] });
      queryClient.invalidateQueries({ queryKey: ['ranking_overview_stats'] });
      alert('Verification record updated.');
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: (payload: any) => reviewsRankingApi.generateAnnualReport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_annual_reports'] });
      setShowReportGenModal(false);
      alert('11-Section Annual Research Report generated successfully!');
    },
  });

  const approveReportMutation = useMutation({
    mutationFn: (year: number) => reviewsRankingApi.approveAnnualReport(year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_annual_reports'] });
      alert('Annual Research Report approved for publication.');
    },
  });

  const publishReportMutation = useMutation({
    mutationFn: (year: number) => reviewsRankingApi.publishAnnualReport(year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking_annual_reports'] });
      alert('🎉 Annual Research Report Published!');
    },
  });

  const editions: RankingEditionItem[] = editionsRes?.data || [];
  const currentEdition: RankingEditionItem | undefined = detailsRes?.data?.edition;
  const results: CollegeRankingResultItem[] = detailsRes?.data?.results || [];
  const overviewStats = statsRes?.data;
  const cycles: RankingCycleItem[] = cyclesRes?.data || [];
  const methodologies: RankingMethodologyItem[] = methodologiesRes?.data || [];
  const studentReports: StudentCollegeReportItem[] = studentReportsRes?.data || [];
  const surveys: RankingSurveyItem[] = surveysRes?.data || [];
  const verifItems: RankingVerificationItem[] = verifRes?.data || [];
  const annualReports: RankingAnnualReportItem[] = annualReportsRes?.data || [];

  const rawSpecial = specialRankingsRes?.data;
  const specialRankings: any[] = Array.isArray(rawSpecial)
    ? rawSpecial
    : Array.isArray((rawSpecial as any)?.results)
    ? (rawSpecial as any).results
    : [];

  const handleRunCalculation = () => {
    calculateMutation.mutate({
      year: calcYear,
      title: `Swayam National College Rankings ${calcYear}`,
      methodologyVersion: calcMethodologyVersion,
    });
  };

  const getMovementBadge = (movement?: string, rankChange?: number) => {
    if (movement === 'IMPROVED') {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          <TrendingUp size={12} /> +{rankChange || 1}
        </span>
      );
    }
    if (movement === 'DECLINED') {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          <TrendingDown size={12} /> {rankChange || -1}
        </span>
      );
    }
    if (movement === 'NEW_ENTRY') {
      return (
        <span className="inline-flex items-center text-xs font-bold text-[#F0AE1A] bg-amber-50 px-2 py-0.5 rounded-full">
          ★ New
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
        <Minus size={12} /> Same
      </span>
    );
  };

  const getConfidenceBadge = (level?: string, score?: number) => {
    const lvl = level || (score && score >= 75 ? 'HIGH' : score && score >= 50 ? 'MEDIUM' : 'LOW');
    if (lvl === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
          <ShieldCheck size={11} /> High ({score || 85}%)
        </span>
      );
    }
    if (lvl === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
          <ShieldCheck size={11} /> Med ({score || 65}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
        <AlertTriangle size={11} /> Low ({score || 35}%)
      </span>
    );
  };

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen space-y-6 text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="text-[#F0AE1A]" size={26} />
            <h1 className="text-2xl font-black text-[#4A7B5B]">Annual College Ranking & Intelligence</h1>
          </div>
          <p className="text-sm text-slate-500">
            Official 9-Pillar Governance, Evidence Confidence, Verified Student Voice, Surveys, & Annual Research Publications.
          </p>
        </div>

        {/* Global Cycle Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCalcModal(true)}
            className="px-4 py-2.5 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Sliders size={14} /> Calculate 9-Pillar Snapshot
          </button>

          {currentEdition?.status === 'DRAFT' && (
            <button
              onClick={() => approveMutation.mutate(selectedYear)}
              disabled={approveMutation.isPending}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 size={14} /> Approve Edition
            </button>
          )}

          {(currentEdition?.status === 'APPROVED' || currentEdition?.status === 'DRAFT') && (
            <button
              onClick={() => publishMutation.mutate(selectedYear)}
              disabled={publishMutation.isPending}
              className="px-4 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Globe size={14} /> Publish Official Snapshot
            </button>
          )}

          {currentEdition?.status === 'PUBLISHED' && (
            <button
              onClick={() => unpublishMutation.mutate(selectedYear)}
              disabled={unpublishMutation.isPending}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200 transition-all flex items-center gap-1.5"
            >
              <Archive size={14} /> Archive / Unpublish
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200/80 overflow-x-auto">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
          { id: 'rankings', label: 'Official Rankings', icon: Trophy },
          { id: 'methodology', label: 'Methodology Governance', icon: Sliders },
          { id: 'cycles', label: 'Annual Cycles', icon: Calendar },
          { id: 'student_reports', label: 'Student Reports', icon: Users },
          { id: 'surveys', label: 'Swayam Surveys', icon: FileCheck2 },
          { id: 'verification', label: 'Verification Queue', icon: ShieldCheck },
          { id: 'annual_reports', label: 'Research Reports', icon: BookOpen },
          { id: 'special_rankings', label: 'Special Rankings (20)', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#4A7B5B] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Edition Year Switcher (Shown across all tabs) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase">Active Edition Year:</span>
          <div className="flex items-center gap-1.5">
            {[currentYear + 1, currentYear, currentYear - 1].map((yr) => {
              const editionExists = editions.some((e) => e.year === yr);
              return (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedYear === yr
                      ? 'bg-[#4A7B5B] text-white'
                      : editionExists
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {yr} Edition {editionExists ? '' : '(Uncalculated)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Edition Status Indicator */}
        {currentEdition ? (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">Edition Status:</span>
            <span
              className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                currentEdition.status === 'PUBLISHED'
                  ? 'bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/30'
                  : currentEdition.status === 'APPROVED'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              ● {currentEdition.status}
            </span>
            <span className="text-slate-400">
              Methodology: <strong>{currentEdition.algorithmVersion || 'v1.0.0'}</strong>
            </span>
            <span className="text-slate-400">
              Colleges Evaluated: <strong>{results.length}</strong>
            </span>
          </div>
        ) : (
          <div className="text-xs text-amber-600 font-medium">
            Edition {selectedYear} snapshot is not generated. Use "Calculate 9-Pillar Snapshot" to run.
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: OVERVIEW DASHBOARD */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
                <span>Evaluated Colleges</span>
                <Building2 size={16} className="text-[#4A7B5B]" />
              </div>
              <div className="text-2xl font-black text-slate-900">{overviewStats?.totalEvaluated ?? results.length}</div>
              <div className="text-xs text-slate-400 mt-1">Across 9 multi-dimensional pillars</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
                <span>Verified Student Reports</span>
                <Users size={16} className="text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{overviewStats?.verifiedReportsCount ?? 0}</div>
              <div className="text-xs text-slate-400 mt-1">Authenticated student admissions only</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
                <span>Completed Field Surveys</span>
                <FileCheck2 size={16} className="text-[#F0AE1A]" />
              </div>
              <div className="text-2xl font-black text-slate-900">{overviewStats?.surveysCompleted ?? 0}</div>
              <div className="text-xs text-slate-400 mt-1">On-ground Swayam auditor observations</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
                <span>Snapshot Publication State</span>
                <Globe size={16} className="text-purple-600" />
              </div>
              <div className="text-lg font-black text-slate-900 flex items-center gap-1.5 mt-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    currentEdition?.status === 'PUBLISHED' ? 'bg-[#4A7B5B]' : 'bg-amber-500'
                  }`}
                />
                {currentEdition?.status || 'NOT_STARTED'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {currentEdition?.publishedAt ? `Published ${formatIndianDate(currentEdition.publishedAt)}` : 'Unpublished'}
              </div>
            </div>
          </div>

          {/* Official 9 Pillars Structure Display */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders size={18} className="text-[#4A7B5B]" /> Official 9 Ranking Pillars (Total = 100%)
                </h3>
                <p className="text-xs text-slate-500">
                  Strict student-centric balance: Student Demand & Experience carries the highest weight (20%).
                </p>
              </div>
              <span className="px-3 py-1 bg-[#E8F3EC] text-[#4A7B5B] text-xs font-bold rounded-lg border border-[#4A7B5B]/30">
                Methodology v1.0.0 Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {[
                { name: '1. Academic Excellence', weight: '15%' },
                { name: '2. Placement & Career', weight: '10%' },
                { name: '3. Student Demand & Experience', weight: '20%' },
                { name: '4. Infrastructure & Campus', weight: '15%' },
                { name: '5. Location & Connectivity', weight: '10%' },
                { name: '6. Hostel & Living Experience', weight: '10%' },
                { name: '7. Safety & Healthcare', weight: '5%' },
                { name: '8. Affordability & ROI', weight: '5%' },
                { name: '9. Trust & Transparency', weight: '10%' },
              ].map((p, i) => (
                <div
                  key={i}
                  className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#4A7B5B]/40 transition-colors flex items-center justify-between"
                >
                  <div className="text-xs font-semibold text-slate-800">{p.name}</div>
                  <span className="px-2.5 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] text-xs font-bold rounded-full">
                    {p.weight}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: OFFICIAL RANKINGS TABLE */}
      {/* ============================================================ */}
      {activeTab === 'rankings' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search college by name or location..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-[#4A7B5B]/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-500">Tier:</span>
              {['all', 'TIER_1', 'TIER_2', 'TIER_3'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tierFilter === t ? 'bg-[#4A7B5B] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t === 'all' ? 'All Tiers' : t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {isRankingLoading ? (
              <div className="py-20 text-center text-slate-400">Loading ranking leaderboard...</div>
            ) : results.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <Trophy className="mx-auto text-slate-300" size={36} />
                <p className="text-slate-700 font-bold text-sm">No rankings found for {selectedYear}</p>
                <p className="text-xs text-slate-400">Run ranking calculation or adjust filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3.5">Rank</th>
                      <th className="px-4 py-3.5">YoY</th>
                      <th className="px-4 py-3.5">College Details</th>
                      <th className="px-4 py-3.5">Tier</th>
                      <th className="px-4 py-3.5">Score / 100</th>
                      <th className="px-4 py-3.5">Evidence Confidence</th>
                      <th className="px-4 py-3.5">9-Pillar Mini-Breakdown</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Rank */}
                        <td className="px-4 py-4 font-black text-slate-900 text-base">
                          {r.rank === 1 ? '🥇 #1' : r.rank === 2 ? '🥈 #2' : r.rank === 3 ? '🥉 #3' : `#${r.rank}`}
                        </td>

                        {/* YoY Movement */}
                        <td className="px-4 py-4">{getMovementBadge(r.movement, r.rankChange)}</td>

                        {/* College Details */}
                        <td className="px-4 py-4">
                          <div className="font-bold text-[#4A7B5B] text-sm">{r.college.name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>
                              {r.college.city}, {r.college.state}
                            </span>
                            {r.college.naacGrade && (
                              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 font-bold rounded">
                                NAAC {r.college.naacGrade}
                              </span>
                            )}
                            {r.college.nirfRanking && (
                              <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 font-bold rounded">
                                NIRF #{r.college.nirfRanking}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Tier */}
                        <td className="px-4 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                              r.tier === 'TIER_1'
                                ? 'bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/30'
                                : r.tier === 'TIER_2'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {r.tier?.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="px-4 py-4 font-bold text-slate-800 text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#4A7B5B] text-base">{r.score.toFixed(1)}</span>
                            <span className="text-[10px] text-slate-400">/ 100</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{r.percentile}% percentile</div>
                        </td>

                        {/* Evidence Confidence */}
                        <td className="px-4 py-4">{getConfidenceBadge(r.confidenceLevel, r.confidenceScore)}</td>

                        {/* Mini Pillar Scores */}
                        <td className="px-4 py-4">
                          <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[10px] text-slate-600">
                            <div>Acad: {r.pillarScores?.academicExcellence?.toFixed(1) || '—'}</div>
                            <div>Place: {r.pillarScores?.placementCareer?.toFixed(1) || '—'}</div>
                            <div className="font-bold text-[#4A7B5B]">
                              Exp: {r.pillarScores?.studentDemandExperience?.toFixed(1) || '—'}
                            </div>
                            <div>Infra: {(r.pillarScores as any)?.infraCampus?.toFixed(1) || (r.pillarScores as any)?.infrastructureCampus?.toFixed(1) || '—'}</div>
                            <div>Conn: {r.pillarScores?.locationConnectivity?.toFixed(1) || '—'}</div>
                            <div>Hostel: {(r.pillarScores as any)?.hostelLiving?.toFixed(1) || (r.pillarScores as any)?.hostelLivingExperience?.toFixed(1) || '—'}</div>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setSelectedCollegeDetail(r)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-[#4A7B5B] hover:text-white text-slate-700 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Eye size={12} /> Scorecard
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: METHODOLOGY GOVERNANCE */}
      {/* ============================================================ */}
      {activeTab === 'methodology' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80">
            <div>
              <h3 className="text-base font-bold text-slate-900">Methodology Versions & Weight Governance</h3>
              <p className="text-xs text-slate-500">
                Published snapshots are immutable and strictly point to their registered methodology version.
              </p>
            </div>
            <button
              onClick={() => setShowMethodologyModal(true)}
              className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Plus size={14} /> New Methodology Version
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {methodologies.map((m) => (
              <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-black text-[#4A7B5B] bg-[#E8F3EC] px-2 py-0.5 rounded">
                      {m.version}
                    </span>
                    <h4 className="text-base font-bold text-slate-800 mt-1">{m.title}</h4>
                    {m.createdAt && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Registered: {formatIndianDate(m.createdAt)}
                      </div>
                    )}
                  </div>
                  {m.isActive && (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500">{m.description || 'Official Swayam standard 9-pillar weighting.'}</p>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">1. Academic Excellence</span>
                    <span className="font-bold">{(m.academicExcellenceWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">2. Placement & Career</span>
                    <span className="font-bold">{(m.placementCareerWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#4A7B5B]">
                    <span>3. Student Demand & Experience</span>
                    <span>{(m.studentDemandExperienceWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">4. Infrastructure & Campus</span>
                    <span className="font-bold">{(m.infraCampusWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">5. Location & Connectivity</span>
                    <span className="font-bold">{(m.locationConnectivityWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">6. Hostel & Living</span>
                    <span className="font-bold">{(m.hostelLivingWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">7. Safety & Healthcare</span>
                    <span className="font-bold">{(m.safetyHealthcareWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">8. Affordability & ROI</span>
                    <span className="font-bold">{(m.affordabilityRoiWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">9. Trust & Transparency</span>
                    <span className="font-bold">{(m.trustTransparencyWeight * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {!m.isActive && (
                  <div className="pt-3 border-t border-slate-100">
                    <button
                      onClick={() => activateMethodologyMutation.mutate(m.id)}
                      disabled={activateMethodologyMutation.isPending}
                      className="w-full py-2 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                    >
                      {activateMethodologyMutation.isPending ? 'Activating...' : 'Activate This Version'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: ANNUAL CYCLES */}
      {/* ============================================================ */}
      {activeTab === 'cycles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80">
            <div>
              <h3 className="text-base font-bold text-slate-900">Database-Driven Annual Ranking Cycles</h3>
              <p className="text-xs text-slate-500">
                Manage cycle progression from Data Collection to Surveys, Review, and Approval.
              </p>
            </div>
            <button
              onClick={() => setShowCycleModal(true)}
              className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Plus size={14} /> New Ranking Cycle
            </button>
          </div>

          <div className="space-y-4">
            {cycles.map((c) => (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-slate-800">{c.year} Cycle</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        c.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : c.status === 'DATA_COLLECTION'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">Created {formatIndianDate(c.createdAt)}</div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                  <div>
                    <span className="text-slate-400 block">Data Collection:</span>
                    <span className="font-bold text-slate-700">
                      {c.dataCollectionStart ? formatIndianDate(c.dataCollectionStart) : 'N/A'} -{' '}
                      {c.dataCollectionEnd ? formatIndianDate(c.dataCollectionEnd) : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Surveys Window:</span>
                    <span className="font-bold text-slate-700">
                      {c.surveyStart ? formatIndianDate(c.surveyStart) : 'N/A'} -{' '}
                      {c.surveyEnd ? formatIndianDate(c.surveyEnd) : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Review Window:</span>
                    <span className="font-bold text-slate-700">
                      {c.reviewStart ? formatIndianDate(c.reviewStart) : 'N/A'} -{' '}
                      {c.reviewEnd ? formatIndianDate(c.reviewEnd) : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Publication Date:</span>
                    <span className="font-bold text-slate-700">
                      {c.publicationDate ? formatIndianDate(c.publicationDate) : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: STUDENT REPORTS */}
      {/* ============================================================ */}
      {activeTab === 'student_reports' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80">
            <h3 className="text-base font-bold text-slate-900">Student College Research Reports</h3>
            <p className="text-xs text-slate-500">
              Only reports from authenticated students with confirmed admission to the college can be verified into the
              ranking dataset.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {isReportsLoading ? (
              <div className="py-20 text-center text-slate-400">Loading student reports...</div>
            ) : studentReports.length === 0 ? (
              <div className="py-20 text-center text-slate-400">No student reports submitted for {selectedYear}.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Student & College</th>
                      <th className="px-4 py-3">Admission Eligibility</th>
                      <th className="px-4 py-3">9-Pillar Scores</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentReports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">
                            {report.student?.fullName || (report.student as any)?.name || 'Verified Student'}
                          </div>
                          <div className="text-xs text-[#4A7B5B]">{report.college?.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {report.course?.name || 'Academic Degree Program'}
                          </div>
                          {report.createdAt && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Submitted: {formatIndianDate(report.createdAt)}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {report.isVerifiedStudent ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px] border border-emerald-200 flex items-center gap-1 w-max">
                              <CheckCircle size={10} /> Confirmed Admission
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded text-[10px] border border-amber-200 flex items-center gap-1 w-max">
                              <AlertTriangle size={10} /> Unverified Enrollment
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-[11px] space-y-0.5">
                            <div>Overall: <strong>{report.overallRating} / 5.0 ★</strong></div>
                            <div className="text-slate-500">
                              Acad: {report.academicRating} | Host: {report.hostelLivingRating} | Infra: {report.infrastructureRating}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              report.status === 'VERIFIED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : report.status === 'REJECTED'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {report.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          {report.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() =>
                                  verifyStudentReportMutation.mutate({ id: report.id, status: 'VERIFIED' })
                                }
                                className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() =>
                                  verifyStudentReportMutation.mutate({ id: report.id, status: 'REJECTED' })
                                }
                                className="px-2.5 py-1 bg-red-100 text-red-700 font-bold rounded hover:bg-red-200"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: SWAYAM SURVEYS */}
      {/* ============================================================ */}
      {activeTab === 'surveys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80">
            <div>
              <h3 className="text-base font-bold text-slate-900">Swayam Manual On-Ground Research Surveys</h3>
              <p className="text-xs text-slate-500">
                Auditors inspect facilities on the same 9 official criteria. Approved surveys directly feed into ranking.
              </p>
            </div>
            <button
              onClick={() => setShowSurveyModal(true)}
              className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Plus size={14} /> Schedule New Survey
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {isSurveysLoading ? (
              <div className="py-20 text-center text-slate-400">Loading surveys...</div>
            ) : surveys.length === 0 ? (
              <div className="py-20 text-center text-slate-400">No surveys found for {selectedYear}.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">College & Template</th>
                      <th className="px-4 py-3">Auditor</th>
                      <th className="px-4 py-3">Survey Progress</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {surveys.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#4A7B5B]">{s.college?.name}</div>
                          <div className="text-[10px] text-slate-400">{s.templateName}</div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Audit Date: {formatIndianDate(s.scheduledDate || s.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-700">{s.surveyor?.fullName || (s as any).surveyorName || 'Auditor'}</div>
                          <div className="text-[10px] text-slate-400">{s.surveyor?.email || (s as any).surveyorRole || 'Field Auditor'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-600 font-medium">
                            {s.responses?.length || 0} observations recorded
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : s.status === 'SUBMITTED'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.status === 'SUBMITTED' && (
                            <button
                              onClick={() => approveSurveyMutation.mutate(s.id)}
                              className="px-3 py-1 bg-[#4A7B5B] text-white font-bold rounded-lg text-xs"
                            >
                              Approve & Promote
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 7: VERIFICATION QUEUE */}
      {/* ============================================================ */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80">
            <h3 className="text-base font-bold text-slate-900">Unified Metric Verification Queue</h3>
            <p className="text-xs text-slate-500">
              Audit and approve raw data points, NIRF certificates, and transit metrics before calculating ranking.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {isVerifLoading ? (
              <div className="py-20 text-center text-slate-400">Loading verification items...</div>
            ) : verifItems.length === 0 ? (
              <div className="py-20 text-center text-slate-400">Verification queue is completely clear.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">College & Metric</th>
                      <th className="px-4 py-3">Source Type</th>
                      <th className="px-4 py-3">Submitted Value</th>
                      <th className="px-4 py-3">Evidence</th>
                      <th className="px-4 py-3 text-right">Review Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {verifItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#4A7B5B]">{item.college?.name}</div>
                          <div className="text-[11px] text-slate-500">{item.metricName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Submitted: {formatIndianDate(item.createdAt || item.collectedAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded">
                            {item.sourceType}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{item.rawValue || (item as any).submittedValue}</td>
                        <td className="px-4 py-3">
                          {item.evidenceUrl ? (
                            <a
                              href={item.evidenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                            >
                              <FileText size={12} /> View Proof
                            </a>
                          ) : (
                            <span className="text-slate-400">No URL</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => processVerifMutation.mutate({ id: item.id, status: 'VERIFIED' })}
                              className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => processVerifMutation.mutate({ id: item.id, status: 'REJECTED' })}
                              className="px-2.5 py-1 bg-red-100 text-red-700 font-bold rounded hover:bg-red-200"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 8: ANNUAL RESEARCH REPORTS */}
      {/* ============================================================ */}
      {activeTab === 'annual_reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80">
            <div>
              <h3 className="text-base font-bold text-slate-900">11-Section Annual Research Intelligence Reports</h3>
              <p className="text-xs text-slate-500">
                Official research publications synthesizing rankings, student voice, and empirical insights.
              </p>
            </div>
            <button
              onClick={() => setShowReportGenModal(true)}
              className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Plus size={14} /> Generate Annual Report
            </button>
          </div>

          <div className="space-y-4">
            {isAnnualReportsLoading ? (
              <div className="py-20 text-center text-slate-400">Loading annual reports...</div>
            ) : annualReports.length === 0 ? (
              <div className="py-20 text-center text-slate-400">No annual reports generated for {selectedYear}.</div>
            ) : (
              annualReports.map((report) => (
                <div key={report.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{report.title}</h4>
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {report.version}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Year: {report.rankingYear || report.year} | Generated by {getActorName(report.generatedBy)} on{' '}
                        {formatIndianDate(report.generatedAt)}
                        {report.publishedAt && (
                          <span> | Published on {formatIndianDate(report.publishedAt)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          report.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : report.status === 'APPROVED'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {report.status}
                      </span>

                      <button
                        onClick={() => setViewingReport(report)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
                      >
                        <Eye size={12} /> Inspect Sections
                      </button>

                      {report.status === 'GENERATED' && (
                        <button
                          onClick={() => approveReportMutation.mutate(report.rankingYear || report.year)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg"
                        >
                          Approve Report
                        </button>
                      )}

                      {report.status === 'APPROVED' && (
                        <button
                          onClick={() => publishReportMutation.mutate(report.rankingYear || report.year)}
                          className="px-3 py-1.5 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-lg"
                        >
                          Publish Report
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                    {getSectionText(report.sections?.executiveSummary || report.executiveSummary)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 9: SPECIAL RANKINGS (20 LEADERBOARDS) */}
      {/* ============================================================ */}
      {activeTab === 'special_rankings' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">20 Category & Mission-Specific Special Rankings</h3>
              <p className="text-xs text-slate-500">
                Derived directly from the verified 9-pillar dataset without duplicate or disconnected calculation engines.
              </p>
            </div>

            {/* Special Type Selector Pills */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {[
                { id: 'TOP_100', label: 'Top 100 Overall' },
                { id: 'BEST_ACADEMIC', label: 'Best Academic Excellence' },
                { id: 'BEST_PLACEMENT', label: 'Best Placement & Career' },
                { id: 'BEST_STUDENT_EXP', label: 'Best Student Experience' },
                { id: 'MOST_PREFERRED', label: 'Most Preferred College' },
                { id: 'BEST_INFRA', label: 'Best Campus & Infra' },
                { id: 'BEST_CONNECTIVITY', label: 'Best Connectivity' },
                { id: 'BEST_DAILY_CONVENIENCE', label: 'Daily Convenience' },
                { id: 'BEST_HOSTEL', label: 'Best Hostel Living' },
                { id: 'BEST_STUDENT_LIFE', label: 'Best Student Life' },
                { id: 'BEST_SAFETY', label: 'Best Safety' },
                { id: 'BEST_HEALTHCARE', label: 'Best Healthcare Access' },
                { id: 'BEST_VALUE_FOR_MONEY', label: 'Best Value for Money' },
                { id: 'BEST_AFFORDABLE', label: 'Best Affordable' },
                { id: 'MOST_TRANSPARENT', label: 'Most Transparent' },
                { id: 'BEST_EMERGING', label: 'Best Emerging' },
                { id: 'BEST_STUDENT_FRIENDLY', label: 'Student Friendly' },
                { id: 'BEST_FOR_WOMEN', label: 'Best for Women' },
                { id: 'BEST_TIER_2', label: 'Best Tier-2 Cities' },
                { id: 'BEST_TIER_3', label: 'Best Tier-3 Cities' },
              ].map((spec) => (
                <button
                  key={spec.id}
                  onClick={() => setSelectedSpecialType(spec.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    selectedSpecialType === spec.id
                      ? 'bg-[#4A7B5B] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {spec.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {isSpecialLoading ? (
              <div className="py-20 text-center text-slate-400">Loading special ranking leaderboard...</div>
            ) : specialRankings.length === 0 ? (
              <div className="py-20 text-center text-slate-400">No colleges qualify under this special criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Special Rank</th>
                      <th className="px-4 py-3">College</th>
                      <th className="px-4 py-3">Overall Rank</th>
                      <th className="px-4 py-3">Special Pillar Score</th>
                      <th className="px-4 py-3">Composite Score</th>
                      <th className="px-4 py-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {specialRankings.map((sr: any, idx: number) => (
                      <tr key={sr.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-black text-slate-900 text-base">#{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#4A7B5B]">{sr.college?.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {sr.college?.city}, {sr.college?.state}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-600">#{sr.rank}</td>
                        <td className="px-4 py-3 font-bold text-[#4A7B5B] text-sm">
                          {sr.specialScore?.toFixed(1) || sr.score.toFixed(1)} / 100
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{sr.score.toFixed(1)}</td>
                        <td className="px-4 py-3">{getConfidenceBadge(sr.confidenceLevel, sr.confidenceScore)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: CALCULATION MODAL */}
      {/* ============================================================ */}
      {showCalcModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#4A7B5B] text-lg flex items-center gap-2">
                <Sliders size={20} /> Run Official 9-Pillar Ranking
              </h3>
              <button onClick={() => setShowCalcModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ranking Year</label>
                <input
                  type="number"
                  value={calcYear}
                  onChange={(e) => setCalcYear(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Methodology Version</label>
                <select
                  value={calcMethodologyVersion}
                  onChange={(e) => setCalcMethodologyVersion(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="v1.0.0">v1.0.0 (Swayam Official Standard)</option>
                  {methodologies.map((m) => (
                    <option key={m.id} value={m.version}>
                      {m.version} - {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-amber-800 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck size={13} /> Strict Governance Rules:
                </div>
                <div>• All 9 official pillars are evaluated according to registered weights.</div>
                <div>• Placement CTC outliers are normalized to avoid distortion.</div>
                <div>• Rankings remain in DRAFT until approved and explicitly published.</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCalcModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRunCalculation}
                disabled={calculateMutation.isPending}
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {calculateMutation.isPending ? 'Calculating...' : 'Run Engine Calculation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: NEW ANNUAL CYCLE */}
      {/* ============================================================ */}
      {showCycleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#4A7B5B] text-base flex items-center gap-2">
                <Calendar size={18} /> Register Annual Ranking Cycle
              </h3>
              <button onClick={() => setShowCycleModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Cycle Year</label>
                <input
                  type="number"
                  value={cycleForm.year}
                  onChange={(e) => setCycleForm({ ...cycleForm, year: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
                {cycles.some((c) => c.year === Number(cycleForm.year)) && (
                  <span className="text-xs text-amber-600 font-medium mt-1 block">
                    ⚠️ Ranking Cycle for {cycleForm.year} already exists in the database.
                  </span>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Data Collection Start</label>
                <input
                  type="date"
                  value={cycleForm.dataCollectionStart}
                  onChange={(e) => setCycleForm({ ...cycleForm, dataCollectionStart: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4A7B5B] bg-[#E8F3EC] px-2 py-0.5 rounded mt-1 border border-[#4A7B5B]/30 w-max">
                  <Calendar size={11} /> Indian Date: {formatIndianDate(cycleForm.dataCollectionStart)}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Data Collection End</label>
                <input
                  type="date"
                  value={cycleForm.dataCollectionEnd}
                  onChange={(e) => setCycleForm({ ...cycleForm, dataCollectionEnd: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4A7B5B] bg-[#E8F3EC] px-2 py-0.5 rounded mt-1 border border-[#4A7B5B]/30 w-max">
                  <Calendar size={11} /> Indian Date: {formatIndianDate(cycleForm.dataCollectionEnd)}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Survey Start</label>
                <input
                  type="date"
                  value={cycleForm.surveyStart}
                  onChange={(e) => setCycleForm({ ...cycleForm, surveyStart: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4A7B5B] bg-[#E8F3EC] px-2 py-0.5 rounded mt-1 border border-[#4A7B5B]/30 w-max">
                  <Calendar size={11} /> Indian Date: {formatIndianDate(cycleForm.surveyStart)}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Survey End</label>
                <input
                  type="date"
                  value={cycleForm.surveyEnd}
                  onChange={(e) => setCycleForm({ ...cycleForm, surveyEnd: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4A7B5B] bg-[#E8F3EC] px-2 py-0.5 rounded mt-1 border border-[#4A7B5B]/30 w-max">
                  <Calendar size={11} /> Indian Date: {formatIndianDate(cycleForm.surveyEnd)}
                </div>
              </div>
            </div>

            {/* Date Validation Alert */}
            {cycleForm.dataCollectionStart &&
              cycleForm.dataCollectionEnd &&
              cycleForm.dataCollectionStart > cycleForm.dataCollectionEnd && (
                <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Data Collection End must be on or after Data Collection Start.
                </div>
              )}

            {cycleForm.surveyStart &&
              cycleForm.surveyEnd &&
              cycleForm.surveyStart > cycleForm.surveyEnd && (
                <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Survey End must be on or after Survey Start.
                </div>
              )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCycleModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => createCycleMutation.mutate(cycleForm)}
                disabled={
                  createCycleMutation.isPending ||
                  (cycleForm.dataCollectionStart &&
                    cycleForm.dataCollectionEnd &&
                    cycleForm.dataCollectionStart > cycleForm.dataCollectionEnd) ||
                  (cycleForm.surveyStart &&
                    cycleForm.surveyEnd &&
                    cycleForm.surveyStart > cycleForm.surveyEnd) ||
                  cycles.some((c) => c.year === Number(cycleForm.year))
                }
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d664b] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
              >
                {createCycleMutation.isPending ? 'Registering...' : 'Register Annual Cycle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: SCORECARD DRILLDOWN */}
      {/* ============================================================ */}
      {selectedCollegeDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-[#4A7B5B] text-lg">{selectedCollegeDetail.college.name}</h3>
                <div className="text-xs text-slate-400">
                  Rank #{selectedCollegeDetail.rank} | Composite Score: {selectedCollegeDetail.score.toFixed(1)} / 100
                </div>
              </div>
              <button
                onClick={() => setSelectedCollegeDetail(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block">Data Confidence Rating:</span>
                  <span className="font-bold text-slate-800">
                    {selectedCollegeDetail.confidenceScore}% (Level: {selectedCollegeDetail.confidenceLevel})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Year-Over-Year:</span>
                  <span>{getMovementBadge(selectedCollegeDetail.movement, selectedCollegeDetail.rankChange)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Nine-Pillar Performance Scores:</h4>
                <div className="space-y-2">
                  {selectedCollegeDetail.pillarScores &&
                    Object.entries(selectedCollegeDetail.pillarScores).map(([key, val]: any) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between font-medium text-slate-700">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-bold text-[#4A7B5B]">{Number(val).toFixed(1)} / 100</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#4A7B5B] h-1.5 rounded-full" style={{ width: `${Math.min(val, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {selectedCollegeDetail.strengths && selectedCollegeDetail.strengths.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <h4 className="font-bold text-emerald-700 mb-1">Key Strengths:</h4>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                    {selectedCollegeDetail.strengths.map((str, idx) => (
                      <li key={idx}>{str}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedCollegeDetail.gaps && selectedCollegeDetail.gaps.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <h4 className="font-bold text-amber-700 mb-1">Areas for Improvement / Gaps:</h4>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                    {selectedCollegeDetail.gaps.map((gap, idx) => (
                      <li key={idx}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedCollegeDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: INSPECT ANNUAL REPORT SECTIONS */}
      {/* ============================================================ */}
      {viewingReport && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-[#4A7B5B] text-lg">{viewingReport.title}</h3>
                <div className="text-xs text-slate-400">
                  Version: {viewingReport.version} | Status: {viewingReport.status} | Generated: {formatIndianDate(viewingReport.generatedAt)}
                  {viewingReport.publishedAt && (
                    <span> | Published: {formatIndianDate(viewingReport.publishedAt)}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setViewingReport(null)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <h5 className="font-bold text-slate-800">1. Executive Summary:</h5>
                <p className="text-slate-600 leading-relaxed">
                  {getSectionText(viewingReport.sections?.executiveSummary || (viewingReport as any).executiveSummary)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <h5 className="font-bold text-slate-800">2. Methodology & Evidence Base:</h5>
                <p className="text-slate-600 leading-relaxed">
                  {getSectionText(viewingReport.sections?.methodologyNotes || (viewingReport as any).methodologySummary)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <h5 className="font-bold text-slate-800">3. Student Voice & Experience Insights:</h5>
                <p className="text-slate-600 leading-relaxed">
                  {getSectionText(viewingReport.sections?.studentVoiceSummary || (viewingReport as any).fullReportJson?.section8_StudentVoice)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <h5 className="font-bold text-slate-800">4. Swayam Field Survey Findings:</h5>
                <p className="text-slate-600 leading-relaxed">
                  {getSectionText(viewingReport.sections?.surveyFindings || (viewingReport as any).fullReportJson?.section9_SwayamSurveyFindings)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <h5 className="font-bold text-slate-800">5. Year-over-Year Trajectory Analysis:</h5>
                <p className="text-slate-600 leading-relaxed">
                  {getSectionText(viewingReport.sections?.yearOverYearTrends || (viewingReport as any).fullReportJson?.section10_YearOverYearTrends)}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewingReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: GENERATE REPORT MODAL */}
      {/* ============================================================ */}
      {showReportGenModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#4A7B5B] text-base flex items-center gap-2">
                <BookOpen size={18} /> Generate 11-Section Annual Report
              </h3>
              <button onClick={() => setShowReportGenModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ranking Year</label>
                <input
                  type="number"
                  value={reportGenForm.year}
                  onChange={(e) => setReportGenForm({ ...reportGenForm, year: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Report Title</label>
                <input
                  type="text"
                  value={reportGenForm.title}
                  onChange={(e) => setReportGenForm({ ...reportGenForm, title: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Authoring Entity</label>
                <input
                  type="text"
                  value={reportGenForm.author}
                  onChange={(e) => setReportGenForm({ ...reportGenForm, author: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowReportGenModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => generateReportMutation.mutate(reportGenForm)}
                disabled={generateReportMutation.isPending}
                className="px-5 py-2 bg-[#4A7B5B] text-white text-xs font-bold rounded-xl"
              >
                {generateReportMutation.isPending ? 'Synthesizing...' : 'Generate Full Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 6: NEW METHODOLOGY VERSION */}
      {/* ============================================================ */}
      {showMethodologyModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#4A7B5B] text-base flex items-center gap-2">
                <Sliders size={18} /> New Methodology Version & Governance
              </h3>
              <button onClick={() => setShowMethodologyModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Version Tag (e.g. v1.1.0)</label>
                  <input
                    type="text"
                    value={methForm.version}
                    onChange={(e) => setMethForm({ ...methForm, version: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono"
                    placeholder="v1.1.0"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Methodology Name</label>
                  <input
                    type="text"
                    value={methForm.title}
                    onChange={(e) => setMethForm({ ...methForm, title: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={methForm.description}
                  onChange={(e) => setMethForm({ ...methForm, description: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  placeholder="Official framework calibrating higher education decision intelligence."
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>9 Official Pillar Weights (Must Total 100%)</span>
                  {(() => {
                    const sum =
                      Number(methForm.academicExcellenceWeight) +
                      Number(methForm.placementCareerWeight) +
                      Number(methForm.studentDemandExperienceWeight) +
                      Number(methForm.infraCampusWeight) +
                      Number(methForm.locationConnectivityWeight) +
                      Number(methForm.hostelLivingWeight) +
                      Number(methForm.safetyHealthcareWeight) +
                      Number(methForm.affordabilityRoiWeight) +
                      Number(methForm.trustTransparencyWeight);
                    const isSumValid = Math.abs(sum - 1.0) <= 0.005;
                    return (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isSumValid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        Total: {(sum * 100).toFixed(1)}% {isSumValid ? '✓ Valid' : '⚠️ Must be 100%'}
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  {[
                    { key: 'academicExcellenceWeight', label: '1. Academic Excellence' },
                    { key: 'placementCareerWeight', label: '2. Placement & Career' },
                    { key: 'studentDemandExperienceWeight', label: '3. Student Demand & Experience' },
                    { key: 'infraCampusWeight', label: '4. Infrastructure & Campus' },
                    { key: 'locationConnectivityWeight', label: '5. Location & Connectivity' },
                    { key: 'hostelLivingWeight', label: '6. Hostel & Living Experience' },
                    { key: 'safetyHealthcareWeight', label: '7. Safety & Healthcare' },
                    { key: 'affordabilityRoiWeight', label: '8. Affordability & ROI' },
                    { key: 'trustTransparencyWeight', label: '9. Trust & Transparency' },
                  ].map((field) => (
                    <div key={field.key} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-700 text-[11px] font-medium">{field.label}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={(methForm as any)[field.key]}
                          onChange={(e) =>
                            setMethForm({ ...methForm, [field.key]: parseFloat(e.target.value) || 0 })
                          }
                          className="w-16 p-1 border border-slate-200 rounded text-center text-xs font-bold text-[#4A7B5B]"
                        />
                        <span className="text-slate-400 text-[10px]">
                          ({(((methForm as any)[field.key] || 0) * 100).toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const sum =
                    Number(methForm.academicExcellenceWeight) +
                    Number(methForm.placementCareerWeight) +
                    Number(methForm.studentDemandExperienceWeight) +
                    Number(methForm.infraCampusWeight) +
                    Number(methForm.locationConnectivityWeight) +
                    Number(methForm.hostelLivingWeight) +
                    Number(methForm.safetyHealthcareWeight) +
                    Number(methForm.affordabilityRoiWeight) +
                    Number(methForm.trustTransparencyWeight);

                  if (Math.abs(sum - 1.0) > 0.005) {
                    alert(`Pillar weights must sum to exactly 100%. Current sum is ${(sum * 100).toFixed(1)}%.`);
                    return;
                  }

                  createMethodologyMutation.mutate({
                    version: methForm.version,
                    name: methForm.title,
                    description: methForm.description || undefined,
                    pillarsConfig: {
                      academicExcellence: { weight: Number(methForm.academicExcellenceWeight), name: 'Academic Excellence' },
                      placementCareer: { weight: Number(methForm.placementCareerWeight), name: 'Placement & Career' },
                      studentDemandExperience: { weight: Number(methForm.studentDemandExperienceWeight), name: 'Student Demand & Experience' },
                      infrastructureCampus: { weight: Number(methForm.infraCampusWeight), name: 'Infrastructure & Campus' },
                      locationConnectivity: { weight: Number(methForm.locationConnectivityWeight), name: 'Location & Connectivity' },
                      hostelLivingExperience: { weight: Number(methForm.hostelLivingWeight), name: 'Hostel & Living Experience' },
                      safetyHealthcare: { weight: Number(methForm.safetyHealthcareWeight), name: 'Safety & Healthcare' },
                      affordabilityRoi: { weight: Number(methForm.affordabilityRoiWeight), name: 'Affordability & ROI' },
                      trustTransparency: { weight: Number(methForm.trustTransparencyWeight), name: 'Trust & Transparency' },
                    },
                  });
                }}
                disabled={
                  createMethodologyMutation.isPending ||
                  Math.abs(
                    Number(methForm.academicExcellenceWeight) +
                      Number(methForm.placementCareerWeight) +
                      Number(methForm.studentDemandExperienceWeight) +
                      Number(methForm.infraCampusWeight) +
                      Number(methForm.locationConnectivityWeight) +
                      Number(methForm.hostelLivingWeight) +
                      Number(methForm.safetyHealthcareWeight) +
                      Number(methForm.affordabilityRoiWeight) +
                      Number(methForm.trustTransparencyWeight) -
                      1.0,
                  ) > 0.005
                }
                className="px-5 py-2 bg-[#4A7B5B] disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {createMethodologyMutation.isPending ? 'Saving...' : 'Register Methodology Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 7: SCHEDULE NEW SURVEY */}
      {/* ============================================================ */}
      {showSurveyModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#4A7B5B] text-base flex items-center gap-2">
                <Compass size={18} /> Schedule On-Ground Audit Survey
              </h3>
              <button onClick={() => setShowSurveyModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ranking Year</label>
                <input
                  type="number"
                  value={surveyForm.year}
                  onChange={(e) => setSurveyForm({ ...surveyForm, year: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target College</label>
                <select
                  value={surveyForm.collegeId}
                  onChange={(e) => setSurveyForm({ ...surveyForm, collegeId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="">Select a college to audit...</option>
                  {availableColleges.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city}, {c.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lead Field Surveyor / Auditor</label>
                <input
                  type="text"
                  value={surveyForm.surveyorName}
                  onChange={(e) => setSurveyForm({ ...surveyForm, surveyorName: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Scheduled Audit Date</label>
                <input
                  type="date"
                  value={(surveyForm as any).scheduledDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSurveyForm({ ...surveyForm, scheduledDate: e.target.value } as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4A7B5B] bg-[#E8F3EC] px-2 py-0.5 rounded mt-1 border border-[#4A7B5B]/30 w-max">
                  <Calendar size={11} /> Indian Date: {formatIndianDate((surveyForm as any).scheduledDate || new Date().toISOString().split('T')[0])}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Audit Scope</label>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                  Evaluates facilities across the official 9 pillars: Laboratories, Hostels, Safety & CCTV, Hospital access, and Student Dining.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowSurveyModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!surveyForm.collegeId) {
                    alert('Please select a college to audit.');
                    return;
                  }
                  createSurveyMutation.mutate({
                    rankingYear: Number(surveyForm.year),
                    collegeId: surveyForm.collegeId,
                    templateName: 'Swayam Official 9-Pillar Audit Template',
                    scheduledDate: (surveyForm as any).scheduledDate || new Date().toISOString().split('T')[0],
                  });
                }}
                disabled={createSurveyMutation.isPending || !surveyForm.collegeId}
                className="px-5 py-2 bg-[#4A7B5B] disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {createSurveyMutation.isPending ? 'Scheduling...' : 'Schedule Survey'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
