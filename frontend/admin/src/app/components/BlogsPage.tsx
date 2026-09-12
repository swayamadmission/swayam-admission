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
  RotateCcw,
  CheckCircle,
  TrendingUp,
  Layers,
  Award,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { blogsApi, BlogQueryParams, BlogDto } from "../../api/blogs.api";
import { useDebounce } from "../../hooks/useDebounce";
import BlogFormModal from "./BlogFormModal";
import BlogDetailDrawer from "./BlogDetailDrawer";

export default function BlogsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [page, setPage] = useState(1);

  // Modal & Drawer State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [inspectBlogId, setInspectBlogId] = useState<string | null>(null);

  const queryParams: BlogQueryParams = { page, limit: 15 };
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (selectedCategory !== "All") queryParams.category = selectedCategory;
  if (selectedStatus !== "All") queryParams.status = selectedStatus;

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

  const restoreMutation = useMutation({
    mutationFn: (id: string) => blogsApi.restore(id),
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
      link.setAttribute("download", `blogs_export_${Date.now()}.csv`);
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
            <h1 className="text-2xl font-bold text-gray-900">Blogs, SEO & AI Knowledge Hub</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 text-white uppercase tracking-wider">
              GEO Engine
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Manage articles, news, GEO readiness, Schema.org metadata, and knowledge graph.</p>
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
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> New Article
          </button>
        </div>
      </div>

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Total Articles</div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">{stats.totalBlogs}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Published</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{stats.publishedBlogs}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Drafts</div>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{stats.draftBlogs}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Featured</div>
          <div className="text-xl font-extrabold text-blue-600 mt-1">{stats.featuredBlogs}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Total Views</div>
          <div className="text-xl font-extrabold text-purple-600 mt-1">{stats.totalViews.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs font-medium text-gray-500">Avg GEO Score</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-1">
            <Sparkles size={16} className="text-purple-600" /> {stats.avgGeoScore}/100
          </div>
        </div>
      </div>

      {/* Search & Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search articles by title, tags, or content..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
          <option value="Engineering">Engineering</option>
          <option value="MBA">MBA</option>
          <option value="Medical">Medical</option>
          <option value="Scholarships">Scholarships</option>
          <option value="Admission Tips">Admission Tips</option>
          <option value="Career Guides">Career Guides</option>
          <option value="Exam Updates">Exam Updates</option>
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
          <option value="SCHEDULED">Scheduled</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400 text-xs">Loading Knowledge Hub articles...</div>
      ) : BLOGS.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-xs space-y-3">
          <FileText className="mx-auto text-gray-300" size={40} />
          <div className="text-base font-bold text-gray-900">No articles found</div>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">Get started by creating your first GEO-optimized article.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Article Details</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">GEO / SEO</th>
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
                            <ImageIcon className="text-gray-400" size={20} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => setInspectBlogId(blog.id)}
                            className="font-bold text-gray-900 hover:text-blue-600 transition-colors text-left line-clamp-1 block"
                          >
                            {blog.title}
                          </button>
                          <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                            <span className="truncate max-w-[220px]">/blog/{blog.slug}</span>
                            {blog.featured && <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-extrabold">FEATURED</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">{blog.category}</span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                          blog.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {blog.status === "PUBLISHED" ? <Globe size={12} /> : <FileText size={12} />}
                        {blog.status}
                      </span>
                    </td>

                    {/* GEO Score */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 w-max text-[11px]">
                        <Sparkles size={12} /> {blog.geoScore || 80}/100
                      </div>
                    </td>

                    {/* Views */}
                    <td className="px-6 py-4 font-semibold text-gray-700">{blog.views || 0}</td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setInspectBlogId(blog.id)}
                          title="Inspect GEO & Schema"
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingBlog(blog);
                            setIsFormOpen(true);
                          }}
                          title="Edit Article"
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
                            if (confirm(`Soft-delete "${blog.title}"?`)) {
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
    </div>
  );
}
