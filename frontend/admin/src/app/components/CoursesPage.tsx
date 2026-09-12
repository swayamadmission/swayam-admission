import { useState } from "react";
import {
  Search, Plus, Download, LayoutGrid, Table2,
  BookOpen, GraduationCap, IndianRupee, Star, Users,
  MoreHorizontal, Edit, Trash2, Eye, ChevronLeft, ChevronRight,
  ChevronDown, Filter,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi, type Course, type CourseQueryParams } from "../../api/courses.api";
import { useDebounce } from "../../hooks/useDebounce";
import CourseFormModal from "./CourseFormModal";
import CourseDetailDrawer from "./CourseDetailDrawer";

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
  UG: "UG", PG: "PG", DIPLOMA: "Diploma", CERTIFICATE: "Certificate",
  PHD: "PhD", INTEGRATED: "Integrated",
};

const MODE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time", PART_TIME: "Part Time", DISTANCE: "Distance",
  ONLINE: "Online", HYBRID: "Hybrid",
};

const labelFmt = (s?: string) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const catConf = (cat?: string) =>
  CATEGORY_COLORS[cat ?? "OTHER"] ?? CATEGORY_COLORS.OTHER;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const queryClient = useQueryClient();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<"grid" | "table">("table");
  const [search, setSearch] = useState("");
  const dSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);

  // Filters
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [featured, setFeatured] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Action menu
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const LIMIT = 20;

  // ── Queries ───────────────────────────────────────────────────────────────
  const params: CourseQueryParams = {
    page,
    limit: LIMIT,
    ...(dSearch && { q: dSearch }),
    ...(category && { category }),
    ...(level && { level }),
    ...(mode && { mode }),
    ...(status && { status }),
    ...(featured && { featured: featured === "true" }),
  };

  const { data: statsRes } = useQuery({
    queryKey: ["admin_courses_stats"],
    queryFn: () => coursesApi.getStats(),
    staleTime: 60_000,
  });

  const { data: coursesRes, isLoading } = useQuery({
    queryKey: ["admin_courses", params],
    queryFn: () => coursesApi.findAll(params),
    staleTime: 30_000,
  });

  const stats = statsRes?.data;
  const courses = coursesRes?.data?.data ?? [];
  const total = coursesRes?.data?.total ?? 0;
  const totalPages = coursesRes?.data?.totalPages ?? 1;

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => coursesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin_courses_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      setMenuOpen(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAdd = () => { setSelectedCourse(null); setIsFormOpen(true); };
  const openEdit = (c: Course) => { setSelectedCourse(c); setIsFormOpen(true); setIsDrawerOpen(false); };
  const openView = (c: Course) => { setSelectedCourseId(c.id); setIsDrawerOpen(true); };

  const handleDelete = (c: Course) => {
    if (window.confirm(`Archive "${c.name}"? This is a soft delete.`)) {
      deleteMutation.mutate(c.id);
    }
  };

  const handleExport = async () => {
    try {
      const res = await coursesApi.export(params);
      const blob = new Blob([res.data as BlobPart], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `courses_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    }
  };

  const resetFilters = () => {
    setCategory(""); setLevel(""); setMode("");
    setStatus(""); setFeatured(""); setSearch("");
    setPage(1);
  };

  const hasActiveFilters = !!(category || level || mode || status || featured || dSearch);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 lg:p-8 space-y-5" style={{ background: "#F8FAFC", minHeight: "100%" }}>

      {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Courses",
            value: stats?.totalCourses ?? 0,
            sub: "In catalog",
            icon: BookOpen,
            color: "#4A7B5B",
            bg: "#E8F3EC",
          },
          {
            label: "Published",
            value: stats?.activeCourses ?? 0,
            sub: "Live courses",
            icon: GraduationCap,
            color: "#0EA5E9",
            bg: "#DBEAFE",
          },
          {
            label: "Featured",
            value: stats?.featuredCourses ?? 0,
            sub: "Highlighted",
            icon: Star,
            color: "#D97706",
            bg: "#FEF3C7",
          },
          {
            label: "Applications",
            value: stats?.totalApplications ?? 0,
            sub: "Via courses",
            icon: Users,
            color: "#7C3AED",
            bg: "#F3E8FF",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl p-4 border border-[#F1F5F9]"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-2xl font-bold text-[#0F172A]">{s.value.toLocaleString("en-IN")}</div>
                <div className="text-xs text-[#0F172A] font-medium mt-0.5">{s.label}</div>
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
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Colleges Offering", value: stats.collegesOffering },
            { label: "Average Fee", value: `₹${(stats.averageFee ?? 0).toLocaleString("en-IN")}` },
            { label: "Most Popular", value: stats.mostPopularCourse ?? "—" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-3 border border-[#F1F5F9] text-center">
              <div className="text-sm font-semibold text-[#0F172A] truncate">{String(s.value)}</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search courses, colleges..."
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
                color: view === "table" ? "#0F172A" : "#94A3B8",
              }}
            >
              <Table2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView("grid")}
              className="flex items-center px-2.5 h-7 rounded-lg text-xs transition-colors"
              style={{
                background: view === "grid" ? "#fff" : "transparent",
                color: view === "grid" ? "#0F172A" : "#94A3B8",
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
            Add Course
          </button>
        </div>
      </div>

      {/* ── Filter Panel ──────────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

            {/* Mode */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Mode</label>
              <div className="relative">
                <select
                  value={mode}
                  onChange={(e) => { setMode(e.target.value); setPage(1); }}
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
          {isLoading ? "Loading..." : `${total.toLocaleString("en-IN")} course${total !== 1 ? "s" : ""} found`}
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
      {!isLoading && courses.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#F1F5F9] shadow-sm">
          <BookOpen className="mx-auto h-12 w-12 mb-4" style={{ color: "#CBD5E1" }} />
          <h3 className="text-lg font-semibold text-[#0F172A] mb-1">No courses found</h3>
          <p className="text-[#94A3B8] text-sm mb-4">
            {hasActiveFilters
              ? "Try adjusting your search or filter criteria."
              : "Get started by adding the first course."}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ background: "#4A7B5B" }}
            >
              <Plus className="w-4 h-4" />
              Add First Course
            </button>
          )}
        </div>
      )}

      {/* ── TABLE VIEW ───────────────────────────────────────────────────────── */}
      {!isLoading && courses.length > 0 && view === "table" && (
        <div
          className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {[
                    "Course",
                    "College",
                    "Category",
                    "Level",
                    "Mode",
                    "Fee",
                    "Seats",
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
                {courses.map((course, idx) => {
                  const cat = catConf(course.category);
                  const st = STATUS_COLORS[course.status] ?? STATUS_COLORS.DRAFT;
                  return (
                    <tr
                      key={course.id}
                      className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                      style={{ background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}
                      onClick={() => openView(course)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: cat.bg }}
                          >
                            <GraduationCap className="w-4 h-4" style={{ color: cat.text }} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#0F172A] truncate max-w-[200px]">
                              {course.name}
                            </div>
                            {course.featured && (
                              <span className="text-xs text-[#D97706]">⭐ Featured</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[#475569] truncate max-w-[160px]">
                          {course.college?.name ?? "—"}
                        </div>
                        <div className="text-xs text-[#94A3B8]">
                          {course.college?.city ?? ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-medium"
                          style={cat}
                        >
                          {CATEGORY_LABELS[course.category] ?? course.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#475569]">
                          {LEVEL_LABELS[course.level] ?? course.level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#475569]">
                          {MODE_LABELS[course.mode] ?? course.mode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-[#0F172A]">
                          {course.totalFees
                            ? `₹${(course.totalFees / 100000).toFixed(1)}L`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[#475569]">
                          {course.seats ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={st}
                        >
                          {labelFmt(course.status)}
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
                                menuOpen === course.id ? null : course.id
                              )
                            }
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {menuOpen === course.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-8 z-20 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 w-40">
                                <button
                                  onClick={() => { openView(course); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  <Eye className="w-4 h-4 text-[#94A3B8]" />
                                  View Details
                                </button>
                                <button
                                  onClick={() => { openEdit(course); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  <Edit className="w-4 h-4 text-[#94A3B8]" />
                                  Edit Course
                                </button>
                                <hr className="my-1 border-[#F1F5F9]" />
                                <button
                                  onClick={() => handleDelete(course)}
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
      {!isLoading && courses.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courses.map((course) => {
            const cat = catConf(course.category);
            const st = STATUS_COLORS[course.status] ?? STATUS_COLORS.DRAFT;
            return (
              <div
                key={course.id}
                onClick={() => openView(course)}
                className="bg-white rounded-2xl border border-[#F1F5F9] p-4 cursor-pointer hover:shadow-md transition-all group"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {/* Card top */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: cat.bg }}
                  >
                    <GraduationCap className="w-5 h-5" style={{ color: cat.text }} />
                  </div>
                  <div className="flex items-center gap-1">
                    {course.featured && (
                      <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={st}
                    >
                      {labelFmt(course.status)}
                    </span>
                  </div>
                </div>

                {/* Course name */}
                <h3 className="text-sm font-bold text-[#0F172A] mb-1 line-clamp-2 leading-tight group-hover:text-[#4A7B5B] transition-colors">
                  {course.name}
                </h3>
                <p className="text-xs text-[#94A3B8] mb-3 truncate">
                  {course.college?.name ?? ""}
                </p>

                {/* Category + Level chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-md font-medium"
                    style={cat}
                  >
                    {CATEGORY_LABELS[course.category] ?? course.category}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-[#F1F5F9] text-[#64748B]">
                    {LEVEL_LABELS[course.level] ?? course.level}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-[#F1F5F9] text-[#64748B]">
                    {course.duration}Y
                  </span>
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between pt-3 border-t border-[#F8FAFC]">
                  <div className="flex items-center gap-1 text-xs text-[#475569]">
                    <IndianRupee className="w-3 h-3" />
                    {course.totalFees
                      ? `${(course.totalFees / 100000).toFixed(1)}L`
                      : "—"}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                    <Users className="w-3 h-3" />
                    {course._count?.applications ?? 0} apps
                  </div>
                </div>

                {/* Action buttons (appear on hover) */}
                <div className="flex gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(course); }}
                    className="flex-1 h-7 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                    style={{ background: "#E8F3EC", color: "#4A7B5B" }}
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(course); }}
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
      <CourseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        course={selectedCourse}
      />

      <CourseDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        courseId={selectedCourseId}
        onEdit={openEdit}
      />
    </div>
  );
}
