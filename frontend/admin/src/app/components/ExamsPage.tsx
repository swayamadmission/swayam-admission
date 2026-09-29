import { useState } from "react";
import {
  Search, Plus, Download, LayoutGrid, Table2,
  Calendar, BookOpen, GraduationCap, IndianRupee, Star, Users,
  MoreHorizontal, Edit, Trash2, Eye, ChevronLeft, ChevronRight,
  ChevronDown, Filter, CheckCircle2, Shield, Clock
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { examsApi, type Exam, type ExamQueryParams, type ExamDashboardStats } from "../../api/exams.api";
import { organizationApi, StateItem } from "../../api/organization.api";
import { useDebounce } from "../../hooks/useDebounce";
import ExamFormModal from "./ExamFormModal";
import ExamDetailDrawer from "./ExamDetailDrawer";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  ENGINEERING: "Engineering",
  MANAGEMENT: "Management",
  MEDICAL: "Medical",
  LAW: "Law",
  ARTS: "Arts",
  SCIENCE: "Science",
  COMMERCE: "Commerce",
  PHARMACY: "Pharmacy",
  EDUCATION: "Education",
  DESIGN: "Design",
  AGRICULTURE: "Agriculture",
  COMPUTER_APPLICATIONS: "Computer Apps",
  HOTEL_MANAGEMENT: "Hotel Mgmt",
  NURSING: "Nursing",
  OTHER: "Other",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  ENGINEERING: { bg: "#DBEAFE", text: "#2563EB" },
  MANAGEMENT: { bg: "#F3E8FF", text: "#7C3AED" },
  MEDICAL: { bg: "#FEE2E2", text: "#DC2626" },
  LAW: { bg: "#FEF3C7", text: "#D97706" },
  ARTS: { bg: "#E0F2FE", text: "#0284C7" },
  SCIENCE: { bg: "#D1FAE5", text: "#059669" },
  COMMERCE: { bg: "#FED7AA", text: "#EA580C" },
  PHARMACY: { bg: "#E8F3EC", text: "#4A7B5B" },
  OTHER: { bg: "#F1F5F9", text: "#64748B" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PUBLISHED: { bg: "#D1FAE5", text: "#059669" },
  DRAFT: { bg: "#F1F5F9", text: "#64748B" },
  ARCHIVED: { bg: "#FEE2E2", text: "#DC2626" },
};

const LEVEL_LABELS: Record<string, string> = {
  NATIONAL: "National",
  STATE: "State",
  PRIVATE: "Private",
  UG: "UG",
  PG: "PG",
};

const MODE_LABELS: Record<string, string> = {
  ONLINE: "Online (CBT)",
  OFFLINE: "Offline (Pen-Paper)",
  HYBRID: "Hybrid",
};

const labelFmt = (s?: string) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const catConf = (cat?: string) =>
  CATEGORY_COLORS[cat ?? "OTHER"] ?? CATEGORY_COLORS.OTHER;

const defaultStats: ExamDashboardStats = {
  totalExams: 0,
  upcomingExams: 0,
  openRegistrations: 0,
  closedRegistrations: 0,
  resultsDeclared: 0,
  featuredExams: 0,
  nationalExams: 0,
  stateExams: 0,
  privateExams: 0,
  mostAppliedExam: "N/A",
  averageApplications: 0,
  latestExam: "N/A",
};

export default function ExamsPage() {
  const queryClient = useQueryClient();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const dSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);

  // Filters
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [examMode, setExamMode] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [status, setStatus] = useState("");
  const [featured, setFeatured] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Action menu
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const LIMIT = 20;

  // ── States Query ───────────────────────────────────────────────────────────
  const { data: statesRes } = useQuery({
    queryKey: ["geography_states"],
    queryFn: () => organizationApi.getStates(),
    staleTime: 60_000,
  });
  const statesList: StateItem[] = Array.isArray(statesRes) ? statesRes : (statesRes as any)?.data || [];

  // ── Queries ───────────────────────────────────────────────────────────────
  const params: ExamQueryParams = {
    page,
    limit: LIMIT,
    ...(dSearch && { q: dSearch }),
    ...(category && { category }),
    ...(level && { level }),
    ...(examMode && { examMode }),
    ...(registrationStatus && { registrationStatus }),
    ...(status && { status }),
    ...(stateFilter && { state: stateFilter }),
    ...(featured && { featured: featured === "true" }),
  };

  const { data: statsRes } = useQuery({
    queryKey: ["admin_exams_stats"],
    queryFn: () => examsApi.getStats(),
    staleTime: 60_000,
  });

  const { data: examsRes, isLoading } = useQuery({
    queryKey: ["admin_exams", params],
    queryFn: () => examsApi.findAll(params),
    staleTime: 30_000,
  });

  const stats = statsRes?.data ?? defaultStats;

  const rawExams = examsRes?.data?.data ?? (Array.isArray(examsRes?.data) ? examsRes?.data : []);
  const exams = Array.isArray(rawExams) ? rawExams : [];
  const total = (examsRes?.data as any)?.total ?? (Array.isArray(examsRes?.data) ? examsRes?.data.length : 0);
  const totalPages = (examsRes?.data as any)?.totalPages ?? Math.max(1, Math.ceil(total / LIMIT));

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => examsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_exams"] });
      queryClient.invalidateQueries({ queryKey: ["admin_exams_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      setMenuOpen(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAdd = () => { setSelectedExam(null); setIsFormOpen(true); };
  const openEdit = (e: Exam) => { setSelectedExam(e); setIsFormOpen(true); setIsDrawerOpen(false); };
  const openView = (e: Exam) => { setSelectedExamId(e.id); setIsDrawerOpen(true); };

  const handleDelete = (e: Exam) => {
    if (window.confirm(`Archive "${e?.examName ?? 'Exam'}"? This is a soft delete.`)) {
      deleteMutation.mutate(e.id);
    }
  };

  const handleExport = async () => {
    try {
      const res = await examsApi.export(params);
      const blob = new Blob([res.data as BlobPart], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exams_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    }
  };

  const resetFilters = () => {
    setCategory(""); setLevel(""); setExamMode("");
    setRegistrationStatus(""); setStatus(""); setFeatured(""); setSearch("");
    setStateFilter("");
    setPage(1);
  };

  const hasActiveFilters = !!(
    category || level || examMode || registrationStatus || status || featured || dSearch || stateFilter
  );

  return (
    <div className="p-5 lg:p-8 space-y-5" style={{ background: "#F8FAFC", minHeight: "100%" }}>

      {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Exams",
            value: stats?.totalExams ?? 0,
            sub: "In catalog",
            icon: Calendar,
            color: "#4A7B5B",
            bg: "#E8F3EC",
          },
          {
            label: "Upcoming Exams",
            value: stats?.upcomingExams ?? 0,
            sub: "Future dates",
            icon: Clock,
            color: "#0EA5E9",
            bg: "#DBEAFE",
          },
          {
            label: "Open Registrations",
            value: stats?.openRegistrations ?? 0,
            sub: "Active applications",
            icon: CheckCircle2,
            color: "#059669",
            bg: "#D1FAE5",
          },
          {
            label: "Featured Exams",
            value: stats?.featuredExams ?? 0,
            sub: "Highlighted",
            icon: Star,
            color: "#D97706",
            bg: "#FEF3C7",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl p-4 border border-[#F1F5F9]"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-2xl font-bold text-[#4A7B5B]">
                  {(s.value ?? 0).toLocaleString("en-IN")}
                </div>
                <div className="text-xs text-[#4A7B5B] font-medium mt-0.5">{s.label}</div>
                <div className="text-xs text-[#94A3B8]">{s.sub}</div>
              </div>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: s.bg }}
              >
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "National Exams", value: stats?.nationalExams ?? 0 },
          { label: "State Exams", value: stats?.stateExams ?? 0 },
          { label: "Closed Registrations", value: stats?.closedRegistrations ?? 0 },
          { label: "Results Declared", value: stats?.resultsDeclared ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-3 border border-[#F1F5F9] text-center">
            <div className="text-sm font-semibold text-[#4A7B5B]">{String(s.value ?? 0)}</div>
            <div className="text-xs text-[#94A3B8] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search exams, conducted by..."
              className="w-64 h-9 pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:border-[#4A7B5B] transition-colors"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`h-9 px-3 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-colors ${
              hasActiveFilters
                ? "border-[#4A7B5B] text-[#4A7B5B] bg-[#E8F3EC]"
                : "border-[#E2E8F0] text-[#475569] bg-white hover:bg-[#F8FAFC]"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span
                className="w-4 h-4 rounded-full text-xs flex items-center justify-center text-white"
                style={{ background: "#4A7B5B", fontSize: "10px" }}
              >
                ✓
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#94A3B8] hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] text-sm font-medium flex items-center gap-1.5 hover:bg-[#F8FAFC] transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          {/* View Toggle */}
          <div className="flex items-center bg-[#F1F5F9] rounded-xl p-0.5">
            <button
              onClick={() => setView("table")}
              className="flex items-center px-2.5 h-7 rounded-lg text-xs transition-colors"
              style={{
                background: view === "table" ? "#fff" : "transparent",
                color: view === "table" ? "#4A7B5B" : "#94A3B8",
              }}
            >
              <Table2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView("grid")}
              className="flex items-center px-2.5 h-7 rounded-lg text-xs transition-colors"
              style={{
                background: view === "grid" ? "#fff" : "transparent",
                color: view === "grid" ? "#4A7B5B" : "#94A3B8",
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={openAdd}
            className="h-9 px-4 rounded-xl text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
            style={{ background: "#4A7B5B" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Exam
          </button>
        </div>
      </div>

      {/* ── Filter Panel ──────────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white appearance-none focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">All Categories</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Level */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Level</label>
              <div className="relative">
                <select
                  value={level}
                  onChange={(e) => { setLevel(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white appearance-none focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">All Levels</option>
                  {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* State Filter */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">State</label>
              <div className="relative">
                <select
                  value={stateFilter}
                  onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white appearance-none focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">All States</option>
                  {statesList.map((st) => (
                    <option key={st.id} value={st.name}>
                      {st.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Mode */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Exam Mode</label>
              <div className="relative">
                <select
                  value={examMode}
                  onChange={(e) => { setExamMode(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white appearance-none focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">All Modes</option>
                  {Object.entries(MODE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Registration Status */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Reg. Timeline</label>
              <div className="relative">
                <select
                  value={registrationStatus}
                  onChange={(e) => { setRegistrationStatus(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white appearance-none focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">All Timeline</option>
                  <option value="OPEN">Open Registrations</option>
                  <option value="UPCOMING">Upcoming Exams</option>
                  <option value="CLOSED">Closed Registrations</option>
                  <option value="RESULTS">Results Declared</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Status</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white appearance-none focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">All Statuses</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Featured */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Featured</label>
              <div className="relative">
                <select
                  value={featured}
                  onChange={(e) => { setFeatured(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white appearance-none focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">All</option>
                  <option value="true">Featured Only</option>
                  <option value="false">Not Featured</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Result count ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-[#94A3B8]">
        <span>
          {isLoading ? "Loading..." : `${total.toLocaleString("en-IN")} exam${total !== 1 ? "s" : ""} found`}
        </span>
        {total > 0 && (
          <span>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* ── Loading Skeleton ──────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#F1F5F9] p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="h-4 bg-gray-100 rounded w-48" />
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-4 bg-gray-100 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────────────────── */}
      {!isLoading && exams.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#F1F5F9] shadow-sm">
          <Calendar className="mx-auto h-12 w-12 mb-4" style={{ color: "#CBD5E1" }} />
          <h3 className="text-lg font-semibold text-[#4A7B5B] mb-1">No exams found</h3>
          <p className="text-[#94A3B8] text-sm mb-4">
            {hasActiveFilters
              ? "Try adjusting your search or filter criteria."
              : "Get started by adding your first entrance exam."}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ background: "#4A7B5B" }}
            >
              <Plus className="w-4 h-4" />
              Add First Exam
            </button>
          )}
        </div>
      )}

      {/* ── TABLE VIEW ───────────────────────────────────────────────────────── */}
      {!isLoading && exams.length > 0 && view === "table" && (
        <div
          className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {[
                    "Exam Name",
                    "Conducted By",
                    "Category",
                    "Level",
                    "Exam Mode",
                    "Reg. Deadline",
                    "Exam Date",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-[#64748B]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exams.map((exam, idx) => {
                  const cat = catConf(exam?.category);
                  const st = STATUS_COLORS[exam?.status ?? "PUBLISHED"] ?? STATUS_COLORS.PUBLISHED;
                  return (
                    <tr
                      key={exam.id}
                      className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                      style={{ background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}
                      onClick={() => openView(exam)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: cat.bg }}
                          >
                            <Calendar className="w-4 h-4" style={{ color: cat.text }} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#4A7B5B] truncate max-w-[220px]">
                              {exam.examName}
                            </div>
                            {exam.featured && (
                              <span className="text-xs text-[#D97706]">⭐ Featured</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-[#475569] truncate max-w-[160px]">
                          {exam.conductedBy || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{ backgroundColor: cat.bg, color: cat.text }}
                        >
                          {CATEGORY_LABELS[exam.category] ?? exam.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded">
                          {exam.state?.name || (LEVEL_LABELS[exam.level] ?? exam.level)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#475569]">
                          {MODE_LABELS[exam.examMode ?? "ONLINE"] ?? exam.examMode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#4A7B5B] font-medium">
                          {exam.applicationEnd
                            ? new Date(exam.applicationEnd).toLocaleDateString("en-IN")
                            : "TBA"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#4A7B5B] font-medium">
                          {exam.examDate
                            ? new Date(exam.examDate).toLocaleDateString("en-IN")
                            : "TBA"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: st.bg, color: st.text }}
                        >
                          {labelFmt(exam.status)}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative">
                          <button
                            onClick={() =>
                              setMenuOpen(
                                menuOpen === exam.id ? null : exam.id
                              )
                            }
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {menuOpen === exam.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-8 z-20 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 w-40">
                                <button
                                  onClick={() => { openView(exam); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  <Eye className="w-4 h-4 text-[#94A3B8]" />
                                  View Details
                                </button>
                                <button
                                  onClick={() => { openEdit(exam); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  <Edit className="w-4 h-4 text-[#94A3B8]" />
                                  Edit Exam
                                </button>
                                <hr className="my-1 border-[#F1F5F9]" />
                                <button
                                  onClick={() => handleDelete(exam)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Archive
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── GRID VIEW ────────────────────────────────────────────────────────── */}
      {!isLoading && exams.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {exams.map((exam) => {
            const cat = catConf(exam?.category);
            const st = STATUS_COLORS[exam?.status ?? "PUBLISHED"] ?? STATUS_COLORS.PUBLISHED;
            return (
              <div
                key={exam.id}
                onClick={() => openView(exam)}
                className="bg-white rounded-2xl border border-[#F1F5F9] p-4 cursor-pointer hover:shadow-md transition-all group"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {/* Card top */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: cat.bg }}
                  >
                    <Calendar className="w-5 h-5" style={{ color: cat.text }} />
                  </div>
                  <div className="flex items-center gap-1">
                    {exam.featured && (
                      <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: st.bg, color: st.text }}
                    >
                      {labelFmt(exam.status)}
                    </span>
                  </div>
                </div>

                {/* Exam Name */}
                <h3 className="text-sm font-bold text-[#4A7B5B] mb-1 line-clamp-2 leading-tight group-hover:text-[#4A7B5B] transition-colors">
                  {exam.examName}
                </h3>
                <p className="text-xs text-[#94A3B8] mb-3 truncate">
                  {exam.conductedBy || "National Testing Authority"}
                </p>

                {/* Chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-md font-medium"
                    style={{ backgroundColor: cat.bg, color: cat.text }}
                  >
                    {CATEGORY_LABELS[exam.category] ?? exam.category}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-[#F1F5F9] text-[#64748B]">
                    {LEVEL_LABELS[exam.level] ?? exam.level}
                  </span>
                  {exam.state && (
                    <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-[#E8F3EC] text-[#4A7B5B]">
                      📍 {exam.state.name}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-[#F1F5F9] text-[#64748B]">
                    {exam.examMode ?? "ONLINE"}
                  </span>
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between pt-3 border-t border-[#F8FAFC]">
                  <div className="text-xs text-[#475569]">
                    Fee: <span className="font-semibold text-[#4A7B5B]">{exam.applicationFee ? `₹${exam.applicationFee}` : "Free"}</span>
                  </div>
                  <div className="text-xs text-[#94A3B8]">
                    {(exam.courses ?? []).length} Courses
                  </div>
                </div>

                {/* Action buttons (appear on hover) */}
                <div className="flex gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(exam); }}
                    className="flex-1 h-7 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                    style={{ background: "#E8F3EC", color: "#4A7B5B" }}
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(exam); }}
                    className="h-7 px-2 rounded-lg text-xs text-red-600 border border-red-100 hover:bg-red-50 flex items-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────────── */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-8 w-8 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p: number;
            if (totalPages <= 7) {
              p = i + 1;
            } else if (page <= 4) {
              p = i + 1;
            } else if (page >= totalPages - 3) {
              p = totalPages - 6 + i;
            } else {
              p = page - 3 + i;
            }
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="h-8 w-8 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: page === p ? "#4A7B5B" : "white",
                  color: page === p ? "white" : "#475569",
                  border: `1px solid ${page === p ? "#4A7B5B" : "#E2E8F0"}`,
                }}
              >
                {p}
              </button>
            );
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-8 w-8 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <ExamFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        exam={selectedExam}
      />

      <ExamDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        examId={selectedExamId}
        onEdit={openEdit}
      />
    </div>
  );
}
