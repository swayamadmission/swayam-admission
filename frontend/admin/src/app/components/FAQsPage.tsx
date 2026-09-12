import { useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  HelpCircle,
  Eye,
  Download,
  Copy,
  LayoutGrid,
  List,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { faqsApi, FaqQueryParams, FaqDto } from "../../api/faqs.api";
import { useDebounce } from "../../hooks/useDebounce";
import FAQFormModal from "./FAQFormModal";
import FAQDetailDrawer from "./FAQDetailDrawer";

export default function FAQsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);

  // Modal & Drawer State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [inspectFaq, setInspectFaq] = useState<any>(null);

  const queryParams: FaqQueryParams = { page, limit: 15 };
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (selectedCategory !== "All") queryParams.category = selectedCategory;
  if (selectedStatus !== "All") queryParams.status = selectedStatus;

  // 1. Stats Query
  const { data: statsRes } = useQuery({
    queryKey: ["admin_faq_stats"],
    queryFn: () => faqsApi.getStats(),
  });

  // 2. Paginated FAQs Query
  const { data: faqsRes, isLoading } = useQuery({
    queryKey: ["admin_faqs", queryParams],
    queryFn: () => faqsApi.findAll(queryParams),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: FaqDto) => faqsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_faqs"] });
      queryClient.invalidateQueries({ queryKey: ["admin_faq_stats"] });
      setIsFormOpen(false);
      setEditingFaq(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FaqDto> }) =>
      faqsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_faqs"] });
      queryClient.invalidateQueries({ queryKey: ["admin_faq_stats"] });
      setIsFormOpen(false);
      setEditingFaq(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => faqsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_faqs"] });
      queryClient.invalidateQueries({ queryKey: ["admin_faq_stats"] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => faqsApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_faqs"] });
      queryClient.invalidateQueries({ queryKey: ["admin_faq_stats"] });
    },
  });

  const handleExportCsv = async () => {
    try {
      const response = await faqsApi.exportCsv(queryParams);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `faqs_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("Failed to export CSV");
    }
  };

  const stats = statsRes?.data || {
    totalFaqs: 0,
    publishedFaqs: 0,
    draftFaqs: 0,
    featuredFaqs: 0,
    totalViews: 0,
    avgHelpfulPercent: 100,
    categoriesCount: 0,
  };

  const FAQS = faqsRes?.data?.data || [];
  const meta = faqsRes?.data?.meta || { totalPages: 1, total: 0 };

  return (
    <div className="p-5 lg:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Enterprise Knowledge Base & FAQs
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 text-white uppercase tracking-wider">
              GEO Engine
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Centralized platform FAQ management, Schema.org FAQPage generator, and Knowledge Graph entity linking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="bg-white border border-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-xs"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={() => {
              setEditingFaq(null);
              setIsFormOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add FAQ
          </button>
        </div>
      </div>

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Total FAQs</div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">
            {stats.totalFaqs}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Published</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">
            {stats.publishedFaqs}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Drafts</div>
          <div className="text-xl font-extrabold text-amber-600 mt-1">
            {stats.draftFaqs}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Featured</div>
          <div className="text-xl font-extrabold text-blue-600 mt-1">
            {stats.featuredFaqs}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Total Views</div>
          <div className="text-xl font-extrabold text-purple-600 mt-1">
            {stats.totalViews.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Satisfaction</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-1">
            <ThumbsUp size={16} className="text-emerald-500" /> {stats.avgHelpfulPercent}%
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search FAQs by question, answer, or tags..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All">All Categories</option>
            <option value="Admission">Admission</option>
            <option value="College">College</option>
            <option value="Course">Course</option>
            <option value="Exam">Exam</option>
            <option value="Scholarship">Scholarship</option>
            <option value="Hostel">Hostel</option>
            <option value="Placement">Placement</option>
            <option value="Fee">Fee</option>
            <option value="General">General</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0 self-end md:self-auto">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              viewMode === "table"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              viewMode === "grid"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Content Rendering */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400 text-xs">
          Loading Knowledge Base FAQs...
        </div>
      ) : FAQS.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-xs space-y-3">
          <HelpCircle className="mx-auto text-gray-300" size={40} />
          <div className="text-base font-bold text-gray-900">No FAQs found</div>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Get started by creating your first FAQ item for the platform.
          </p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Question & Answer</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Views</th>
                  <th className="px-6 py-3.5">Helpful</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {FAQS.map((faq: any) => {
                  const totalVotes =
                    (faq.helpfulCount || 0) + (faq.notHelpfulCount || 0);
                  const helpfulPct =
                    totalVotes > 0
                      ? Math.round(((faq.helpfulCount || 0) / totalVotes) * 100)
                      : 100;

                  return (
                    <tr
                      key={faq.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 max-w-md">
                        <button
                          onClick={() => setInspectFaq(faq)}
                          className="font-bold text-gray-900 hover:text-blue-600 transition-colors text-left line-clamp-1 block"
                        >
                          {faq.question}
                        </button>
                        <div className="text-gray-500 text-[11px] line-clamp-2 mt-1">
                          {faq.answer}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                          {faq.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                            faq.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {faq.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-700">
                        {faq.views || 0}
                      </td>
                      <td className="px-6 py-4 font-semibold text-emerald-600">
                        {helpfulPct}%
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setInspectFaq(faq)}
                            title="Inspect Details"
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingFaq(faq);
                              setIsFormOpen(true);
                            }}
                            title="Edit"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => duplicateMutation.mutate(faq.id)}
                            title="Duplicate"
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${faq.question}"?`)) {
                                deleteMutation.mutate(faq.id);
                              }
                            }}
                            title="Delete"
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>
              Showing page {page} of {meta.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FAQS.map((faq: any) => (
            <div
              key={faq.id}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-bold">
                    {faq.category}
                  </span>
                  <span className="text-[11px] text-gray-400">{faq.views} views</span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm line-clamp-2">
                  {faq.question}
                </h4>
                <p className="text-gray-500 text-xs line-clamp-3 leading-relaxed">
                  {faq.answer}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-emerald-600 font-bold">
                  {faq.helpfulCount || 0} helpful votes
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setInspectFaq(faq)}
                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingFaq(faq);
                      setIsFormOpen(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(faq.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <FAQFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingFaq(null);
        }}
        initialData={editingFaq}
        onSubmit={(data) => {
          if (editingFaq?.id) {
            updateMutation.mutate({ id: editingFaq.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Inspection Drawer */}
      <FAQDetailDrawer
        faq={inspectFaq}
        isOpen={!!inspectFaq}
        onClose={() => setInspectFaq(null)}
        onEdit={(f) => {
          setInspectFaq(null);
          setEditingFaq(f);
          setIsFormOpen(true);
        }}
      />
    </div>
  );
}
