import { useState } from "react";
import {
  Search, Plus, Download, LayoutGrid, Table2,
  FileText, BookOpen, GraduationCap, Eye, Star,
  MoreHorizontal, Edit, Trash2, ChevronLeft, ChevronRight,
  ChevronDown, Filter, CheckCircle2, Lock, DownloadCloud,
  FileCode, Layers, Sparkles, AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  materialsApi,
  type StudyMaterial,
  type StudyMaterialQueryParams,
  type StudyMaterialStats,
} from "../../api/materials.api";
import { useDebounce } from "../../hooks/useDebounce";
import StudyMaterialFormModal from "./StudyMaterialFormModal";
import StudyMaterialDetailDrawer from "./StudyMaterialDetailDrawer";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  PDF: { bg: "#FEE2E2", text: "#DC2626" },
  Notes: { bg: "#D1FAE5", text: "#059669" },
  PYQ: { bg: "#DBEAFE", text: "#2563EB" },
  "Mock Test": { bg: "#F3E8FF", text: "#7C3AED" },
  "Sample Paper": { bg: "#FEF3C7", text: "#D97706" },
  Syllabus: { bg: "#E0F2FE", text: "#0284C7" },
  Assignment: { bg: "#F1F5F9", text: "#475569" },
  "E-Book": { bg: "#E0F2FE", text: "#0284C7" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PUBLISHED: { bg: "#D1FAE5", text: "#059669" },
  DRAFT: { bg: "#F1F5F9", text: "#64748B" },
  ARCHIVED: { bg: "#FEE2E2", text: "#DC2626" },
};

const labelFmt = (s?: string) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const typeConf = (type?: string) =>
  TYPE_COLORS[type ?? "PDF"] ?? { bg: "#E8F3EC", text: "#4A7B5B" };

const defaultStats: StudyMaterialStats = {
  totalMaterials: 0,
  activeMaterials: 0,
  draftMaterials: 0,
  featuredMaterials: 0,
  premiumMaterials: 0,
  totalDownloads: 0,
  totalViews: 0,
  totalPDFs: 0,
  totalMockTests: 0,
  uploadsThisMonth: 0,
};

