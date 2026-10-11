import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  Video as VideoIcon,
  Eye,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Copy,
  LayoutGrid,
  List,
  Sparkles,
  Calendar,
  RefreshCw,
  Loader2,
  Play,
  Film,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bannersApi,
  BannerDto,
  BannerQueryParams,
  SlotMetadata,
} from "../../api/banners.api";
import { useDebounce } from "../../hooks/useDebounce";
import BannerFormModal from "./BannerFormModal";

export default function BannersPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [selectedSlot, setSelectedSlot] = useState("ALL");
  const [selectedMediaType, setSelectedMediaType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerDto | null>(null);

  // Full Preview Modal State
  const [previewingBanner, setPreviewingBanner] = useState<BannerDto | null>(null);

  // Delete Confirmation State
  const [deletingBanner, setDeletingBanner] = useState<BannerDto | null>(null);

  // 1. Slots Metadata Query
  const { data: slotsRes } = useQuery({
    queryKey: ["admin_banner_slots"],
    queryFn: () => bannersApi.getSlots(),
  });
  const slotsList: SlotMetadata[] = slotsRes?.data || [];

  // 2. Query Params
  const queryParams: BannerQueryParams = useMemo(() => {
    const params: BannerQueryParams = { limit: 100 };
    if (debouncedSearch) params.search = debouncedSearch;
    if (selectedSlot !== "ALL") params.slot = selectedSlot;
    if (selectedMediaType !== "ALL") params.mediaType = selectedMediaType;
    if (selectedStatus !== "ALL") params.status = selectedStatus;
    return params;
  }, [debouncedSearch, selectedSlot, selectedMediaType, selectedStatus]);

  // 3. Banners List Query
  const {
    data: bannersRes,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["admin_banners", queryParams],
    queryFn: () => bannersApi.findAll(queryParams),
  });

  const banners: BannerDto[] = bannersRes?.data?.items || [];

  // Mutations
  const toggleMutation = useMutation({
    mutationFn: (id: string) => bannersApi.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_banners"] });
      toast.success("Banner status toggled successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to toggle banner status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bannersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_banners"] });
      setDeletingBanner(null);
      toast.success("Banner deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete banner");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (banner: BannerDto) => {
      return bannersApi.create({
        slot: banner.slot,
        mediaType: banner.mediaType,
        title: banner.title ? `${banner.title} (Copy)` : undefined,
        subtitle: banner.subtitle || undefined,
        imageUrl: banner.imageUrl || banner.image || undefined,
        videoUrl: banner.videoUrl || undefined,
        buttonText: banner.buttonText || undefined,
        buttonUrl: banner.buttonUrl || undefined,
        openInNewTab: banner.openInNewTab,
        sortOrder: (banner.sortOrder ?? 0) + 1,
        priority: banner.priority ?? 0,
        status: "ACTIVE",
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_banners"] });
      toast.success("Banner duplicated successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to duplicate banner");
    },
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const total = banners.length;
    const active = banners.filter((b) => b.isActive).length;
    const videos = banners.filter((b) => b.mediaType === "VIDEO").length;
    const slotsCovered = new Set(banners.filter((b) => b.isActive).map((b) => b.slot)).size;
    return { total, active, videos, slotsCovered };
  }, [banners]);

  const getSlotLabel = (slotKey: string) => {
    const found = slotsList.find((s) => s.slot === slotKey);
    return found ? found.label : slotKey;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center font-bold">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Page Banners & Video Management
              </h1>
              <p className="text-sm text-slate-500">
                Manage promotional banners, auto-sliders, CTAs and video slots across all 11 pages
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => {
              setEditingBanner(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-xs font-bold shadow-md shadow-[#4A7B5B]/20 flex items-center gap-2 transition-all hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add Banner / Video</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Banners</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Configured in system</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Public</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
            Currently live on website
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Video Showcases</span>
            <VideoIcon className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.videos}</p>
          <span className="text-[11px] text-indigo-600 font-medium mt-0.5 block">
            HTML5 video slots
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-[#F0AE1A] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Slots</span>
            <Sparkles className="w-4 h-4 text-[#F0AE1A]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.slotsCovered} / {slotsList.length || 13}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Slots with live media</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, subtitle, or slot..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Slot Filter */}
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
            >
              <option value="ALL">All Slots ({slotsList.length || 13} Available)</option>
              {slotsList.map((s) => (
                <option key={s.slot} value={s.slot}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* Media Type Filter */}
            <select
              value={selectedMediaType}
              onChange={(e) => setSelectedMediaType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
            >
              <option value="ALL">All Media Types</option>
              <option value="IMAGE">Images Only</option>
              <option value="VIDEO">Videos Only</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "table"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-8 h-8 text-[#4A7B5B] animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading Banners & Video Slots...</p>
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">No Banners Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            {search || selectedSlot !== "ALL" || selectedStatus !== "ALL"
              ? "No banners match your current filters. Try resetting the filters or add a new banner."
              : "No banners configured yet. Add banners to any of the 11 slots to display promotional carousels or video showcases."}
          </p>
          <button
            onClick={() => {
              setEditingBanner(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#4A7B5B] text-white text-xs font-bold shadow-md shadow-[#4A7B5B]/20 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Banner</span>
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Preview</th>
                  <th className="py-3.5 px-4">Slot & Page</th>
                  <th className="py-3.5 px-4">Title & Details</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Sort Order</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {banners.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Media Thumbnail */}
                    <td className="py-3 px-4">
                      <div
                        onClick={() => setPreviewingBanner(b)}
                        className="w-24 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 relative group cursor-pointer shrink-0"
                      >
                        {b.mediaType === "VIDEO" ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white relative">
                            {b.videoUrl ? (
                              <video
                                src={b.videoUrl}
                                className="w-full h-full object-cover"
                                preload="metadata"
                              />
                            ) : null}
                            <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center group-hover:bg-slate-950/20 transition-colors">
                              <Play className="w-5 h-5 text-white fill-white/80" />
                            </div>
                          </div>
                        ) : b.imageUrl || b.image ? (
                          <img
                            src={b.imageUrl || b.image || ""}
                            alt={b.title || "Banner"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </td>

                    {/* Slot Name */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {getSlotLabel(b.slot)}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {b.slot}
                        </div>
                      </div>
                    </td>

                    {/* Title & Subtitle */}
                    <td className="py-3 px-4 max-w-xs">
                      <div>
                        <div className="font-bold text-slate-800 truncate">
                          {b.title || <span className="text-slate-400 italic">No Title (Media Only)</span>}
                        </div>
                        {b.subtitle && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {b.subtitle}
                          </div>
                        )}
                        {b.buttonText && (
                          <div className="flex items-center gap-1 text-[10px] text-[#4A7B5B] font-semibold mt-1">
                            <span>CTA: {b.buttonText}</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Media Type */}
                    <td className="py-3 px-4">
                      {b.mediaType === "VIDEO" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <VideoIcon className="w-3 h-3" />
                          Video
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ImageIcon className="w-3 h-3" />
                          Image
                        </span>
                      )}
                    </td>

                    {/* Sort Order */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 font-bold text-slate-700 text-xs">
                        {b.sortOrder ?? 0}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate(b.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                          b.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
                        }`}
                        title="Click to toggle status"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            b.isActive ? "bg-emerald-600" : "bg-slate-400"
                          }`}
                        />
                        <span>{b.isActive ? "Active" : "Inactive"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewingBanner(b)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Preview banner"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateMutation.mutate(b)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Duplicate banner"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingBanner(b);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#4A7B5B] hover:bg-[#E8F3EC] transition-colors"
                          title="Edit banner"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingBanner(b)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {banners.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow group"
            >
              {/* Media Container */}
              <div
                className="w-full h-44 bg-slate-900 relative overflow-hidden cursor-pointer"
                onClick={() => setPreviewingBanner(b)}
              >
                {b.mediaType === "VIDEO" && b.videoUrl ? (
                  <video
                    src={b.videoUrl}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                ) : b.imageUrl || b.image ? (
                  <img
                    src={b.imageUrl || b.image || ""}
                    alt={b.title || "Banner"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}

                {/* Overlaid Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-950/75 backdrop-blur text-white border border-white/10">
                    {getSlotLabel(b.slot)}
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5">
                  {b.mediaType === "VIDEO" ? (
                    <span className="p-1.5 rounded-md bg-indigo-600/90 text-white flex items-center shadow">
                      <VideoIcon className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="p-1.5 rounded-md bg-emerald-600/90 text-white flex items-center shadow">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur text-slate-900 text-xs font-bold shadow flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm line-clamp-1 mb-1">
                    {b.title || <span className="text-slate-400 italic">No Title</span>}
                  </h4>
                  {b.subtitle && (
                    <p className="text-xs text-slate-500 line-clamp-2">{b.subtitle}</p>
                  )}
                </div>

                {b.buttonText && (
                  <div className="text-[11px] font-semibold text-[#4A7B5B] flex items-center gap-1">
                    <span>CTA: {b.buttonText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}

                {/* Bottom Row */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate(b.id)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          b.isActive ? "bg-emerald-600" : "bg-slate-400"
                        }`}
                      />
                      <span>{b.isActive ? "Active" : "Inactive"}</span>
                    </button>
                    <span className="text-[11px] text-slate-400">Order: {b.sortOrder ?? 0}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => duplicateMutation.mutate(b)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingBanner(b);
                        setIsFormOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#4A7B5B] hover:bg-[#E8F3EC] transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingBanner(b)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <BannerFormModal
          isOpen={isFormOpen}
          banner={editingBanner}
          onClose={() => {
            setIsFormOpen(false);
            setEditingBanner(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["admin_banners"] });
          }}
        />
      )}

      {/* Full Preview Modal */}
      {previewingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 p-1">
            <button
              onClick={() => setPreviewingBanner(null)}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-900/80 backdrop-blur text-white flex items-center justify-center hover:bg-slate-800 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div
              className="relative w-full overflow-hidden rounded-2xl flex items-center justify-center bg-black"
              style={{
                aspectRatio:
                  previewingBanner.slot === "HOME_HERO_VIDEO"
                    ? "4/3"
                    : "1440 / 70",
                height:
                  previewingBanner.slot === "HOME_HERO_VIDEO"
                    ? "280px"
                    : "70px",
                minHeight:
                  previewingBanner.slot === "HOME_HERO_VIDEO"
                    ? "200px"
                    : "70px",
                maxHeight:
                  previewingBanner.slot === "HOME_HERO_VIDEO"
                    ? "360px"
                    : "70px",
              }}
            >
              {previewingBanner.mediaType === "VIDEO" && previewingBanner.videoUrl ? (
                <video
                  src={previewingBanner.videoUrl}
                  className="w-full h-full object-cover object-center"
                  controls
                  autoPlay
                />
              ) : previewingBanner.imageUrl || previewingBanner.image ? (
                <img
                  src={previewingBanner.imageUrl || previewingBanner.image || ""}
                  alt={previewingBanner.title || "Banner Preview"}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="text-white text-xs">No media URL</div>
              )}

              {/* Title & CTA Overlay — Sleek row layout within 70px */}
              {(previewingBanner.title ||
                previewingBanner.subtitle ||
                previewingBanner.buttonText) && (
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-transparent flex items-center justify-between px-4 sm:px-8 text-white pointer-events-none">
                  <div className="flex items-center gap-2 min-w-0 pr-2 pointer-events-auto">
                    {previewingBanner.title && (
                      <span className="text-sm font-extrabold text-white truncate drop-shadow">
                        {previewingBanner.title}
                      </span>
                    )}
                    {previewingBanner.subtitle && (
                      <>
                        <span className="hidden sm:inline text-white/35 font-light">|</span>
                        <span className="hidden sm:inline text-xs text-slate-200 truncate drop-shadow max-w-md">
                          {previewingBanner.subtitle}
                        </span>
                      </>
                    )}
                  </div>
                  {previewingBanner.buttonText && (
                    <a
                      href={previewingBanner.buttonUrl || "#"}
                      target={previewingBanner.openInNewTab ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F0AE1A] text-slate-900 text-xs font-bold rounded-lg shadow w-fit pointer-events-auto hover:bg-[#e0a012] transition-colors shrink-0"
                    >
                      <span>{previewingBanner.buttonText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">
                Slot: {getSlotLabel(previewingBanner.slot)}
              </span>
              <span>Sort Order: {previewingBanner.sortOrder ?? 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Banner</h3>
            <p className="text-xs text-slate-500 mb-6">
              Are you sure you want to delete this banner for slot{" "}
              <span className="font-semibold text-slate-700">
                "{getSlotLabel(deletingBanner.slot)}"
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingBanner(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deletingBanner.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-1.5 shadow"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Banner</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
