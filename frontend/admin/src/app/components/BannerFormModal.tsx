import { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  Link,
  Eye,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  bannersApi,
  BannerDto,
  CreateBannerPayload,
  SlotMetadata,
} from "../../api/banners.api";

interface BannerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  banner?: BannerDto | null;
  onSuccess: () => void;
}

const DEFAULT_SLOTS: SlotMetadata[] = [
  {
    slot: "HOME_TOP",
    label: "Home Page — Top Banner (Below Navbar)",
    page: "Home Page",
    location: "Full-width banner directly below Navbar",
    recommendedDimensions: "1440 × 70 px",
    aspectRatio: "1440:70 (~20.5:1)",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "HOME_HERO_VIDEO",
    label: "Home Page — Hero Video Showcase",
    page: "Home Page",
    location: "Hero section upper-left showcase",
    recommendedDimensions: "1280 × 960 px / 1600 × 1200 px",
    aspectRatio: "4:3",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "HOME_AI_COUNSELOR",
    label: "Home Page — Meet Swayam AI Counselor",
    page: "Home Page",
    location: "Meet Swayam AI Counselor section banner",
    recommendedDimensions: "1440 × 70 px",
    aspectRatio: "1440:70 (~20.5:1)",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "COLLEGES_TOP",
    label: "Colleges Directory — Top Banner (Below Navbar)",
    page: "Colleges Page",
    location: "Full-width banner directly below Navbar",
    recommendedDimensions: "1440 × 70 px",
    aspectRatio: "1440:70 (~20.5:1)",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "COURSES_TOP",
    label: "Courses Catalog — Top Banner (Below Navbar)",
    page: "Courses Page",
    location: "Full-width banner directly below Navbar",
    recommendedDimensions: "1440 × 70 px",
    aspectRatio: "1440:70 (~20.5:1)",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "STUDY_MATERIALS_TOP",
    label: "Study Materials — Top Banner (Below Navbar)",
    page: "Study Materials Page",
    location: "Full-width banner directly below Navbar",
    recommendedDimensions: "1440 × 70 px",
    aspectRatio: "1440:70 (~20.5:1)",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "STATES_TOP",
    label: "College by State — Top Banner (Below Navbar)",
    page: "States Page",
    location: "Full-width banner directly below Navbar",
    recommendedDimensions: "1440 × 70 px",
    aspectRatio: "1440:70 (~20.5:1)",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "EXAMS_TOP",
    label: "Entrance Exams — Top Banner (Below Navbar)",
    page: "Exams Page",
    location: "Full-width banner directly below Navbar",
    recommendedDimensions: "1440 × 70 px",
    aspectRatio: "1440:70 (~20.5:1)",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "SCHOLARSHIPS_TOP",
    label: "Scholarships & Financial Aid — Top Banner (Below Navbar)",
    page: "Scholarships Page",
    location: "Full-width banner directly below Navbar",
    recommendedDimensions: "1440 × 70 px",
    aspectRatio: "1440:70 (~20.5:1)",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "BLOGS_TOP",
    label: "Blogs, Articles & News — Top Banner (Below Navbar)",
    page: "Blogs Page",
    location: "Full-width banner directly below Navbar",
    recommendedDimensions: "1440 × 70 px",
    aspectRatio: "1440:70 (~20.5:1)",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "DASHBOARD_OVERVIEW",
    label: "Student Dashboard — Overview Banner",
    page: "Student Dashboard",
    location: "Student dashboard overview content section",
    recommendedDimensions: "1440 × 70 px",
    aspectRatio: "1440:70 (~20.5:1)",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "DASHBOARD_FAQ",
    label: "Student Dashboard — FAQ Banner",
    page: "Student Dashboard",
    location: "Below Frequently Asked Questions heading",
    recommendedDimensions: "1440 × 70 px",
    aspectRatio: "1440:70 (~20.5:1)",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "DASHBOARD_GUIDES",
    label: "Student Dashboard — Career & Admission Guides",
    page: "Student Dashboard",
    location: "Below Career & Admission Guides section",
    recommendedDimensions: "1440 × 70 px",
    aspectRatio: "1440:70 (~20.5:1)",
    supportsVideo: true,
    supportsImage: true,
  },
  {
    slot: "CAREERS_PAGE_TOP",
    label: "Careers Page — Hero Banner (Top)",
    page: "Careers Page",
    location: "Careers page top hero header banner",
    recommendedDimensions: "1600 × 450 px",
    aspectRatio: "1600:450 (~32:9)",
    supportsVideo: true,
    supportsImage: true,
  },
];

