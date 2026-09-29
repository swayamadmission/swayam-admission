import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import {
  Trophy,
  Award,
  Star,
  Search,
  Building2,
  MapPin,
  BadgeCheck,
  Info,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  BookOpen,
  Send,
  Eye,
  Layers,
  Sparkles,
  Sliders,
  Scale,
} from 'lucide-react';
import { reviewsRankingApi } from '../../api/reviews-ranking.api';
import { formatIndianDate } from '../../utils/date.utils';
import { useAuth } from '../../context/AuthContext';

export const CollegeRankingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [search, setSearch] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [activeSpecialRanking, setActiveSpecialRanking] = useState<string>('ALL');

  // Modals state
  const [showMethodology, setShowMethodology] = useState<boolean>(false);
  const [showAnnualReport, setShowAnnualReport] = useState<boolean>(false);
  const [showStudentReportModal, setShowStudentReportModal] = useState<boolean>(false);
  const [selectedCollegeForReport, setSelectedCollegeForReport] = useState<any>(null);

  // Student Report Form State
  const [reportForm, setReportForm] = useState({
    collegeId: '',
    academicRating: 4.5,
    placementCareerRating: 4.0,
    studentDemandExperienceRating: 5.0,
    infrastructureRating: 4.5,
    connectivityRating: 4.0,
    hostelLivingRating: 4.0,
    safetyHealthcareRating: 4.5,
    affordabilityRoiRating: 4.0,
    trustTransparencyRating: 4.5,
    overallSatisfactionRating: 4.5,
    headline: 'Authentic student perspective on campus life and academic support',
    detailedExperience: '',
  });

  // Queries
  const { data: rankingRes, isLoading } = useQuery({
    queryKey: ['public_rankings', selectedYear, search, selectedState, selectedTier],
    queryFn: () =>
      reviewsRankingApi.getPublicRankings({
        year: selectedYear,
        search: search.trim() || undefined,
        state: selectedState === 'all' ? undefined : selectedState,
        tier: selectedTier === 'all' ? undefined : selectedTier,
      }),
  });

  const { data: specialRankingsRes } = useQuery({
    queryKey: ['public_special_rankings', selectedYear, activeSpecialRanking],
    queryFn: () => reviewsRankingApi.getPublicSpecialRankings(selectedYear, activeSpecialRanking, 50),
    enabled: activeSpecialRanking !== 'ALL',
  });

  const { data: methodologyRes } = useQuery({
    queryKey: ['public_methodology'],
    queryFn: () => reviewsRankingApi.getPublicMethodology(),
    enabled: showMethodology,
  });

  const { data: annualReportRes } = useQuery({
    queryKey: ['public_annual_report', selectedYear],
    queryFn: () => reviewsRankingApi.getPublicAnnualReport(selectedYear),
    enabled: showAnnualReport,
  });

  // Student Report Mutation
  const submitReportMutation = useMutation({
    mutationFn: (payload: any) => reviewsRankingApi.submitStudentCollegeReport(payload),
    onSuccess: () => {
      alert('Your Student College Experience Report has been submitted for verification!');
      setShowStudentReportModal(false);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to submit report. Ensure your admission is confirmed.');
    },
  });

  const edition =
    activeSpecialRanking === 'ALL'
      ? rankingRes?.data?.edition
      : specialRankingsRes?.data?.edition || rankingRes?.data?.edition;

  const regularResults: any[] = Array.isArray(rankingRes?.data)
    ? rankingRes.data
    : Array.isArray(rankingRes?.data?.results)
    ? rankingRes.data.results
    : Array.isArray((rankingRes as any)?.results)
    ? (rankingRes as any).results
    : [];

  const rawSpecial = specialRankingsRes?.data;
  const specialResults: any[] = Array.isArray(rawSpecial)
    ? rawSpecial
    : Array.isArray(rawSpecial?.results)
    ? rawSpecial.results
    : Array.isArray((rawSpecial as any)?.results)
    ? (rawSpecial as any).results
    : [];

  const results: any[] = activeSpecialRanking === 'ALL' ? regularResults : specialResults;
  const methodology = methodologyRes?.data;
  const annualReport = annualReportRes?.data;

  const statesList = [
    'All States',
    'Maharashtra',
    'Delhi',
    'Karnataka',
    'Tamil Nadu',
    'Uttar Pradesh',
    'Telangana',
    'Gujarat',
    'West Bengal',
    'Rajasthan',
    'Punjab',
    'Haryana',
  ];

  const specialPillars = [
    { id: 'ALL', label: 'All Ranked Colleges' },
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
    { id: 'BEST_HEALTHCARE', label: 'Healthcare Access' },
    { id: 'BEST_VALUE_FOR_MONEY', label: 'Best Value for Money' },
    { id: 'BEST_AFFORDABLE', label: 'Affordability & ROI' },
    { id: 'MOST_TRANSPARENT', label: 'Trust & Transparency' },
    { id: 'BEST_EMERGING', label: 'Best Emerging' },
    { id: 'BEST_STUDENT_FRIENDLY', label: 'Student Friendly' },
    { id: 'BEST_FOR_WOMEN', label: 'Best for Women' },
    { id: 'BEST_TIER_2', label: 'Best Tier-2 Cities' },
    { id: 'BEST_TIER_3', label: 'Best Tier-3 Cities' },
  ];

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
          ★ New Entry
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
        <Minus size={12} /> Stable
      </span>
    );
  };

  const getConfidenceBadge = (level?: string, score?: number) => {
    const lvl = level || (score && score >= 75 ? 'HIGH' : score && score >= 50 ? 'MEDIUM' : 'LOW');
    if (lvl === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
          <ShieldCheck size={12} /> High Evidence ({score || 85}%)
        </span>
      );
    }
    if (lvl === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
          <ShieldCheck size={12} /> Moderate ({score || 65}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
        <AlertTriangle size={12} /> Low Evidence ({score || 35}%)
      </span>
    );
  };

  const handleOpenStudentReport = (college: any) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setSelectedCollegeForReport(college);
    setReportForm({ ...reportForm, collegeId: college.id });
    setShowStudentReportModal(true);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-20">
      {/* Hero Header Banner */}
      <section className="bg-gradient-to-br from-[#4A7B5B] via-[#2E513C] to-[#4A7B5B] text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[#E8F3EC] text-xs font-bold border border-white/10">
            <Trophy size={14} className="text-[#F0AE1A]" /> Official Swayam National Rankings {selectedYear}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Which College is Actually Best for You?
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
            Multi-dimensional, student-centric research rankings grounded in 9 official pillars: Verified Student Voice, Academic Rigor, Placement Packages, Location, Real Hostels, and Swayam Campus Audits.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => setShowMethodology(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl border border-white/20 transition-all shadow-xs"
            >
              <Info size={14} /> Official 9-Pillar Methodology
            </button>

            <button
              onClick={() => setShowAnnualReport(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F0AE1A] hover:bg-[#d99c14] text-slate-900 text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <BookOpen size={14} /> Annual Research Report
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 space-y-6">
        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search college by name, city, NIRF, or NAAC grade..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#4A7B5B]/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-hidden"
            >
              {statesList.map((s) => (
                <option key={s} value={s === 'All States' ? 'all' : s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Tiers</option>
              <option value="TIER_1">Tier 1</option>
              <option value="TIER_2">Tier 2</option>
              <option value="TIER_3">Tier 3</option>
            </select>
          </div>
        </div>

        {/* Special Rankings Selector Pills */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 overflow-x-auto flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 shrink-0 uppercase tracking-wider pl-1">
            Focus Pillar:
          </span>
          {specialPillars.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveSpecialRanking(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeSpecialRanking === p.id
                  ? 'bg-[#4A7B5B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Results Metadata Bar */}
        <div className="flex items-center justify-between py-1 text-xs font-bold text-slate-500">
          <span>Displaying {results.length} ranked institutions</span>
          {edition && (
            <span className="text-[#4A7B5B] flex items-center gap-1">
              <ShieldCheck size={14} /> Official Snapshot: {edition.title}
            </span>
          )}
        </div>

        {/* Rankings Cards List */}
        {isLoading ? (
          <div className="py-24 text-center text-slate-400">Loading ranking leaderboard...</div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-2">
            <Building2 className="mx-auto text-slate-300" size={40} />
            <p className="text-slate-800 font-bold text-base">No published rankings match your criteria</p>
            <p className="text-xs text-slate-400">Adjust your search terms, state, or focus pillar filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((r: any) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-[#4A7B5B]/50 hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Rank & Basic Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                      <span className="text-lg font-black text-slate-800">
                        {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                      </span>
                      <div className="mt-0.5">{getMovementBadge(r.movement, r.rankChange)}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/colleges/${r.college.slug || r.college.id}`}
                          className="font-bold text-[#4A7B5B] text-lg hover:underline transition-colors"
                        >
                          {r.college.name}
                        </Link>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            r.tier === 'TIER_1'
                              ? 'bg-[#E8F3EC] text-[#4A7B5B] border border-[#4A7B5B]/30'
                              : r.tier === 'TIER_2'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {r.tier?.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" /> {r.college.city}, {r.college.state}
                        </span>
                        {r.college.naacGrade && (
                          <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 font-bold rounded text-[11px]">
                            NAAC {r.college.naacGrade}
                          </span>
                        )}
                        {r.college.nirfRanking && (
                          <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 font-bold rounded text-[11px]">
                            NIRF #{r.college.nirfRanking}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Composite Score & Confidence */}
                  <div className="flex items-center gap-5 self-end sm:self-center">
                    <div className="text-right">
                      {activeSpecialRanking !== 'ALL' && typeof r.specialScore === 'number' ? (
                        <div>
                          <div className="flex items-center gap-1 justify-end font-black text-slate-900 text-lg">
                            <span className="text-[#4A7B5B]">{r.specialScore.toFixed(1)}</span>
                            <span className="text-xs text-slate-400 font-normal">/ 100</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">Special Pillar Score</div>
                          <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                            Overall Rank #{r.rank} ({r.score.toFixed(1)})
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end font-black text-slate-900 text-xl">
                          <span className="text-[#4A7B5B]">{r.score.toFixed(1)}</span>
                          <span className="text-xs text-slate-400 font-normal">/ 100</span>
                        </div>
                      )}
                      <div className="mt-1">{getConfidenceBadge(r.confidenceLevel, r.confidenceScore)}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenStudentReport(r.college)}
                        className="px-3 py-2 bg-slate-100 hover:bg-[#4A7B5B] hover:text-white text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                        title="Submit Student College Report"
                      >
                        <Send size={12} /> Student Report
                      </button>

                      <Link
                        to={`/colleges/${r.college.slug || r.college.id}`}
                        className="p-2.5 bg-[#E8F3EC] hover:bg-[#4A7B5B] text-[#4A7B5B] hover:text-white rounded-xl transition-all shadow-xs"
                        title="View Full Profile"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* 9 Pillars Mini Scores Bar (Student-facing hides weights) */}
                {r.pillarScores && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 pt-3 border-t border-slate-100 text-[11px]">
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <div className="text-slate-400 text-[10px]">Academic Excellence</div>
                      <div className="font-bold text-slate-800">{r.pillarScores.academicExcellence?.toFixed(1) || '—'}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <div className="text-slate-400 text-[10px]">Placement & Career</div>
                      <div className="font-bold text-slate-800">{r.pillarScores.placementCareer?.toFixed(1) || '—'}</div>
                    </div>
                    <div className="bg-[#E8F3EC]/50 p-2 rounded-lg text-center border border-[#4A7B5B]/20">
                      <div className="text-[#4A7B5B] font-bold text-[10px]">Student Experience</div>
                      <div className="font-black text-[#4A7B5B]">{r.pillarScores.studentDemandExperience?.toFixed(1) || '—'}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <div className="text-slate-400 text-[10px]">Campus & Infra</div>
                      <div className="font-bold text-slate-800">{r.pillarScores.infrastructureCampus?.toFixed(1) || r.pillarScores.infraCampus?.toFixed(1) || '—'}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <div className="text-slate-400 text-[10px]">Connectivity</div>
                      <div className="font-bold text-slate-800">{r.pillarScores.locationConnectivity?.toFixed(1) || '—'}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <div className="text-slate-400 text-[10px]">Hostel Living</div>
                      <div className="font-bold text-slate-800">{r.pillarScores.hostelLivingExperience?.toFixed(1) || r.pillarScores.hostelLiving?.toFixed(1) || '—'}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <div className="text-slate-400 text-[10px]">Safety & Health</div>
                      <div className="font-bold text-slate-800">{r.pillarScores.safetyHealthcare?.toFixed(1) || '—'}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <div className="text-slate-400 text-[10px]">Affordability & ROI</div>
                      <div className="font-bold text-slate-800">{r.pillarScores.affordabilityRoi?.toFixed(1) || '—'}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <div className="text-slate-400 text-[10px]">Trust & Transparency</div>
                      <div className="font-bold text-slate-800">{r.pillarScores.trustTransparency?.toFixed(1) || '—'}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Methodology Modal (Student-facing hides weights) */}
      {showMethodology && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-[#4A7B5B]" size={24} />
                <h3 className="font-bold text-[#4A7B5B] text-xl">Official 9-Pillar Methodology ({methodology?.version || 'v1.0.0'})</h3>
              </div>
              <button onClick={() => setShowMethodology(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Swayam College Rankings evaluate colleges across nine strictly validated pillars. Ranking score is mathematically decoupled from data confidence to prevent unverified claims from inflating standing.
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-2.5 border border-slate-200/60">
                <div className="font-bold text-slate-800 text-sm">Official Nine Focus Pillars:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>1. Academic Excellence</div>
                  <div>2. Placement & Career</div>
                  <div className="font-bold text-[#4A7B5B]">3. Student Demand & Experience</div>
                  <div>4. Infrastructure & Campus</div>
                  <div>5. Location & Connectivity</div>
                  <div>6. Hostel & Living Experience</div>
                  <div>7. Safety & Healthcare</div>
                  <div>8. Affordability & ROI</div>
                  <div>9. Trust & Transparency</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowMethodology(false)}
                className="px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Close & Explore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Annual Research Report Viewer Modal */}
      {showAnnualReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="text-[#4A7B5B]" size={24} />
                <div>
                  <h3 className="font-bold text-[#4A7B5B] text-xl">
                    {annualReport?.title || `Swayam Admission National College Ranking & Research Report ${selectedYear}`}
                  </h3>
                  <div className="text-xs text-slate-400">
                    Version: {annualReport?.version || 'v1.0'} | Status: {annualReport?.status || 'PUBLISHED'}
                    {annualReport?.publishedAt && (
                      <span> | Published: {formatIndianDate(annualReport.publishedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAnnualReport(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Executive Summary</h4>
                <p>{annualReport?.sections?.executiveSummary || 'Annual synthesis of national college performance.'}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Methodology & Empirical Verification</h4>
                <p>{annualReport?.sections?.methodologyNotes || 'Multi-source empirical data aggregation.'}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Student Voice & Campus Experience</h4>
                <p>{annualReport?.sections?.studentVoiceSummary || 'Enrolled student admissions and verified feedbacks.'}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Swayam Field Research Observations</h4>
                <p>{annualReport?.sections?.surveyFindings || 'On-ground verification audits conducted nationwide.'}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowAnnualReport(false)}
                className="px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3d664b] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student College Report Submission Modal */}
      {showStudentReportModal && selectedCollegeForReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-[#4A7B5B] text-lg">Submit Student College Report</h3>
                <p className="text-xs text-slate-400">For {selectedCollegeForReport.name}</p>
              </div>
              <button onClick={() => setShowStudentReportModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-[11px]">
                <strong>Eligibility Check:</strong> Your report is verified against your confirmed admission record in Swayam Admission before contributing to official ranking datasets.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Headline Summary</label>
                <input
                  type="text"
                  value={reportForm.headline}
                  onChange={(e) => setReportForm({ ...reportForm, headline: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700">Academic Excellence (1-5)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="5"
                    value={reportForm.academicRating}
                    onChange={(e) => setReportForm({ ...reportForm, academicRating: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700">Placement & Career (1-5)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="5"
                    value={reportForm.placementCareerRating}
                    onChange={(e) => setReportForm({ ...reportForm, placementCareerRating: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700">Student Experience (1-5)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="5"
                    value={reportForm.studentDemandExperienceRating}
                    onChange={(e) => setReportForm({ ...reportForm, studentDemandExperienceRating: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700">Hostel & Living (1-5)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="5"
                    value={reportForm.hostelLivingRating}
                    onChange={(e) => setReportForm({ ...reportForm, hostelLivingRating: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Student Feedback</label>
                <textarea
                  rows={3}
                  value={reportForm.detailedExperience}
                  onChange={(e) => setReportForm({ ...reportForm, detailedExperience: e.target.value })}
                  placeholder="Share details about faculty quality, hostel hygiene, mess food, and career opportunities..."
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowStudentReportModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => submitReportMutation.mutate(reportForm)}
                disabled={submitReportMutation.isPending}
                className="px-5 py-2 bg-[#4A7B5B] text-white text-xs font-bold rounded-xl"
              >
                {submitReportMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
