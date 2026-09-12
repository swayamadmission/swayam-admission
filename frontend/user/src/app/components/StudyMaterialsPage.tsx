import React, { useState } from "react";
import { Link } from "react-router";
import {
  BookOpen, Search, Download, FileText, Eye, Star,
  Filter, ChevronRight, ArrowRight, Sparkles, Lock,
  FileCode, GraduationCap, BookmarkPlus, BookmarkCheck, X,
  LayoutGrid, List, AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studyMaterialsApi, StudyMaterial, StudyMaterialQueryParams } from "../../api/study-materials.api";
import { useAuth as useAuthContext } from "../../context/AuthContext";
import ErrorState from "./ui/ErrorState";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["All", "Engineering", "Medical", "MBA", "Law", "Commerce", "Science", "Arts"];
const MATERIAL_TYPES = ["All", "PDF", "Notes", "PYQ", "Mock Test", "Sample Paper", "Syllabus", "E-Book", "Assignment"];

const TYPE_CONFIG: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  PDF: { bg: "#FEE2E2", text: "#DC2626", icon: FileText },
  Notes: { bg: "#D1FAE5", text: "#059669", icon: BookOpen },
  PYQ: { bg: "#DBEAFE", text: "#2563EB", icon: FileCode },
  "Mock Test": { bg: "#F3E8FF", text: "#7C3AED", icon: GraduationCap },
  "Sample Paper": { bg: "#FEF3C7", text: "#D97706", icon: FileText },
  Syllabus: { bg: "#E0F2FE", text: "#0284C7", icon: BookOpen },
  Assignment: { bg: "#F1F5F9", text: "#475569", icon: FileText },
  "E-Book": { bg: "#E0F2FE", text: "#0284C7", icon: BookOpen },
};

const getTypeConfig = (type: string) =>
  TYPE_CONFIG[type] ?? { bg: "#E8F3EC", text: "#4A7B5B", icon: FileText };

