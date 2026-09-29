import { useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Globe,
  FileText,
  Image as ImageIcon,
  Eye,
  Sparkles,
  Download,
  Copy,
  CheckCircle,
  XCircle,
  Compass,
  GraduationCap,
  Briefcase,
  Layers,
  X,
  Send,
  BookOpen,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { blogsApi, BlogQueryParams, BlogDto } from "../../api/blogs.api";
import { useDebounce } from "../../hooks/useDebounce";
import { useLiveSync } from "../../hooks/useLiveSync";
import BlogFormModal from "./BlogFormModal";
import BlogDetailDrawer from "./BlogDetailDrawer";

export default function BlogsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedGuideType, setSelectedGuideType] = useState("All");
  const [page, setPage] = useState(1);

  // Modal & Drawer State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [inspectBlogId, setInspectBlogId] = useState<string | null>(null);
  const [previewGuide, setPreviewGuide] = useState<any | null>(null);

  // Connect Admin LiveSync WebSocket
  useLiveSync("admin");

  const queryParams: BlogQueryParams = { page, limit: 15 };
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (selectedCategory !== "All") queryParams.category = selectedCategory;
  if (selectedStatus !== "All") queryParams.status = selectedStatus;
  if (selectedGuideType !== "All") queryParams.guideType = selectedGuideType;

  // 1. Stats Query
  const { data: statsRes } = useQuery({
    queryKey: ["admin_blog_stats"],
    queryFn: () => blogsApi.getStats(),
  });

  // 2. Main Paginated Blogs Query
  const { data: blogsRes, isLoading } = useQuery({
    queryKey: ["admin_blogs", queryParams],
    queryFn: () => blogsApi.findAll(queryParams),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: BlogDto) => blogsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_blogs"] });
      queryClient.invalidateQueries({ queryKey: ["admin_blog_stats"] });
      setIsFormOpen(false);
      setEditingBlog(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BlogDto> }) => blogsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_blogs"] });
      queryClient.invalidateQueries({ queryKey: ["admin_blog_stats"] });
      setIsFormOpen(false);
      setEditingBlog(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => blogsApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_blogs"] });
      queryClient.invalidateQueries({ queryKey: ["admin_blog_stats"] });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => blogsApi.unpublish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_blogs"] });
      queryClient.invalidateQueries({ queryKey: ["admin_blog_stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => blogsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_blogs"] });
      queryClient.invalidateQueries({ queryKey: ["admin_blog_stats"] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => blogsApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_blogs"] });
      queryClient.invalidateQueries({ queryKey: ["admin_blog_stats"] });
    },
  });

  const handleExportCsv = async () => {
    try {
      const response = await blogsApi.exportCsv(queryParams);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `guides_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("Failed to export CSV");
    }
  };

  const stats = statsRes?.data || {
    totalBlogs: 0,
    publishedBlogs: 0,
    draftBlogs: 0,
    featuredBlogs: 0,
    totalViews: 0,
    avgGeoScore: 80,
    categoriesCount: 0,
  };

  const BLOGS = blogsRes?.data?.data || [];
  const meta = blogsRes?.data?.meta || { totalPages: 1, total: 0 };

  return (
    <div className="p-5 lg:p-8 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Career & Admission Guides / CMS</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#4A7B5B] text-white uppercase tracking-wider">
              Real-Time Sync
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Publish career pathways, admission requirements, personalized recommendations, and SEO knowledge articles.
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
              setEditingBlog(null);
              setIsFormOpen(true);
            }}
            className="bg-[#4A7B5B] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-[#3d694d] transition-colors shadow-sm"
          >
            <Plus size={16} /> New Guide / Article
          </button>
        </div>
      </div>

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Total Guides & Articles</div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">{stats.totalBlogs}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Published (Visible to Students)</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{stats.publishedBlogs}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Drafts (Admin Only)</div>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{stats.draftBlogs}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Featured Guides</div>
          <div className="text-xl font-extrabold text-blue-600 mt-1">{stats.featuredBlogs}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Total Student Views</div>
          <div className="text-xl font-extrabold text-purple-600 mt-1">{(stats.totalViews || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Search & Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search guides by title, stream, course, exam, career..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] transition-all"
          />
        </div>

        <select
          value={selectedGuideType}
          onChange={(e) => {
            setSelectedGuideType(e.target.value);
            setPage(1);
          }}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20"
        >
          <option value="All">All Guide Types</option>
          <option value="CAREER">Career Guides</option>
          <option value="ADMISSION">Admission Guides</option>
          <option value="GENERAL">General Articles</option>
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(1);
          }}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20"
        >
          <option value="All">All Categories</option>
          <option value="Career Guides">Career Guides</option>
          <option value="Admission Guides">Admission Guides</option>
          <option value="Engineering">Engineering</option>
          <option value="MBA">MBA</option>
          <option value="Medical">Medical</option>
          <option value="Scholarships">Scholarships</option>
          <option value="Admission Tips">Admission Tips</option>
          <option value="Exam Updates">Exam Updates</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20"
        >
          <option value="All">All Statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="UNPUBLISHED">Unpublished</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400 text-xs">Loading guides...</div>
      ) : BLOGS.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-xs space-y-3">
          <Compass className="mx-auto text-gray-300" size={40} />
          <div className="text-base font-bold text-gray-900">No guides found</div>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">Get started by creating your first Career or Admission Guide.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Guide / Article Details</th>
                  <th className="px-6 py-3.5">Type & Level</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Last Updated</th>
                  <th className="px-6 py-3.5">Views</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {BLOGS.map((blog: any) => (
                  <tr key={blog.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Title & Image */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {blog.featuredImage || blog.thumbnail ? (
                            <img src={blog.featuredImage || blog.thumbnail} alt={blog.title} className="w-full h-full object-cover" />
                          ) : (
                            <Compass className="text-gray-400" size={20} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => setPreviewGuide(blog)}
                            className="font-bold text-gray-900 hover:text-[#4A7B5B] transition-colors text-left line-clamp-1 block"
                          >
                            {blog.title}
                          </button>
                          <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                            <span className="truncate max-w-[220px]">/guides/{blog.slug || blog.id}</span>
                            {blog.featured && <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-extrabold">FEATURED</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type & Level */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          blog.guideType === "CAREER" ? "bg-emerald-50 text-emerald-700" :
                          blog.guideType === "ADMISSION" ? "bg-blue-50 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {blog.guideType || "CAREER"}
                        </span>
                        {blog.educationLevel && (
                          <div className="text-[11px] text-gray-500">{blog.educationLevel} · {blog.stream || "General"}</div>
                        )}
                      </div>
                    </td>

                    {/* Status with Quick Toggle */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                            blog.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {blog.status === "PUBLISHED" ? <Globe size={12} /> : <FileText size={12} />}
                          {blog.status}
                        </span>

                        {blog.status === "PUBLISHED" ? (
                          <button
                            onClick={() => unpublishMutation.mutate(blog.id)}
                            title="Unpublish (Hide from Students)"
                            className="p-1 text-gray-400 hover:text-amber-600 rounded transition"
                          >
                            <XCircle size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => publishMutation.mutate(blog.id)}
                            title="Publish (Make Live to Students)"
                            className="p-1 text-gray-400 hover:text-emerald-600 rounded transition"
                          >
                            <CheckCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Updated At */}
                    <td className="px-6 py-4 text-gray-500 text-[11px]">
                      {new Date(blog.updatedAt || blog.createdAt || Date.now()).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Views */}
                    <td className="px-6 py-4 font-semibold text-gray-700">{blog.views || 0}</td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewGuide(blog)}
                          title="Preview as Student"
                          className="p-2 text-gray-400 hover:text-[#4A7B5B] hover:bg-[#E8F3EC] rounded-lg transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingBlog(blog);
                            setIsFormOpen(true);
                          }}
                          title="Edit Guide"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => duplicateMutation.mutate(blog.id)}
                          title="Duplicate"
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Archive or delete guide "${blog.title}"?`)) {
                              deleteMutation.mutate(blog.id);
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>Showing page {page} of {meta.totalPages}</div>
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
      )}

      {/* Form Modal */}
      <BlogFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBlog(null);
        }}
        initialData={editingBlog}
        onSubmit={(data) => {
          if (editingBlog?.id) {
            updateMutation.mutate({ id: editingBlog.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Inspection Slide-Over Drawer */}
      <BlogDetailDrawer
        blogId={inspectBlogId}
        onClose={() => setInspectBlogId(null)}
        onEdit={(b) => {
          setInspectBlogId(null);
          setEditingBlog(b);
          setIsFormOpen(true);
        }}
      />

      {/* PREVIEW AS STUDENT MODAL */}
      {previewGuide && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header banner */}
            <div className="p-4 bg-[#E8F3EC] border-b border-[#d8e8dc] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-[#2d4f37]">STUDENT VIEW PREVIEW</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  previewGuide.status === "PUBLISHED" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                }`}>
                  {previewGuide.status}
                </span>
                {previewGuide.status !== "PUBLISHED" && (
                  <span className="text-[11px] text-amber-800 italic">
                    (Currently hidden from students until published)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {previewGuide.status !== "PUBLISHED" && (
                  <button
                    onClick={() => {
                      publishMutation.mutate(previewGuide.id);
                      setPreviewGuide({ ...previewGuide, status: "PUBLISHED" });
                    }}
                    className="px-3 py-1 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold hover:bg-[#3d694d] transition"
                  >
                    Publish Now
                  </button>
                )}
                <button
                  onClick={() => setPreviewGuide(null)}
                  className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Simulated Student View Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-[#E8F3EC] text-[#4A7B5B] text-xs font-bold rounded-md">
                    {previewGuide.guideType || "CAREER GUIDE"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {previewGuide.educationLevel} · {previewGuide.stream}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-[#4A7B5B]">{previewGuide.title}</h2>
                <p className="text-xs text-gray-500 mt-1">{previewGuide.excerpt}</p>
              </div>

              {/* Career Highlights if present */}
              {(previewGuide.salaryRange || previewGuide.averageSalary) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                  {previewGuide.salaryRange && (
                    <div>
                      <span className="text-gray-400 block text-[10px]">Indicative Salary</span>
                      <strong className="text-slate-800">{previewGuide.salaryRange}</strong>
                    </div>
                  )}
                  {previewGuide.averageSalary && (
                    <div>
                      <span className="text-gray-400 block text-[10px]">Average Starting</span>
                      <strong className="text-slate-800">{previewGuide.averageSalary}</strong>
                    </div>
                  )}
                  {previewGuide.growthRate && (
                    <div>
                      <span className="text-gray-400 block text-[10px]">Growth Rate</span>
                      <strong className="text-emerald-700">{previewGuide.growthRate}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Skills */}
              {Array.isArray(previewGuide.skills) && previewGuide.skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-1.5">Required Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {previewGuide.skills.map((sk: string) => (
                      <span key={sk} className="px-2.5 py-1 bg-[#E8F3EC] text-[#4A7B5B] rounded-lg text-xs font-medium">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Markdown Content */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold text-gray-700 mb-2">Guide Overview</h4>
                <div className="prose prose-sm max-w-none text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {previewGuide.content}
                </div>
              </div>

              {/* FAQs */}
              {Array.isArray(previewGuide.faqs) && previewGuide.faqs.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-bold text-gray-700 mb-2">Frequently Asked Questions</h4>
                  <div className="space-y-2">
                    {previewGuide.faqs.map((faq: any, i: number) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-xl text-xs">
                        <div className="font-bold text-[#4A7B5B]">{faq.question}</div>
                        <div className="text-gray-600 mt-1">{faq.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
              <button
                onClick={() => setPreviewGuide(null)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
