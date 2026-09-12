import { useState } from "react";
import {
  Search, Plus, Download, LayoutGrid, Table2,
  Calendar, BookOpen, GraduationCap, IndianRupee, Star, Users,
  MoreHorizontal, Edit, Trash2, Eye, ChevronLeft, ChevronRight,
  ChevronDown, Filter, CheckCircle2, Shield, Clock, Award
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  scholarshipsApi,
  type Scholarship,
  type ScholarshipQueryParams,
  type ScholarshipDashboardStats,
} from "../../api/scholarships.api";
import { useDebounce } from "../../hooks/useDebounce";
import ScholarshipFormModal from "./ScholarshipFormModal";
import ScholarshipDetailDrawer from "./ScholarshipDetailDrawer";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Central: { bg: "#DBEAFE", text: "#2563EB" },
  State: { bg: "#F3E8FF", text: "#7C3AED" },
  Private: { bg: "#E0F2FE", text: "#0284C7" },
  Corporate: { bg: "#FEF3C7", text: "#D97706" },
  NGO: { bg: "#D1FAE5", text: "#059669" },
  University: { bg: "#FEE2E2", text: "#DC2626" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PUBLISHED: { bg: "#D1FAE5", text: "#059669" },
  DRAFT: { bg: "#F1F5F9", text: "#64748B" },
  ARCHIVED: { bg: "#FEE2E2", text: "#DC2626" },
};

const labelFmt = (s?: string) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const catConf = (cat?: string) =>
  CATEGORY_COLORS[cat ?? "Central"] ?? { bg: "#E8F3EC", text: "#4A7B5B" };

const defaultStats: ScholarshipDashboardStats = {
  totalScholarships: 0,
  activeScholarships: 0,
  featuredScholarships: 0,
  expiringSoon: 0,
  totalApplications: 0,
  totalProviders: 0,
};