export default function StudyMaterialsPage() {
  const queryClient = useQueryClient();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const dSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);

  // Filters
  const [category, setCategory] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [subject, setSubject] = useState("");
  const [semester, setSemester] = useState("");
  const [status, setStatus] = useState("");
  const [featured, setFeatured] = useState("");
  const [premium, setPremium] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterial | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  // Action menu
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const LIMIT = 20;

  // ── Queries ───────────────────────────────────────────────────────────────
  const params: StudyMaterialQueryParams = {
    page,
    limit: LIMIT,
    ...(dSearch && { q: dSearch }),
    ...(category && { category }),
    ...(materialType && { materialType }),
    ...(subject && { subject }),
    ...(semester && { semester }),
    ...(status && { status }),
    ...(featured && { featured: featured === "true" }),
    ...(premium && { premium: premium === "true" }),
  };

  const { data: statsRes } = useQuery({
    queryKey: ["admin_materials_stats"],
    queryFn: () => materialsApi.getStats(),
    staleTime: 60_000,
  });

  const { data: materialsRes, isLoading } = useQuery({
    queryKey: ["admin_materials", params],
    queryFn: () => materialsApi.findAll(params),
    staleTime: 30_000,
  });

  const stats = statsRes?.data ?? defaultStats;

  const rawMaterials = materialsRes?.data?.data ?? (Array.isArray(materialsRes?.data) ? materialsRes?.data : []);
  const materials = Array.isArray(rawMaterials) ? rawMaterials : [];
  const total = (materialsRes?.data as any)?.total ?? (Array.isArray(materialsRes?.data) ? materialsRes?.data.length : 0);
  const totalPages = (materialsRes?.data as any)?.totalPages ?? Math.max(1, Math.ceil(total / LIMIT));

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => materialsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_materials"] });
      queryClient.invalidateQueries({ queryKey: ["admin_materials_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      setMenuOpen(null);
    },
  });

  // ── Restore mutation ──────────────────────────────────────────────────────
  const restoreMutation = useMutation({
    mutationFn: (id: string) => materialsApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_materials"] });
      queryClient.invalidateQueries({ queryKey: ["admin_materials_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      setMenuOpen(null);
    },
  });

  // ── Duplicate mutation ────────────────────────────────────────────────────
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => materialsApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_materials"] });
      queryClient.invalidateQueries({ queryKey: ["admin_materials_stats"] });
      setMenuOpen(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAdd = () => { setSelectedMaterial(null); setIsFormOpen(true); };
  const openEdit = (m: StudyMaterial) => { setSelectedMaterial(m); setIsFormOpen(true); setIsDrawerOpen(false); };
  const openView = (m: StudyMaterial) => { setSelectedMaterialId(m.id); setIsDrawerOpen(true); };

  const handleDelete = (m: StudyMaterial) => {
    if (window.confirm(`Archive "${m?.title ?? 'Material'}"?`)) {
      deleteMutation.mutate(m.id);
    }
  };

  const handleRestore = (m: StudyMaterial) => {
    if (window.confirm(`Restore "${m?.title ?? 'Material'}" to Published?`)) {
      restoreMutation.mutate(m.id);
    }
  };

  const handleDuplicate = (m: StudyMaterial) => {
    if (window.confirm(`Duplicate "${m?.title ?? 'Material'}" as a Draft copy?`)) {
      duplicateMutation.mutate(m.id);
    }
  };

  const handleExport = async () => {
    try {
      const res = await materialsApi.export(params);
      const blob = new Blob([res.data as BlobPart], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `study_materials_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    }
  };

  const resetFilters = () => {
    setCategory(""); setMaterialType(""); setSubject(""); setSemester("");
    setStatus(""); setFeatured(""); setPremium(""); setSearch("");
    setPage(1);
  };

  const hasActiveFilters = !!(
    category || materialType || subject || semester || status || featured || premium || dSearch
  );

  return (
    <div className="p-5 lg:p-8 space-y-5" style={{ background: "#F8FAFC", minHeight: "100%" }}>

      {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Learning Resources",
            value: stats?.totalMaterials ?? 0,
            sub: "In digital library",
            icon: BookOpen,
            color: "#4A7B5B",
            bg: "#E8F3EC",
          },
          {
            label: "Active Materials",
            value: stats?.activeMaterials ?? 0,
            sub: "Published & accessible",
            icon: CheckCircle2,
            color: "#0EA5E9",
            bg: "#DBEAFE",
          },
          {
            label: "Total Downloads",
            value: stats?.totalDownloads ?? 0,
            sub: "Student downloads",
            icon: DownloadCloud,
            color: "#2563EB",
            bg: "#DBEAFE",
          },
          {
            label: "Resource Views",
            value: stats?.totalViews ?? 0,
            sub: "Library engagements",
            icon: Eye,
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
                <div className="text-2xl font-bold text-[#0F172A]">
                  {(s.value ?? 0).toLocaleString("en-IN")}
                </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "PDF Documents", value: stats?.totalPDFs ?? 0 },
          { label: "Mock Tests & PYQs", value: stats?.totalMockTests ?? 0 },
          { label: "Draft Materials", value: stats?.draftMaterials ?? 0 },
          { label: "Uploads This Month", value: stats?.uploadsThisMonth ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-3 border border-[#F1F5F9] text-center">
            <div className="text-sm font-semibold text-[#0F172A]">{(s.value ?? 0).toLocaleString("en-IN")}</div>
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
              placeholder="Search resource title, subject..."
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
            Upload Material
          </button>
        </div>
      </div>

      {/* ── Filter Panel ──────────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                  {["ENGINEERING", "MEDICAL", "MANAGEMENT", "LAW", "ARTS", "SCIENCE", "COMMERCE"].map((c) => (
                    <option key={c} value={c}>{labelFmt(c)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Material Type */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Material Type</label>
              <div className="relative">
                <select
                  value={materialType}
                  onChange={(e) => { setMaterialType(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white appearance-none focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">All Types</option>
                  {["PDF", "Notes", "PYQ", "Mock Test", "Sample Paper", "Syllabus", "E-Book"].map((t) => (
                    <option key={t} value={t}>{t}</option>
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
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Premium */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Access</label>
              <div className="relative">
                <select
                  value={premium}
                  onChange={(e) => { setPremium(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white appearance-none focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">All Access</option>
                  <option value="false">Free</option>
                  <option value="true">Premium</option>
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
          {isLoading ? "Loading..." : `${total.toLocaleString("en-IN")} resource${total !== 1 ? "s" : ""} found`}
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
      {!isLoading && materials.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#F1F5F9] shadow-sm">
          <FileText className="mx-auto h-12 w-12 mb-4" style={{ color: "#CBD5E1" }} />
          <h3 className="text-lg font-semibold text-[#0F172A] mb-1">No study materials found</h3>
          <p className="text-[#94A3B8] text-sm mb-4">
            {hasActiveFilters
              ? "Try adjusting your search or filter criteria."
              : "Get started by uploading your first learning material."}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ background: "#4A7B5B" }}
            >
              <Plus className="w-4 h-4" />
              Upload First Material
            </button>
          )}
        </div>
      )}

      {/* ── TABLE VIEW ───────────────────────────────────────────────────────── */}
      {!isLoading && materials.length > 0 && view === "table" && (
        <div
          className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {[
                    "Title",
                    "Category",
                    "Type",
                    "Subject",
                    "Downloads",
                    "Views",
                    "Format",
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
                {materials.map((m, idx) => {
                  const typeC = typeConf(m?.materialType);
                  const st = STATUS_COLORS[m?.status ?? "PUBLISHED"] ?? STATUS_COLORS.PUBLISHED;
                  return (
                    <tr
                      key={m.id}
                      className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                      style={{ background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}
                      onClick={() => openView(m)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: typeC.bg }}
                          >
                            <FileText className="w-4 h-4" style={{ color: typeC.text }} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#0F172A] truncate max-w-[220px]">
                              {m.title}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                              {m.premium && <span className="text-amber-600 font-medium">🔒 Premium</span>}
                              {m.featured && <span className="text-amber-500 font-medium">⭐ Featured</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-[#475569]">
                          {labelFmt(m.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{ background: typeC.bg, color: typeC.text }}
                        >
                          {m.materialType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#475569] font-medium">
                          {m.subject || "General"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#0F172A] font-semibold">
                          {m.downloadCount.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#0F172A] font-medium">
                          {m.viewCount.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                          {m.fileExtension?.toUpperCase() || "PDF"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: st.bg, color: st.text }}
                        >
                          {labelFmt(m.status)}
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
                                menuOpen === m.id ? null : m.id
                              )
                            }
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {menuOpen === m.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-8 z-20 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 w-44">
                                <button
                                  onClick={() => { openView(m); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  <Eye className="w-4 h-4 text-[#94A3B8]" />
                                  View Details
                                </button>
                                <button
                                  onClick={() => { openEdit(m); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  <Edit className="w-4 h-4 text-[#94A3B8]" />
                                  Edit Resource
                                </button>
                                <button
                                  onClick={() => handleDuplicate(m)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  <Layers className="w-4 h-4 text-[#94A3B8]" />
                                  Duplicate
                                </button>
                                <hr className="my-1 border-[#F1F5F9]" />
                                {m.status === 'ARCHIVED' ? (
                                  <button
                                    onClick={() => handleRestore(m)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Restore
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDelete(m)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Archive
                                  </button>
                                )}
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
      {!isLoading && materials.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {materials.map((m) => {
            const typeC = typeConf(m?.materialType);
            const st = STATUS_COLORS[m?.status ?? "PUBLISHED"] ?? STATUS_COLORS.PUBLISHED;
            return (
              <div
                key={m.id}
                onClick={() => openView(m)}
                className="bg-white rounded-2xl border border-[#F1F5F9] p-4 cursor-pointer hover:shadow-md transition-all group"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {/* Top bar */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: typeC.bg }}
                  >
                    <FileText className="w-5 h-5" style={{ color: typeC.text }} />
                  </div>
                  <div className="flex items-center gap-1">
                    {m.premium && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: st.bg, color: st.text }}
                    >
                      {labelFmt(m.status)}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-[#0F172A] mb-1 line-clamp-2 leading-tight group-hover:text-[#4A7B5B] transition-colors">
                  {m.title}
                </h3>
                <p className="text-xs text-[#94A3B8] mb-3 truncate">
                  {m.subject || labelFmt(m.category)}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-md font-medium"
                    style={{ background: typeC.bg, color: typeC.text }}
                  >
                    {m.materialType}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-[#F1F5F9] text-[#64748B]">
                    {m.fileExtension?.toUpperCase() || "PDF"}
                  </span>
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between pt-3 border-t border-[#F8FAFC] text-xs text-[#94A3B8]">
                  <span>{m.downloadCount.toLocaleString("en-IN")} downloads</span>
                  <span>{m.fileSize || `${m.pages ?? 0} pgs`}</span>
                </div>

                {/* Hover action buttons */}
                <div className="flex gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(m); }}
                    className="flex-1 h-7 rounded-lg text-xs font-medium flex items-center justify-center gap-1 bg-[#E8F3EC] text-[#4A7B5B]"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(m); }}
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
      <StudyMaterialFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        material={selectedMaterial}
      />

      <StudyMaterialDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        materialId={selectedMaterialId}
        onEdit={openEdit}
      />
    </div>
  );
}