function MaterialCard({
  m,
  isBookmarked,
  onBookmark,
  onDownload,
}: {
  m: StudyMaterial;
  isBookmarked: boolean;
  onBookmark: (id: string, isBookmarked: boolean) => void;
  onDownload: (m: StudyMaterial) => void;
}) {
  const conf = getTypeConfig(m.materialType);
  const Icon = conf.icon;

  return (
    <div
      className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col gap-3 hover:shadow-md transition-all group"
      style={{ borderTop: `3px solid ${conf.text}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: conf.bg }}
        >
          <Icon size={18} style={{ color: conf.text }} />
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {m.premium && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
              <Lock size={10} /> Premium
            </span>
          )}
          {m.featured && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-600">
              <Star size={10} fill="currentColor" /> Featured
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <h3 className="text-sm font-bold text-[#0F172A] line-clamp-2 leading-snug group-hover:text-[#4A7B5B] transition-colors">
          {m.title}
        </h3>
        {m.description && (
          <p className="text-xs text-[#64748B] mt-1 line-clamp-2">{m.description}</p>
        )}
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: conf.bg, color: conf.text }}
        >
          {m.materialType}
        </span>
        {m.category && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F8FAFC] text-[#64748B]">
            {m.category}
          </span>
        )}
        {m.subject && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F8FAFC] text-[#64748B]">
            {m.subject}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
        <span className="flex items-center gap-1">
          <Download size={11} /> {m.downloadCount.toLocaleString("en-IN")}
        </span>
        <span className="flex items-center gap-1">
          <Eye size={11} /> {m.viewCount.toLocaleString("en-IN")}
        </span>
        {m.fileSize && <span>{m.fileSize}</span>}
        {m.pages && <span>{m.pages} pages</span>}
        {m.language && <span>{m.language}</span>}
      </div>

      {/* Links */}
      {(m.college || m.exam || m.course) && (
        <div className="flex flex-wrap gap-1">
          {m.college && (
            <Link
              to={`/colleges/${m.college.id}`}
              className="text-xs text-[#4A7B5B] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {m.college.name}
            </Link>
          )}
          {m.exam && (
            <Link
              to={`/exams/${m.exam.id}`}
              className="text-xs text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {m.exam.examName}
            </Link>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        <button
          onClick={() => onDownload(m)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ backgroundColor: m.premium ? "#F59E0B" : "#4A7B5B" }}
        >
          {m.premium ? (
            <><Lock size={13} /> Get Access</>
          ) : (
            <><Download size={13} /> Download</>
          )}
        </button>
        <button
          onClick={() => onBookmark(m.id, isBookmarked)}
          className="p-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
          title={isBookmarked ? "Remove bookmark" : "Bookmark"}
        >
          {isBookmarked ? (
            <BookmarkCheck size={16} className="text-[#4A7B5B]" />
          ) : (
            <BookmarkPlus size={16} className="text-[#94A3B8]" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudyMaterialsPage() {
  const { isLoggedIn } = useAuthContext();
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [materialType, setMaterialType] = useState("All");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const params: StudyMaterialQueryParams = {
    page,
    limit: 12,
    q: q || undefined,
    category: category !== "All" ? category : undefined,
    materialType: materialType !== "All" ? materialType : undefined,
    sortBy: "downloadCount",
    sortOrder: "desc",
  };

  const {
    data: materialsRes,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["study_materials", params],
    queryFn: () => studyMaterialsApi.findAll(params),
  });

  const { data: featuredRes } = useQuery({
    queryKey: ["study_materials_featured"],
    queryFn: () => studyMaterialsApi.getFeatured(6),
  });

  const { data: bookmarksRes } = useQuery({
    queryKey: ["study_material_bookmarks"],
    queryFn: () => studyMaterialsApi.getBookmarks(),
    enabled: isLoggedIn,
  });

  const bookmarkedIds = new Set((bookmarksRes?.data?.data ?? []).map((m: StudyMaterial) => m.id));

  const addBookmarkMutation = useMutation({
    mutationFn: (id: string) => studyMaterialsApi.addBookmark(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study_material_bookmarks"] }),
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: (id: string) => studyMaterialsApi.removeBookmark(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study_material_bookmarks"] }),
  });

  const handleBookmark = (id: string, isBookmarked: boolean) => {
    if (!isLoggedIn) {
      alert("Please sign in to bookmark study materials");
      return;
    }
    if (isBookmarked) {
      removeBookmarkMutation.mutate(id);
    } else {
      addBookmarkMutation.mutate(id);
    }
  };

  const handleDownload = (m: StudyMaterial) => {
    studyMaterialsApi.trackDownload(m.id);
    if (m.fileUrl) {
      window.open(m.fileUrl, "_blank");
    } else {
      alert("Download link not available for this material.");
    }
  };

  const materials = materialsRes?.data?.data ?? [];
  const totalPages = materialsRes?.data?.totalPages ?? 1;
  const total = materialsRes?.data?.total ?? 0;
  const featured = featuredRes?.data?.data ?? [];

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Hero Section */}
      <div
        className="relative overflow-hidden py-14 px-4"
        style={{ background: "linear-gradient(135deg, #1a3a2c 0%, #2d5a3d 50%, #4A7B5B 100%)" }}
      >
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-semibold mb-4">
            <Sparkles size={15} />
            Free Study Resources Library
          </div>
          <h1 className="text-white font-extrabold mb-3" style={{ fontSize: "clamp(24px, 4vw, 42px)" }}>
            Study Materials & Resources
          </h1>
          <p className="text-white/80 mb-8 text-base max-w-2xl mx-auto">
            Access thousands of free notes, previous year papers, mock tests, and study guides
            for engineering, medical, MBA and more.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
            <input
              type="text"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search notes, PYQs, mock tests…"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm bg-white shadow-lg border-0 outline-none text-[#0F172A]"
            />
            {q && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                onClick={() => setQ("")}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full bg-white/5" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Featured Materials */}
        {!q && featured.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <Star size={18} className="text-amber-500" fill="currentColor" />
                Featured Resources
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((m: StudyMaterial) => (
                <MaterialCard
                  key={m.id}
                  m={m}
                  isBookmarked={bookmarkedIds.has(m.id)}
                  onBookmark={handleBookmark}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          {/* Category pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.slice(0, 5).map((c) => (
              <button
                key={c}
                onClick={() => { setCategory(c); setPage(1); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: category === c ? "#4A7B5B" : "#F1F5F9",
                  color: category === c ? "#fff" : "#475569",
                }}
              >
                {c}
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569] flex items-center gap-1"
            >
              <Filter size={11} /> Filters
            </button>
          </div>

          <div className="sm:ml-auto flex items-center gap-2">
            <span className="text-sm text-[#94A3B8]">{total} results</span>
            <button
              onClick={() => setView(view === "grid" ? "list" : "grid")}
              className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
            >
              {view === "grid" ? <List size={16} /> : <LayoutGrid size={16} />}
            </button>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none bg-white text-[#0F172A]"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Type</label>
              <select
                value={materialType}
                onChange={(e) => { setMaterialType(e.target.value); setPage(1); }}
                className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none bg-white text-[#0F172A]"
              >
                {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-end">
              <button
                onClick={() => { setQ(""); setCategory("All"); setMaterialType("All"); setPage(1); setShowFilters(false); }}
                className="w-full py-2 rounded-xl text-sm font-semibold border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        {/* Material Type Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {MATERIAL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => { setMaterialType(t); setPage(1); }}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
              style={{
                backgroundColor: materialType === t ? "#4A7B5B" : "#fff",
                color: materialType === t ? "#fff" : "#64748B",
                borderColor: materialType === t ? "#4A7B5B" : "#E2E8F0",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Materials Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] mb-4" />
                <div className="h-4 bg-[#F1F5F9] rounded mb-2" />
                <div className="h-3 bg-[#F1F5F9] rounded w-2/3 mb-4" />
                <div className="h-8 bg-[#F1F5F9] rounded" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Unable to load study materials"
            error={error}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        ) : materials.length === 0 ? (
          <div className="text-center py-20">
            <AlertCircle className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
            <p className="text-[#64748B] font-medium">No study materials found</p>
            <p className="text-sm text-[#94A3B8] mt-1">Try different search terms or filters</p>
            <button
              onClick={() => { setQ(""); setCategory("All"); setMaterialType("All"); }}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "#4A7B5B" }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "flex flex-col gap-3"
            }
          >
            {materials.map((m: StudyMaterial) => (
              <MaterialCard
                key={m.id}
                m={m}
                isBookmarked={bookmarkedIds.has(m.id)}
                onBookmark={handleBookmark}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#E2E8F0] text-[#64748B] disabled:opacity-40 hover:bg-[#F8FAFC]"
            >
              Previous
            </button>
            <span className="text-sm text-[#64748B]">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#E2E8F0] text-[#64748B] disabled:opacity-40 hover:bg-[#F8FAFC]"
            >
              Next
            </button>
          </div>
        )}

        {/* Login CTA */}
        {!isLoggedIn && (
          <div
            className="mt-12 rounded-2xl p-8 text-center"
            style={{ background: "linear-gradient(135deg, #1a3a2c, #2d5a3d)" }}
          >
            <BookOpen className="w-10 h-10 text-white/70 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg mb-2">Unlock Premium Resources</h3>
            <p className="text-white/70 text-sm mb-5">
              Sign in to bookmark materials, track downloads, and get AI-powered recommendations.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-white text-[#1a3a2c] hover:bg-white/90 transition"
            >
              Sign In Now <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
