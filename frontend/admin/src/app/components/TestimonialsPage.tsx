import { useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Star,
  RotateCcw,
  CheckCircle2,
  LayoutGrid,
  List,
  Archive,
  MapPin,
  Building2,
  GraduationCap,
  Download,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  testimonialsApi,
  TestimonialDto,
  TestimonialQueryParams,
} from "../../api/testimonials.api";
import { useDebounce } from "../../hooks/useDebounce";
import { usePermissions } from "../../hooks/usePermissions";
import TestimonialFormModal from "./TestimonialFormModal";

export default function TestimonialsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canView = hasPermission("success-stories.view") || hasPermission("testimonials.view");
  const canCreate = hasPermission("success-stories.create") || hasPermission("testimonials.create");
  const canEdit = hasPermission("success-stories.edit") || hasPermission("testimonials.edit");
  const canDelete = hasPermission("success-stories.delete") || hasPermission("testimonials.delete");
  const canExport = hasPermission("success-stories.export") || hasPermission("testimonials.export");
  const canApprove = hasPermission("success-stories.approve") || hasPermission("testimonials.approve") || hasPermission("testimonials.publish");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<TestimonialDto | null>(null);

  const queryParams: TestimonialQueryParams = { page, limit: 15 };
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (selectedStatus !== "All") queryParams.status = selectedStatus;

  // 1. Stats Query
  const { data: statsRes } = useQuery({
    queryKey: ["admin_testimonial_stats"],
    queryFn: () => testimonialsApi.getStats(),
  });

  // 2. Paginated Testimonials Query
  const { data: storiesRes, isLoading } = useQuery({
    queryKey: ["admin_testimonials", queryParams],
    queryFn: () => testimonialsApi.findAll(queryParams),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: TestimonialDto) => testimonialsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["admin_testimonial_stats"] });
      setIsFormOpen(false);
      setEditingStory(null);
      toast.success("Success story published successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to save story");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TestimonialDto> }) =>
      testimonialsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["admin_testimonial_stats"] });
      setIsFormOpen(false);
      setEditingStory(null);
      toast.success("Success story updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update story");
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => testimonialsApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["admin_testimonial_stats"] });
      toast.success("Story is now live on Home Page!");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => testimonialsApi.unpublish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["admin_testimonial_stats"] });
      toast.success("Story moved to draft.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => testimonialsApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["admin_testimonial_stats"] });
      toast.success("Story archived.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => testimonialsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["admin_testimonial_stats"] });
      toast.success("Story deleted.");
    },
  });

  const handleExportCsv = async () => {
    try {
      const res = await testimonialsApi.exportCsv();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `testimonials-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Testimonials exported successfully!");
    } catch (e) {
      toast.error("Failed to export testimonials CSV");
    }
  };

  const stats = statsRes?.data || {
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    featured: 0,
  };

  const stories = storiesRes?.data?.data || [];
  const meta = {
    total: storiesRes?.data?.total || 0,
    page: storiesRes?.data?.page || 1,
    totalPages: storiesRes?.data?.totalPages || 1,
  };

  if (!canView) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-md text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Lock size={22} />
          </div>
          <h2 className="text-base font-bold text-gray-900">Access Restricted</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Your role does not have authorization to view Student Success Stories. Contact your administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Student Success Stories & Testimonials
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#4A7B5B] text-white uppercase tracking-wider">
              Home Page Sync
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage verified student testimonials, admission outcomes, and rating showcases for the Home Page.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canExport && (
            <button
              onClick={handleExportCsv}
              className="bg-white border border-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-xs"
            >
              <Download size={15} /> Export CSV
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => {
                setEditingStory(null);
                setIsFormOpen(true);
              }}
              className="bg-[#4A7B5B] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-[#3d694d] transition-colors shadow-sm"
            >
              <Plus size={16} /> Add Success Story
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Total Stories</div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Published Live</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{stats.published}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Drafts</div>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{stats.draft}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Featured</div>
          <div className="text-xl font-extrabold text-blue-600 mt-1">{stats.featured}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Archived</div>
          <div className="text-xl font-extrabold text-slate-500 mt-1">{stats.archived}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {["All", "PUBLISHED", "DRAFT", "ARCHIVED"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => {
              setSelectedStatus(st);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedStatus === st
                ? "bg-[#4A7B5B] text-white shadow-xs"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {st === "All" ? `All Stories (${stats.total})` : st}
          </button>
        ))}
      </div>

      {/* Search Bar & View Mode Toggle */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student, course, college, state, or story text..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20"
          />
        </div>
        <div className="flex items-center gap-1 border border-gray-200 rounded-xl p-1 bg-gray-50/50">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "table" ? "bg-white shadow-xs text-[#4A7B5B]" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "grid" ? "bg-white shadow-xs text-[#4A7B5B]" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400 text-xs">
          Loading student success stories...
        </div>
      ) : stories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-xs space-y-3">
          <Star className="mx-auto text-gray-300" size={40} />
          <div className="text-base font-bold text-gray-900">No Success Stories found</div>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Get started by adding a student testimonial to display on the Home Page.
          </p>
          {canCreate && (
            <button
              onClick={() => {
                setEditingStory(null);
                setIsFormOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-2 bg-[#4A7B5B] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#3d694d] transition-colors shadow-sm"
            >
              <Plus size={16} /> Add Success Story
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Course & College</th>
                  <th className="px-6 py-3.5">State</th>
                  <th className="px-6 py-3.5">Rating</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stories.map((story) => (
                  <tr key={story.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {story.image ? (
                          <img
                            src={story.image}
                            alt={story.name}
                            className="w-9 h-9 rounded-full object-cover border border-emerald-100"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-bold flex items-center justify-center text-xs">
                            {story.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            {story.name}
                            {story.featured && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800">
                                Featured
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 max-w-xs line-clamp-1 italic">
                            "{story.text}"
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800 flex items-center gap-1">
                        <GraduationCap size={13} className="text-[#4A7B5B]" />
                        {story.course || "General Admission"}
                      </div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Building2 size={12} />
                        {story.college || "Verified College"}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-600">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                        <MapPin size={11} /> {story.state || "National"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 font-bold text-amber-500">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        <span>{story.rating || 5}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          story.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : story.status === "ARCHIVED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {story.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canApprove && (
                          story.status === "PUBLISHED" ? (
                            <button
                              onClick={() => unpublishMutation.mutate(story.id!)}
                              title="Unpublish to Draft"
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <RotateCcw size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => publishMutation.mutate(story.id!)}
                              title="Publish Live"
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )
                        )}
                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditingStory(story);
                              setIsFormOpen(true);
                            }}
                            title="Edit Story"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <>
                            <button
                              onClick={() => archiveMutation.mutate(story.id!)}
                              title="Archive"
                              className="p-2 text-gray-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Archive size={15} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete success story of "${story.name}"?`)) {
                                  deleteMutation.mutate(story.id!);
                                }
                              }}
                              title="Delete"
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        story.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-700"
                          : story.status === "ARCHIVED"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {story.status}
                    </span>
                    {story.featured && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: story.rating || 5 }).map((_, i) => (
                      <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                <p className="text-gray-600 text-xs italic line-clamp-3 leading-relaxed">
                  "{story.text}"
                </p>

                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  {story.image ? (
                    <img
                      src={story.image}
                      alt={story.name}
                      className="w-10 h-10 rounded-full object-cover border border-emerald-100 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-bold flex items-center justify-center text-xs shrink-0">
                      {story.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 text-xs truncate">
                      {story.name}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {story.course}
                    </div>
                    <span className="px-2 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-full text-[9px] font-semibold">
                      {story.state || "India"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-1">
                {canApprove && (
                  story.status === "PUBLISHED" ? (
                    <button
                      onClick={() => unpublishMutation.mutate(story.id!)}
                      title="Unpublish"
                      className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                    >
                      <RotateCcw size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => publishMutation.mutate(story.id!)}
                      title="Publish Live"
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    >
                      <CheckCircle2 size={15} />
                    </button>
                  )
                )}
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditingStory(story);
                      setIsFormOpen(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit size={15} />
                  </button>
                )}
                {canDelete && (
                  <>
                    <button
                      onClick={() => archiveMutation.mutate(story.id!)}
                      className="p-1.5 text-gray-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                    >
                      <Archive size={15} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${story.name}"?`)) {
                          deleteMutation.mutate(story.id!);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <TestimonialFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingStory(null);
        }}
        initialData={editingStory}
        onSubmit={(data) => {
          if (editingStory?.id) {
            updateMutation.mutate({ id: editingStory.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
