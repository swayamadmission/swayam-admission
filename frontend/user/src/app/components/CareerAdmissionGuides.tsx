import React, { useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  Compass,
  Bookmark,
  BookmarkCheck,
  Share2,
  Calendar,
  Clock,
  Sparkles,
  Award,
  DollarSign,
  GraduationCap,
  Briefcase,
  Layers,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  HelpCircle,
  FileCheck2,
  RefreshCw,
  Filter,
  X,
  Send,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { blogsApi, GuideItem, PublicBlogQueryParams } from "../../api/blogs.api";
import { useDebounce } from "../../hooks/useDebounce";
import { useAuth } from "../../context/AuthContext";
import { useUserLiveSync } from "../../hooks/useUserLiveSync";
import { toast } from "sonner";
import { PageBannerSlider } from "./common/PageBannerSlider";

const EDUCATION_LEVELS = [
  "All",
  "10th",
  "12th",
  "Diploma",
  "Undergraduate",
  "Postgraduate",
  "PhD",
  "Other",
];

const STREAMS = [
  "All",
  "Engineering",
  "Management",
  "Medical",
  "Science",
  "Commerce",
  "Arts",
  "Law",
  "Design",
];

export default function CareerAdmissionGuides() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const studentId = (user as any)?.id;

  // Real-time live synchronization with Admin CMS events
  useUserLiveSync(studentId);

  // Navigation & Filtering State
  const [activeTab, setActiveTab] = useState<"career" | "admission" | "recommended" | "saved">("career");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [selectedEducation, setSelectedEducation] = useState("All");
  const [selectedStream, setSelectedStream] = useState("All");
  const [selectedState, setSelectedState] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  // Detail Modal / Drawer State
  const [activeGuide, setActiveGuide] = useState<GuideItem | null>(null);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Query Params for Public Guides
  const queryParams: PublicBlogQueryParams = useMemo(() => {
    const p: PublicBlogQueryParams = {
      page: 1,
      limit: 50,
      sortBy: "updatedAt",
      sortOrder: "desc",
    };
    if (activeTab === "career") p.guideType = "CAREER";
    if (activeTab === "admission") p.guideType = "ADMISSION";
    if (debouncedSearch.trim()) p.q = debouncedSearch.trim();
    if (selectedEducation !== "All") p.educationLevel = selectedEducation;
    if (selectedStream !== "All") p.stream = selectedStream;
    if (selectedState !== "All") p.state = selectedState;
    return p;
  }, [activeTab, debouncedSearch, selectedEducation, selectedStream, selectedState]);

  // 1. Fetch Main Public Guides
  const {
    data: guidesRes,
    isLoading: isGuidesLoading,
    isError: isGuidesError,
    refetch: refetchGuides,
  } = useQuery({
    queryKey: ["public_guides", queryParams],
    queryFn: () => blogsApi.findPublic(queryParams),
    staleTime: 60 * 1000,
  });

  // 2. Fetch Personalized Recommendations (only for student)
  const {
    data: recommendedRes,
    isLoading: isRecsLoading,
    isError: isRecsError,
    refetch: refetchRecs,
  } = useQuery({
    queryKey: ["personalized_guides", studentId],
    queryFn: () => blogsApi.getPersonalizedGuides(studentId),
    enabled: !!studentId,
    staleTime: 60 * 1000,
  });

  // 3. Fetch Saved Guides for Logged-In Student
  const {
    data: savedRes,
    isLoading: isSavedLoading,
    refetch: refetchSaved,
  } = useQuery({
    queryKey: ["saved_guides", studentId],
    queryFn: () => blogsApi.getSavedGuides(studentId),
    enabled: !!studentId,
    staleTime: 30 * 1000,
  });

  // 4. Fetch Assigned Counselor Guidance
  const { data: counselorRes } = useQuery({
    queryKey: ["counselor_guidance", studentId],
    queryFn: () => blogsApi.getCounselorGuidance(studentId),
    enabled: !!studentId,
    staleTime: 60 * 1000,
  });

  // Saved Guide ID Set for quick O(1) lookup
  const savedGuideIds = useMemo(() => {
    const list = Array.isArray(savedRes?.data) ? savedRes.data : [];
    return new Set(list.map((g: GuideItem) => g.id));
  }, [savedRes]);

  // Save / Unsave Mutations
  const saveMutation = useMutation({
    mutationFn: (guideId: string) => blogsApi.saveGuide(guideId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_guides"] });
      toast.success("Guide saved to your bookmarks");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to save guide");
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (guideId: string) => blogsApi.unsaveGuide(guideId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_guides"] });
      toast.success("Guide removed from your bookmarks");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to remove saved guide");
    },
  });

  const handleToggleSave = (e: React.MouseEvent, guide: GuideItem) => {
    e.stopPropagation();
    if (!studentId) {
      toast.error("Please log in to bookmark guides to your profile");
      return;
    }
    if (savedGuideIds.has(guide.id)) {
      unsaveMutation.mutate(guide.id);
    } else {
      saveMutation.mutate(guide.id);
    }
  };

  const handleShare = (guide: GuideItem) => {
    const url = `${window.location.origin}/dashboard?tab=blogs&guideSlug=${guide.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  // Extract Guides list based on active tab
  const activeGuidesList: GuideItem[] = useMemo(() => {
    if (activeTab === "recommended") {
      return Array.isArray(recommendedRes?.data) ? recommendedRes.data : [];
    }
    if (activeTab === "saved") {
      return Array.isArray(savedRes?.data) ? savedRes.data : [];
    }
    return Array.isArray(guidesRes?.data?.data) ? guidesRes.data.data : [];
  }, [activeTab, recommendedRes, savedRes, guidesRes]);

  const hasActiveFilters =
    selectedEducation !== "All" ||
    selectedStream !== "All" ||
    selectedState !== "All" ||
    search.trim().length > 0;

  const handleResetFilters = () => {
    setSearch("");
    setSelectedEducation("All");
    setSelectedStream("All");
    setSelectedState("All");
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-900 via-[#4A7B5B] to-[#3d694d] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <Compass size={220} />
        </div>
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={13} />
            ERP Knowledge & Guidance System
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Career & Admission Guides
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
            Personalized career guidance, admission information and course guidance based on your profile and goals.
          </p>
        </div>

        {/* Quick Tabs inside Header */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/20 relative z-10">
          {[
            { id: "career", label: "Career Guides", icon: Compass },
            { id: "admission", label: "Admission Guides", icon: BookOpen },
            { id: "recommended", label: "Recommended for You", icon: Sparkles },
            { id: "saved", label: `Saved (${Array.isArray(savedRes?.data) ? savedRes.data.length : 0})`, icon: Bookmark },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "bg-white text-[#4A7B5B] shadow-md scale-102"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner Slot */}
      <PageBannerSlider slot="DASHBOARD_GUIDES" variant="wide" containerClassName="w-full my-4" />

      {/* ── COUNSELOR GUIDANCE BANNER ───────────────────────────────────── */}
      {counselorRes?.data?.hasCounselor && counselorRes.data.counselor && (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#4A7B5B] text-white flex items-center justify-center font-bold text-base shadow-sm">
              {counselorRes.data.counselor.fullName?.charAt(0) || "C"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {counselorRes.data.counselor.fullName}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#4A7B5B]/15 text-[#4A7B5B]">
                  Your Assigned Counselor
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span>{counselorRes.data.counselor.designation || "Senior Educational Counselor"}</span>
                {(counselorRes.data.counselor as any).qualification && (
                  <>
                    <span className="opacity-40">•</span>
                    <span>{(counselorRes.data.counselor as any).qualification}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          {counselorRes.data.guides && counselorRes.data.guides.length > 0 && (
            <span className="text-xs text-emerald-800 font-semibold bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200">
              {counselorRes.data.guides.length} recommended guide(s) linked
            </span>
          )}
        </div>
      )}

      {/* ── SEARCH & FILTER CONTROLS ────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Live Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search title, stream, course, career, exam..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#4A7B5B] focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter toggle & Reset */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                showFilters || hasActiveFilters
                  ? "bg-emerald-50 border-[#4A7B5B] text-[#4A7B5B]"
                  : "bg-white border-gray-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter size={13} />
              Filters {hasActiveFilters && "• Active"}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 px-2 py-1 transition-colors"
              >
                Reset
              </button>
            )}

            <button
              onClick={() => {
                refetchGuides();
                refetchRecs();
                refetchSaved();
              }}
              title="Refresh guides"
              className="p-2 border border-gray-200 text-slate-600 hover:text-[#4A7B5B] hover:bg-slate-50 rounded-xl transition-all"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Expanded Filters Drawer */}
        {showFilters && (
          <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Education Level
              </label>
              <select
                value={selectedEducation}
                onChange={(e) => setSelectedEducation(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#4A7B5B]"
              >
                {EDUCATION_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Stream / Academic Branch
              </label>
              <select
                value={selectedStream}
                onChange={(e) => setSelectedStream(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#4A7B5B]"
              >
                {STREAMS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                State Specific
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#4A7B5B]"
              >
                <option value="All">All States (National)</option>
                <option value="Punjab">Punjab</option>
                <option value="Bihar">Bihar</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Haryana">Haryana</option>
                <option value="Delhi">Delhi</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── CONTENT RENDERING ───────────────────────────────────────────── */}
      {isGuidesLoading || isRecsLoading || isSavedLoading ? (
        // Loading Skeleton Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 animate-pulse shadow-sm"
            >
              <div className="h-4 bg-slate-200 rounded-lg w-1/3" />
              <div className="h-6 bg-slate-200 rounded-lg w-4/5" />
              <div className="h-12 bg-slate-100 rounded-xl w-full" />
              <div className="flex gap-2 pt-2">
                <div className="h-4 bg-slate-200 rounded-md w-16" />
                <div className="h-4 bg-slate-200 rounded-md w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : isGuidesError || isRecsError ? (
        // Error State with Retry
        <div className="bg-white border border-rose-100 rounded-3xl p-10 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <HelpCircle size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Unable to load Career & Admission Guides.
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            We encountered an issue communicating with the guidance server. Please verify your connection and retry.
          </p>
          <button
            onClick={() => {
              refetchGuides();
              refetchRecs();
            }}
            className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            Retry
          </button>
        </div>
      ) : activeGuidesList.length === 0 ? (
        // Genuine Empty States (Strictly NO fake data)
        <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-emerald-50 text-[#4A7B5B] rounded-3xl flex items-center justify-center mx-auto">
            {activeTab === "recommended" ? (
              <Sparkles size={28} />
            ) : activeTab === "saved" ? (
              <Bookmark size={28} />
            ) : (
              <BookOpen size={28} />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-800">
              {activeTab === "recommended"
                ? "No personalized guides are available yet."
                : activeTab === "saved"
                ? "You haven't saved any guides yet."
                : hasActiveFilters
                ? "No guides found for your search."
                : "No guides published yet."}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab === "recommended"
                ? "Recommendations are evaluated from your active profile, stream, and applications. Browse our comprehensive catalog below."
                : activeTab === "saved"
                ? "Click the bookmark icon on any career or admission guide to save it for quick offline reference."
                : "Try adjusting your search criteria or resetting filters to browse all published guidance."}
            </p>
          </div>
          {(activeTab === "recommended" || activeTab === "saved") && (
            <button
              onClick={() => setActiveTab("career")}
              className="px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3d694d] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Browse All Guides
            </button>
          )}
          {hasActiveFilters && activeTab !== "recommended" && (
            <button
              onClick={handleResetFilters}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        // Guide Cards Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeGuidesList.map((guide) => {
            const isSaved = savedGuideIds.has(guide.id);
            const isAdmission = guide.guideType === "ADMISSION";

            return (
              <div
                key={guide.id}
                onClick={() => setActiveGuide(guide)}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#4A7B5B]/40 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top badges */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border ${
                        isAdmission
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {isAdmission ? "Admission Guide" : "Career Guide"}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleToggleSave(e, guide)}
                        title={isSaved ? "Remove from saved" : "Save Guide"}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isSaved
                            ? "bg-[#4A7B5B] text-white border-[#4A7B5B]"
                            : "bg-slate-50 text-slate-400 hover:text-slate-600 border-gray-100"
                        }`}
                      >
                        {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(guide);
                        }}
                        title="Share link"
                        className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-600 border border-gray-100 transition-all"
                      >
                        <Share2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Recommendation Match Reason Tag if available */}
                  {guide.matchReason && (
                    <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/70 text-[10px] font-bold text-amber-800">
                      <Sparkles size={11} className="text-amber-600" />
                      <span>{guide.matchReason}</span>
                    </div>
                  )}

                  {/* Title & Category */}
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-[#4A7B5B] transition-colors line-clamp-2">
                    {guide.title}
                  </h3>

                  {/* Excerpt */}
                  {guide.excerpt && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                      {guide.excerpt}
                    </p>
                  )}
                </div>

                {/* Key ERP Metadata Highlights */}
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                    {guide.educationLevel && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">
                        {guide.educationLevel}
                      </span>
                    )}
                    {guide.stream && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">
                        {guide.stream}
                      </span>
                    )}
                    {guide.state && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">
                        {guide.state}
                      </span>
                    )}
                    {guide.averageSalary && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold">
                        {guide.averageSalary}
                      </span>
                    )}
                  </div>

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(guide.updatedAt || guide.createdAt).toLocaleDateString()}
                    </span>
                    <span className="font-bold text-[#4A7B5B] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Read Guide <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SHARE TOAST ─────────────────────────────────────────────────── */}
      {copiedShare && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 size={16} className="text-emerald-400" />
          Link copied to clipboard!
        </div>
      )}

      {/* ── GUIDE DETAIL DRAWER / MODAL ─────────────────────────────────── */}
      {activeGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-100 p-4 sm:p-5 flex items-center justify-between z-20">
              <button
                onClick={() => setActiveGuide(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 p-1 rounded-xl transition-colors"
              >
                <ArrowLeft size={16} /> Back to Guides
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleToggleSave(e, activeGuide)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    savedGuideIds.has(activeGuide.id)
                      ? "bg-[#4A7B5B] text-white border-[#4A7B5B]"
                      : "bg-white text-slate-700 border-gray-200 hover:bg-slate-50"
                  }`}
                >
                  {savedGuideIds.has(activeGuide.id) ? (
                    <>
                      <BookmarkCheck size={14} /> Saved
                    </>
                  ) : (
                    <>
                      <Bookmark size={14} /> Save Guide
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleShare(activeGuide)}
                  className="p-2 border border-gray-200 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-all"
                >
                  <Share2 size={15} />
                </button>

                <button
                  onClick={() => setActiveGuide(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1 text-xs sm:text-sm">
              {/* Type Badge & Category */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {activeGuide.guideType === "ADMISSION" ? "Admission Guide" : "Career Guide"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                    {activeGuide.category}
                  </span>
                  {activeGuide.educationLevel && (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700">
                      Level: {activeGuide.educationLevel}
                    </span>
                  )}
                  {activeGuide.stream && (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700">
                      Stream: {activeGuide.stream}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {activeGuide.title}
                </h1>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span>Updated: {new Date(activeGuide.updatedAt).toLocaleDateString()}</span>
                  {activeGuide.author?.fullName && (
                    <span>• Verified by: {activeGuide.author.fullName}</span>
                  )}
                </div>
              </div>

              {/* Recommendation Match Reason banner */}
              {activeGuide.matchReason && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900 font-semibold">
                  <Sparkles size={16} className="text-amber-600 shrink-0" />
                  <span>{activeGuide.matchReason}</span>
                </div>
              )}

              {/* Short description */}
              {activeGuide.excerpt && (
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-slate-700 font-medium leading-relaxed">
                  {activeGuide.excerpt}
                </div>
              )}

              {/* ERP Career Guidance Attributes */}
              {activeGuide.guideType === "CAREER" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  {activeGuide.careerPath && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Target Career Path
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {activeGuide.careerPath}
                      </span>
                    </div>
                  )}
                  {activeGuide.averageSalary && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Indicative Salary Range
                      </span>
                      <span className="text-xs font-bold text-emerald-700">
                        {activeGuide.averageSalary}
                      </span>
                    </div>
                  )}
                  {activeGuide.eligibility && (
                    <div className="sm:col-span-2 pt-2 border-t border-gray-50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Eligibility
                      </span>
                      <span className="text-xs text-slate-700 font-medium">
                        {activeGuide.eligibility}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Required Skills */}
              {activeGuide.skills && activeGuide.skills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Award size={14} className="text-[#4A7B5B]" />
                    Key Skills Needed
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeGuide.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Roles & Career Sectors */}
              {activeGuide.jobRoles && activeGuide.jobRoles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Briefcase size={14} className="text-[#4A7B5B]" />
                    Potential Job Roles
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeGuide.jobRoles.map((role, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/60"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Higher Study Options */}
              {activeGuide.higherStudyOptions && activeGuide.higherStudyOptions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-[#4A7B5B]" />
                    Higher Study Pathways
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 pl-1">
                    {activeGuide.higherStudyOptions.map((opt, i) => (
                      <li key={i}>{opt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Admission Specific Information */}
              {activeGuide.guideType === "ADMISSION" && (
                <div className="space-y-4">
                  {activeGuide.admissionProcess && (
                    <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-1">
                      <h4 className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-blue-600" />
                        Admission Process & Guidelines
                      </h4>
                      <p className="text-xs text-blue-800/90 leading-relaxed whitespace-pre-wrap">
                        {activeGuide.admissionProcess}
                      </p>
                    </div>
                  )}

                  {activeGuide.applicationProcess && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                      <h4 className="font-bold text-slate-800 text-xs">
                        How to Apply
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {activeGuide.applicationProcess}
                      </p>
                    </div>
                  )}

                  {activeGuide.requiredDocuments && activeGuide.requiredDocuments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <FileCheck2 size={14} className="text-[#4A7B5B]" />
                        Required Verification Documents
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeGuide.requiredDocuments.map((doc, i) => (
                          <div
                            key={i}
                            className="p-2.5 bg-slate-50 border border-gray-100 rounded-xl text-xs font-medium text-slate-700 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4A7B5B]" />
                            {doc}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeGuide.feesInfo && (
                    <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-amber-900 block">
                        Fee Catalog & Payment Guidelines
                      </span>
                      <p className="text-amber-800">{activeGuide.feesInfo}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Full Guide Body Content */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Complete Guidance Content
                </h4>
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed space-y-3 whitespace-pre-wrap font-sans">
                  {activeGuide.content}
                </div>
              </div>

              {/* Related Entities (Courses, Colleges, Exams, Scholarships) */}
              {(activeGuide.course || activeGuide.college || activeGuide.exam || activeGuide.scholarship) && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Related ERP Entities
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeGuide.course && (
                      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Related Course
                        </span>
                        <span className="font-bold text-slate-800 text-xs">
                          {activeGuide.course.name}
                        </span>
                      </div>
                    )}
                    {activeGuide.college && (
                      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Related Institution
                        </span>
                        <span className="font-bold text-slate-800 text-xs">
                          {activeGuide.college.name}
                        </span>
                      </div>
                    )}
                    {activeGuide.exam && (
                      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Related Entrance Exam
                        </span>
                        <span className="font-bold text-slate-800 text-xs">
                          {activeGuide.exam.examName}
                        </span>
                      </div>
                    )}
                    {activeGuide.scholarship && (
                      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Scholarship Opportunity
                        </span>
                        <span className="font-bold text-slate-800 text-xs">
                          {activeGuide.scholarship.scholarshipName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FAQs Accordion */}
              {activeGuide.faqs && activeGuide.faqs.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <HelpCircle size={16} className="text-[#4A7B5B]" />
                    Frequently Asked Questions
                  </h4>
                  <div className="space-y-2">
                    {activeGuide.faqs.map((faq, idx) => {
                      const isOpen = expandedFaqIndex === idx;
                      return (
                        <div
                          key={idx}
                          className="border border-gray-200 rounded-xl overflow-hidden transition-colors"
                        >
                          <button
                            onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                            className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100/70 flex items-center justify-between text-xs font-bold text-slate-800"
                          >
                            <span>{faq.question}</span>
                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {isOpen && (
                            <div className="p-3 bg-white text-xs text-slate-700 leading-relaxed border-t border-gray-100">
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setActiveGuide(null)}
                className="px-4 py-2 bg-white border border-gray-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100"
              >
                Close
              </button>

              <button
                onClick={(e) => handleToggleSave(e, activeGuide)}
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                {savedGuideIds.has(activeGuide.id) ? "Saved in Profile" : "Save to My Guides"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