export default function ScholarshipsPage() {
  const queryClient = useQueryClient();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const dSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);

  // Filters
  const [category, setCategory] = useState("");
  const [scholarshipType, setScholarshipType] = useState("");
  const [provider, setProvider] = useState("");
  const [state, setState] = useState("");
  const [expiringSoon, setExpiringSoon] = useState("");
  const [status, setStatus] = useState("");
  const [featured, setFeatured] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string | null>(null);

  // Action menu
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const LIMIT = 20;

  // ── Queries ───────────────────────────────────────────────────────────────
  const params: ScholarshipQueryParams = {
    page,
    limit: LIMIT,
    ...(dSearch && { q: dSearch }),
    ...(category && { category }),
    ...(scholarshipType && { scholarshipType }),
    ...(provider && { provider }),
    ...(state && { state }),
    ...(expiringSoon && { expiringSoon: expiringSoon === "true" }),
    ...(status && { status }),
    ...(featured && { featured: featured === "true" }),
  };

  const { data: statsRes } = useQuery({
    queryKey: ["admin_scholarships_stats"],
    queryFn: () => scholarshipsApi.getStats(),
    staleTime: 60_000,
  });

  const { data: scholarshipsRes, isLoading } = useQuery({
    queryKey: ["admin_scholarships", params],
    queryFn: () => scholarshipsApi.findAll(params),
    staleTime: 30_000,
  });

  const stats = statsRes?.data ?? defaultStats;

  const rawScholarships = scholarshipsRes?.data?.data ?? (Array.isArray(scholarshipsRes?.data) ? scholarshipsRes?.data : []);
  const scholarships = Array.isArray(rawScholarships) ? rawScholarships : [];
  const total = (scholarshipsRes?.data as any)?.total ?? (Array.isArray(scholarshipsRes?.data) ? scholarshipsRes?.data.length : 0);
  const totalPages = (scholarshipsRes?.data as any)?.totalPages ?? Math.max(1, Math.ceil(total / LIMIT));

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => scholarshipsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_scholarships"] });
      queryClient.invalidateQueries({ queryKey: ["admin_scholarships_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      setMenuOpen(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAdd = () => { setSelectedScholarship(null); setIsFormOpen(true); };
  const openEdit = (s: Scholarship) => { setSelectedScholarship(s); setIsFormOpen(true); setIsDrawerOpen(false); };
  const openView = (s: Scholarship) => { setSelectedScholarshipId(s.id); setIsDrawerOpen(true); };

  const handleDelete = (s: Scholarship) => {
    if (window.confirm(`Archive "${s?.scholarshipName ?? 'Scholarship'}"? This is a soft delete.`)) {
      deleteMutation.mutate(s.id);
    }
  };

  const handleExport = async () => {
    try {
      const res = await scholarshipsApi.export(params);
      const blob = new Blob([res.data as BlobPart], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scholarships_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    }
  };

  const resetFilters = () => {
    setCategory(""); setScholarshipType(""); setProvider(""); setState("");
    setExpiringSoon(""); setStatus(""); setFeatured(""); setSearch("");
    setPage(1);
  };

  const hasActiveFilters = !!(
    category || scholarshipType || provider || state || expiringSoon || status || featured || dSearch
  );

  return (
    <div className="p-5 lg:p-8 space-y-5" style={{ background: "#F8FAFC", minHeight: "100%" }}>

      {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Scholarships",
            value: stats?.totalScholarships ?? 0,
            sub: "In catalog",
            icon: Award,
            color: "#4A7B5B",
            bg: "#E8F3EC",
          },
          {
            label: "Active Scholarships",
            value: stats?.activeScholarships ?? 0,
            sub: "Published & open",
            icon: CheckCircle2,
            color: "#0EA5E9",
            bg: "#DBEAFE",
          },
          {
            label: "Expiring Soon",
            value: stats?.expiringSoon ?? 0,
            sub: "Deadline in 30 days",
            icon: Clock,
            color: "#DC2626",
            bg: "#FEE2E2",
          },
          {
            label: "Featured Aid",
            value: stats?.featuredScholarships ?? 0,
            sub: "Highlighted grants",
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
          { label: "Total Applications", value: stats?.totalApplications ?? 0 },
          { label: "Unique Providers", value: stats?.totalProviders ?? 0 },
          { label: "Central Schemes", value: "Active" },
          { label: "State Schemes", value: "Active" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-3 border border-[#F1F5F9] text-center">
            <div className="text-sm font-semibold text-[#0F172A]">{String(s.value ?? 0)}</div>
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
              placeholder="Search scholarship name, provider..."
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
            Add Scholarship
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
                  {["Central", "State", "Private", "Corporate", "NGO"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Type</label>
              <div className="relative">
                <select
                  value={scholarshipType}
                  onChange={(e) => { setScholarshipType(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white appearance-none focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">All Types</option>
                  {["Merit Based", "Need Based", "Minority", "Sports", "General"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Expiring Soon */}
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Deadline</label>
              <div className="relative">
                <select
                  value={expiringSoon}
                  onChange={(e) => { setExpiringSoon(e.target.value); setPage(1); }}
                  className="w-full h-8 px-2 rounded-lg border border-[#E2E8F0] text-xs bg-white appearance-none focus:outline-none focus:border-[#4A7B5B]"
                >
                  <option value="">All Deadlines</option>
                  <option value="true">Expiring in 30 Days</option>
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
          {isLoading ? "Loading..." : `${total.toLocaleString("en-IN")} scholarship${total !== 1 ? "s" : ""} found`}
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
      {!isLoading && scholarships.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#F1F5F9] shadow-sm">
          <Award className="mx-auto h-12 w-12 mb-4" style={{ color: "#CBD5E1" }} />
          <h3 className="text-lg font-semibold text-[#0F172A] mb-1">No scholarships found</h3>
          <p className="text-[#94A3B8] text-sm mb-4">
            {hasActiveFilters
              ? "Try adjusting your search or filter criteria."
              : "Get started by creating your first scholarship scheme."}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ background: "#4A7B5B" }}
            >
              <Plus className="w-4 h-4" />
              Add First Scholarship
            </button>
          )}
        </div>
      )}

      {/* ── TABLE VIEW ───────────────────────────────────────────────────────── */}
      {!isLoading && scholarships.length > 0 && view === "table" && (
        <div
          className="bg-white rounded-2xl border border-[#F1F5F9] overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {[
                    "Scholarship Name",
                    "Provider",
                    "Category",
                    "Type",
                    "Amount (INR)",
                    "Deadline",
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
                {scholarships.map((s, idx) => {
                  const cat = catConf(s?.category);
                  const st = STATUS_COLORS[s?.status ?? "PUBLISHED"] ?? STATUS_COLORS.PUBLISHED;
                  return (
                    <tr
                      key={s.id}
                      className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                      style={{ background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}
                      onClick={() => openView(s)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: cat.bg }}
                          >
                            <Award className="w-4 h-4" style={{ color: cat.text }} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#0F172A] truncate max-w-[220px]">
                              {s.scholarshipName}
                            </div>
                            {s.featured && (
                              <span className="text-xs text-[#D97706]">⭐ Featured</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-[#475569] truncate max-w-[160px]">
                          {s.provider || "Government"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{ background: cat.bg, color: cat.text }}
                        >
                          {s.category || "General"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded">
                          {s.scholarshipType || "Merit"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#0F172A] font-semibold">
                          {s.amount ? `₹${s.amount.toLocaleString("en-IN")}` : "Variable"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#0F172A] font-medium">
                          {s.applicationEnd
                            ? new Date(s.applicationEnd).toLocaleDateString("en-IN")
                            : "Ongoing"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: st.bg, color: st.text }}
                        >
                          {labelFmt(s.status)}
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
                                menuOpen === s.id ? null : s.id
                              )
                            }
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {menuOpen === s.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-8 z-20 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 w-40">
                                <button
                                  onClick={() => { openView(s); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  <Eye className="w-4 h-4 text-[#94A3B8]" />
                                  View Details
                                </button>
                                <button
                                  onClick={() => { openEdit(s); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#374151] hover:bg-[#F8FAFC]"
                                >
                                  <Edit className="w-4 h-4 text-[#94A3B8]" />
                                  Edit Scheme
                                </button>
                                <hr className="my-1 border-[#F1F5F9]" />
                                <button
                                  onClick={() => handleDelete(s)}
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
      {!isLoading && scholarships.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {scholarships.map((s) => {
            const cat = catConf(s?.category);
            const st = STATUS_COLORS[s?.status ?? "PUBLISHED"] ?? STATUS_COLORS.PUBLISHED;
            return (
              <div
                key={s.id}
                onClick={() => openView(s)}
                className="bg-white rounded-2xl border border-[#F1F5F9] p-4 cursor-pointer hover:shadow-md transition-all group"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {/* Card top */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: cat.bg }}
                  >
                    <Award className="w-5 h-5" style={{ color: cat.text }} />
                  </div>
                  <div className="flex items-center gap-1">
                    {s.featured && (
                      <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: st.bg, color: st.text }}
                    >
                      {labelFmt(s.status)}
                    </span>
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-sm font-bold text-[#0F172A] mb-1 line-clamp-2 leading-tight group-hover:text-[#4A7B5B] transition-colors">
                  {s.scholarshipName}
                </h3>
                <p className="text-xs text-[#94A3B8] mb-3 truncate">
                  {s.provider || "Government Authority"}
                </p>

                {/* Chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-md font-medium"
                    style={{ background: cat.bg, color: cat.text }}
                  >
                    {s.category || "General"}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-[#F1F5F9] text-[#64748B]">
                    {s.scholarshipType || "Merit"}
                  </span>
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between pt-3 border-t border-[#F8FAFC]">
                  <div className="text-xs text-[#475569]">
                    Grant: <span className="font-semibold text-[#0F172A]">{s.amount ? `₹${s.amount.toLocaleString("en-IN")}` : "Variable"}</span>
                  </div>
                  <div className="text-xs text-[#94A3B8]">
                    {s.state || "All India"}
                  </div>
                </div>

                {/* Action buttons (appear on hover) */}
                <div className="flex gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                    className="flex-1 h-7 rounded-lg text-xs font-medium flex items-center justify-center gap-1 bg-[#E8F3EC] text-[#4A7B5B]"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
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
      <ScholarshipFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        scholarship={selectedScholarship}
      />

      <ScholarshipDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        scholarshipId={selectedScholarshipId}
        onEdit={openEdit}
      />
    </div>
  );
}