export default function BannerFormModal({
  isOpen,
  onClose,
  banner,
  onSuccess,
}: BannerFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [slotsList, setSlotsList] = useState<SlotMetadata[]>(DEFAULT_SLOTS);
  const [slot, setSlot] = useState("HOME_TOP");
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [priority, setPriority] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Fetch slots metadata
  useEffect(() => {
    bannersApi
      .getSlots()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setSlotsList(res.data);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_SLOTS
      });
  }, []);

  // Sync when editing
  useEffect(() => {
    if (banner) {
      setSlot(banner.slot || "HOME_TOP");
      setMediaType(banner.mediaType || (banner.videoUrl ? "VIDEO" : "IMAGE"));
      setTitle(banner.title || "");
      setSubtitle(banner.subtitle || "");
      setImageUrl(banner.imageUrl || banner.image || "");
      setVideoUrl(banner.videoUrl || "");
      setButtonText(banner.buttonText || "");
      setButtonUrl(banner.buttonUrl || "");
      setOpenInNewTab(Boolean(banner.openInNewTab));
      setSortOrder(banner.sortOrder ?? 0);
      setPriority(banner.priority ?? 0);
      setStartDate(banner.startDate ? banner.startDate.slice(0, 10) : "");
      setEndDate(banner.endDate ? banner.endDate.slice(0, 10) : "");
      setIsActive(banner.isActive ?? true);
    } else {
      setSlot("HOME_TOP");
      setMediaType("IMAGE");
      setTitle("");
      setSubtitle("");
      setImageUrl("");
      setVideoUrl("");
      setButtonText("");
      setButtonUrl("");
      setOpenInNewTab(false);
      setSortOrder(0);
      setPriority(0);
      setStartDate("");
      setEndDate("");
      setIsActive(true);
    }
    setPreviewTab("edit");
  }, [banner, isOpen]);

  const selectedSlotMeta =
    slotsList.find((s) => s.slot === slot) || DEFAULT_SLOTS[0];

  // Handle direct file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith("video/");
    const isImg = file.type.startsWith("image/");

    if (!isVid && !isImg) {
      toast.error("Please upload an image (JPG, PNG, WebP) or video (MP4, WebM)");
      return;
    }

    try {
      setIsUploading(true);
      const res = await bannersApi.uploadMedia(file);
      if (res.data?.url) {
        if (res.data.mediaType === "VIDEO") {
          setVideoUrl(res.data.url);
          setMediaType("VIDEO");
        } else {
          setImageUrl(res.data.url);
          setMediaType("IMAGE");
        }
        toast.success(
          `${res.data.mediaType === "VIDEO" ? "Video" : "Image"} uploaded successfully!`
        );
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to upload file. Please try again."
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mediaType === "IMAGE" && !imageUrl.trim() && !title.trim()) {
      toast.error("Please upload or enter an Image URL, or provide a banner title");
      return;
    }

    if (mediaType === "VIDEO" && !videoUrl.trim()) {
      toast.error("Please upload or enter a Video URL");
      return;
    }

    const payload: CreateBannerPayload = {
      slot,
      mediaType,
      title: title.trim() || undefined,
      subtitle: subtitle.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      buttonText: buttonText.trim() || undefined,
      buttonUrl: buttonUrl.trim() || undefined,
      openInNewTab,
      sortOrder: Number(sortOrder) || 0,
      priority: Number(priority) || 0,
      startDate: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : null,
      endDate: endDate ? new Date(`${endDate}T23:59:59.999`).toISOString() : null,
      status: isActive ? "ACTIVE" : "INACTIVE",
      isActive,
    };

    try {
      setIsSubmitting(true);
      if (banner?.id) {
        await bannersApi.update(banner.id, payload);
        toast.success("Banner updated successfully!");
      } else {
        await bannersApi.create(payload);
        toast.success("New banner created successfully!");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save banner");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/65 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header (Fixed at top) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center font-bold shrink-0">
              {mediaType === "VIDEO" ? (
                <VideoIcon className="w-4 h-4" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                {banner ? "Edit Page Banner / Video" : "Create New Page Banner / Video"}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Standard 1440 × 70 px slots, responsive media, and auto-slider
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Mode Tabs */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreviewTab("edit")}
                className={`px-2.5 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs transition-all ${
                  previewTab === "edit"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("preview")}
                className={`px-2.5 sm:px-3 py-1 rounded-md flex items-center gap-1 text-[11px] sm:text-xs transition-all ${
                  previewTab === "preview"
                    ? "bg-white text-[#4A7B5B] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable container, no horizontal scroll) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-white">
          {previewTab === "preview" ? (
            /* Live Preview Mode */
            <div className="p-4 sm:p-6 bg-slate-100 min-h-[280px] flex flex-col items-center justify-center">
              {/* Device selector */}
              <div className="flex items-center gap-2 mb-4 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium shadow-xs">
                <span className="text-slate-500">Device View:</span>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    previewDevice === "desktop"
                      ? "bg-[#4A7B5B] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Desktop ({selectedSlotMeta.recommendedDimensions})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    previewDevice === "mobile"
                      ? "bg-[#4A7B5B] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Mobile View
                </button>
              </div>

              {/* Banner Preview Frame — standard 1440 × 70 px strip */}
              <div
                className={`w-full transition-all duration-300 rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-slate-900 relative ${
                  previewDevice === "mobile" ? "max-w-sm" : "max-w-2xl"
                }`}
                style={{
                  aspectRatio:
                    slot === "HOME_HERO_VIDEO"
                      ? "4 / 3"
                      : "1440 / 70",
                  height: slot === "HOME_HERO_VIDEO" ? "220px" : "70px",
                  minHeight: slot === "HOME_HERO_VIDEO" ? "180px" : "70px",
                  maxHeight: slot === "HOME_HERO_VIDEO" ? "300px" : "70px",
                }}
              >
                {/* Media layer */}
                {mediaType === "VIDEO" && videoUrl ? (
                  <video
                    src={videoUrl}
                    className="w-full h-full object-cover object-center"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title || "Banner Preview"}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 px-4 text-center bg-slate-900/90">
                    <span className="text-xs text-slate-400">No media uploaded or URL provided</span>
                  </div>
                )}

                {/* Horizontal Content Overlay within 70px height */}
                {(title || subtitle || buttonText) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-transparent flex items-center justify-between px-3 sm:px-6 text-white pointer-events-none">
                    <div className="flex items-center gap-2 min-w-0 pr-2 pointer-events-auto">
                      {title && (
                        <span className="text-xs sm:text-sm font-extrabold text-white leading-tight drop-shadow truncate">
                          {title}
                        </span>
                      )}
                      {subtitle && (
                        <>
                          <span className="hidden sm:inline text-white/35 font-light">|</span>
                          <span className="hidden sm:inline text-[11px] sm:text-xs text-slate-200 truncate drop-shadow max-w-xs md:max-w-md">
                            {subtitle}
                          </span>
                        </>
                      )}
                    </div>
                    {buttonText && (
                      <div className="shrink-0 pointer-events-auto">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F0AE1A] text-slate-950 text-[11px] font-bold rounded-lg shadow">
                          <span>{buttonText}</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Slot Indicator badge */}
                <div className="absolute top-1.5 left-2 bg-slate-950/80 backdrop-blur-md text-white text-[9px] font-semibold px-2 py-0.5 rounded-full border border-white/10">
                  {selectedSlotMeta.label}
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-4 text-center">
                Standard: {selectedSlotMeta.recommendedDimensions} · Ratio: {selectedSlotMeta.aspectRatio}
              </p>
            </div>
          ) : (
            /* Settings Edit Form */
            <form id="banner-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
              {/* Slot & Media Type Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Page & Slot Position <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={slot}
                    onChange={(e) => setSlot(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B] transition-all"
                  >
                    {slotsList.map((s) => (
                      <option key={s.slot} value={s.slot}>
                        {s.label} ({s.page})
                      </option>
                    ))}
                  </select>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Layers className="w-3 h-3 text-[#4A7B5B] shrink-0" />
                    <span className="truncate">
                      Size: {selectedSlotMeta.recommendedDimensions} · Ratio: {selectedSlotMeta.aspectRatio}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Media Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setMediaType("IMAGE")}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        mediaType === "IMAGE"
                          ? "bg-white text-[#4A7B5B] shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Image Banner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType("VIDEO")}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        mediaType === "VIDEO"
                          ? "bg-white text-[#4A7B5B] shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <VideoIcon className="w-4 h-4" />
                      <span>Video Slot</span>
                    </button>
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500">
                    {mediaType === "VIDEO" ? "Autoplay video background" : "Responsive JPG, PNG or WebP banner (1440 × 70)"}
                  </div>
                </div>
              </div>

              {/* Media Upload & URL Section */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    {mediaType === "VIDEO" ? (
                      <VideoIcon className="w-4 h-4 text-[#4A7B5B]" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-[#4A7B5B]" />
                    )}
                    {mediaType === "VIDEO" ? "Video Asset Source" : "Image Asset Source"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Max: {mediaType === "VIDEO" ? "100MB (MP4/WebM)" : "15MB (JPG/PNG/WebP)"}
                  </span>
                </div>

                {/* Direct Upload + URL Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  {/* Upload Button */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={
                        mediaType === "VIDEO"
                          ? "video/mp4,video/webm"
                          : "image/jpeg,image/png,image/webp,image/gif"
                      }
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed border-slate-300 hover:border-[#4A7B5B] rounded-xl p-3 sm:p-3.5 text-center cursor-pointer transition-all bg-white group ${
                        isUploading ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center justify-center py-1">
                          <Loader2 className="w-5 h-5 text-[#4A7B5B] animate-spin mb-1" />
                          <span className="text-xs font-medium text-slate-600">
                            Uploading media to server...
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-0.5">
                          <div className="w-8 h-8 rounded-full bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                            <Upload className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            Click to Upload {mediaType === "VIDEO" ? "Video" : "Image"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Direct server upload with auto-path
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Direct URL input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Or Enter Direct Media URL:
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Link className="w-3.5 h-3.5" />
                      </div>
                      {mediaType === "VIDEO" ? (
                        <input
                          type="url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://example.com/banner.mp4 or /uploads/..."
                          className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                        />
                      ) : (
                        <input
                          type="url"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/... or /uploads/..."
                          className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                        />
                      )}
                    </div>

                    {/* Quick indicator */}
                    {(mediaType === "VIDEO" ? videoUrl : imageUrl) && (
                      <div className="mt-2 flex items-center gap-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          Asset linked: {mediaType === "VIDEO" ? videoUrl : imageUrl}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Banner Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Accelerate Your Higher Education Journey"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Subtitle / Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Compare 1000+ top verified colleges across India"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* Call To Action (CTA) */}
              <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-[#F0AE1A]" />
                  Call To Action Button (Optional)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="e.g. Explore Now / Apply Free"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Button Destination URL / Route
                    </label>
                    <input
                      type="text"
                      value={buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                      placeholder="e.g. /colleges or /scholarships"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                    />
                  </div>

                  <div className="flex items-center sm:pt-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={openInNewTab}
                        onChange={(e) => setOpenInNewTab(e.target.checked)}
                        className="w-4 h-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B] border-slate-300"
                      />
                      <span>Open in New Tab</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Sequence, Dates & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                  />
                  <span className="text-[10px] text-slate-400">
                    Lower number slides first
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Active Status
                  </label>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsActive(!isActive)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isActive ? "bg-[#4A7B5B]" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-bold text-slate-700">
                      {isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer (Pinned and always accessible at bottom) */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-50/70 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/80 transition-colors"
          >
            Cancel
          </button>

          {previewTab === "preview" ? (
            <button
              type="button"
              onClick={() => setPreviewTab("edit")}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:bg-[#3D664A] shadow transition-all"
            >
              Back to Settings
            </button>
          ) : (
            <button
              type="submit"
              form="banner-form"
              disabled={isSubmitting || isUploading}
              className="px-5 sm:px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#4A7B5B] hover:bg-[#3D664A] shadow-md shadow-[#4A7B5B]/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Banner...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{banner ? "Update Banner" : "Publish Banner"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
