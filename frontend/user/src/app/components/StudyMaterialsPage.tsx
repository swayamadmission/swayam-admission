import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import {
  BookOpen, Search, Download, FileText, Eye, Star,
  Filter, ArrowRight, Sparkles, Lock,
  FileCode, GraduationCap, BookmarkPlus, BookmarkCheck, X,
  LayoutGrid, List, AlertCircle, History, Bookmark,
  Share2, Check, Loader2, ShieldCheck, Receipt, ShoppingBag, ExternalLink
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studyMaterialsApi, StudyMaterial, StudyMaterialQueryParams, resolveThumbnailUrl } from "../../api/study-materials.api";
import { useAuth as useAuthContext } from "../../context/AuthContext";
import ErrorState from "./ui/ErrorState";
import { StudyMaterialPurchaseModal } from "./StudyMaterialPurchaseModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["All", "Engineering", "Medical", "Management", "Law", "Commerce", "Science", "Arts"];
const MATERIAL_TYPES = ["All", "PDF", "Notes", "PYQ", "Mock Test", "Sample Paper", "Syllabus", "E-Book", "Assignment"];
const STREAMS = ["All", "Science", "Commerce", "Arts", "Engineering", "Medical", "Diploma", "Undergraduate", "Postgraduate"];

const TYPE_CONFIG: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  PDF: { bg: "#FEE2E2", text: "#DC2626", icon: FileText },
  Notes: { bg: "#E8F3EC", text: "#4A7B5B", icon: BookOpen },
  PYQ: { bg: "#DBEAFE", text: "#2563EB", icon: FileCode },
  "Mock Test": { bg: "#F3E8FF", text: "#7C3AED", icon: GraduationCap },
  "Sample Paper": { bg: "#FEF3C7", text: "#D97706", icon: FileText },
  Syllabus: { bg: "#E0F2FE", text: "#0284C7", icon: BookOpen },
  Assignment: { bg: "#F1F5F9", text: "#475569", icon: FileText },
  "E-Book": { bg: "#E0F2FE", text: "#0284C7", icon: BookOpen },
};

const getTypeConfig = (type: string) =>
  TYPE_CONFIG[type] ?? { bg: "#E8F3EC", text: "#4A7B5B", icon: FileText };

// ─── Material Thumbnail Component ─────────────────────────────────────────────

function MaterialThumbnailDisplay({
  thumbnail,
  title,
  conf,
  aspectClass = "aspect-[16/9] w-full",
}: {
  thumbnail?: string;
  title: string;
  conf: { bg: string; text: string; icon: React.ElementType };
  aspectClass?: string;
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [thumbnail]);

  const resolvedUrl = resolveThumbnailUrl(thumbnail);
  const Icon = conf.icon;

  if (resolvedUrl && !imgError) {
    return (
      <div className={`relative ${aspectClass} overflow-hidden bg-slate-100 flex items-center justify-center`}>
        <img
          src={resolvedUrl}
          alt={title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Subtle dark gradient overlay at top & bottom for crisp badge contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
      </div>
    );
  }

  // Academic branded Swayam default placeholder
  return (
    <div
      className={`relative ${aspectClass} overflow-hidden flex flex-col items-center justify-center p-4 select-none`}
      style={{
        background: "linear-gradient(135deg, #1a3a2c 0%, #254d36 40%, #4A7B5B 100%)",
      }}
    >
      {/* Background geometric accents */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

      {/* Center Icon and Branding */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg mb-1.5"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(4px)" }}
        >
          <Icon size={22} className="text-white" />
        </div>
        <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-200/90">
          Swayam Admission
        </span>
        <span className="text-[11px] font-semibold text-white/90 line-clamp-1 max-w-[180px] mt-0.5">
          Academic Resource
        </span>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />
    </div>
  );
}

// ─── Material Card ────────────────────────────────────────────────────────────

function MaterialCard({
  m,
  view = "grid",
  isBookmarked,
  onBookmark,
  onDownload,
  onPreview,
  onOpen,
  isDownloading,
}: {
  m: StudyMaterial;
  view?: "grid" | "list";
  isBookmarked: boolean;
  onBookmark: (id: string, isBookmarked: boolean) => void;
  onDownload: (m: StudyMaterial) => void;
  onPreview: (m: StudyMaterial) => void;
  onOpen: (m: StudyMaterial) => void;
  isDownloading: boolean;
}) {
  const conf = getTypeConfig(m.materialType);

  // List View Horizontal Layout
  if (view === "list") {
    return (
      <div
        onClick={() => onOpen(m)}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-all group cursor-pointer hover:border-[#4A7B5B]/50"
      >
        {/* List Thumbnail Container (Left) */}
        <div className="relative sm:w-56 sm:min-w-[14rem] rounded-xl overflow-hidden shrink-0">
          <MaterialThumbnailDisplay
            thumbnail={m.thumbnail}
            title={m.title}
            conf={conf}
            aspectClass="aspect-[16/10] sm:h-full w-full"
          />
          {/* Badges on thumbnail */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10 pointer-events-none">
            {m.featured && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white shadow-xs">
                <Star size={10} fill="currentColor" /> Featured
              </span>
            )}
            {m.premium ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                <Lock size={9} /> {m.price ? `₹${m.price}` : "Premium"}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                FREE
              </span>
            )}
          </div>
        </div>

        {/* List Middle Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            {/* Badges & Meta */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: conf.bg, color: conf.text }}
              >
                {m.materialType}
              </span>
              {m.category && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#475569]">
                  {m.category}
                </span>
              )}
              {m.subject && (
                <span className="text-xs font-semibold text-[#4A7B5B]">
                  • {m.subject}
                </span>
              )}
              {m.language && (
                <span className="text-xs text-[#94A3B8]">
                  • {m.language}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-base font-bold text-[#1E293B] group-hover:text-[#4A7B5B] transition-colors line-clamp-1 leading-snug">
              {m.title}
            </h3>

            {/* Description */}
            {m.description && (
              <p className="text-xs text-[#64748B] mt-1 line-clamp-2 leading-relaxed">
                {m.description}
              </p>
            )}
          </div>

          {/* Bottom Meta & Credentials */}
          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap border-t border-slate-100 pt-2.5">
            <div className="flex items-center gap-3 text-xs text-[#94A3B8] flex-wrap">
              <span className="flex items-center gap-1">
                <Download size={11} /> {m.downloadCount.toLocaleString("en-IN")}
              </span>
              <span className="flex items-center gap-1">
                <Eye size={11} /> {m.viewCount.toLocaleString("en-IN")}
              </span>
              {m.pages && <span>{m.pages} pages</span>}
              {m.fileSize && <span>{m.fileSize}</span>}
              {m.hasCredentials && m.authorName && (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck size={12} /> By {m.authorName}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onPreview(m)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4A7B5B] bg-[#E8F3EC] hover:bg-[#d9ede0] transition flex items-center gap-1.5 shrink-0"
              >
                <Eye size={13} /> Preview
              </button>

              {m.fileUrl ? (
                <button
                  type="button"
                  onClick={() => onDownload(m)}
                  disabled={isDownloading}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition bg-[#4A7B5B] hover:bg-[#3d694d] flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : m.premium ? (
                    <><Lock size={12} /> {m.price ? `Unlock (₹${m.price})` : "Unlock"}</>
                  ) : (
                    <><Download size={12} /> Download</>
                  )}
                </button>
              ) : (
                <span className="px-3 py-1.5 text-xs text-[#94A3B8] bg-[#F1F5F9] rounded-xl">
                  Unavailable
                </span>
              )}

              <button
                type="button"
                onClick={() => onBookmark(m.id, isBookmarked)}
                className="p-1.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition shrink-0"
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
        </div>
      </div>
    );
  }

  // Grid View Layout
  return (
    <div
      onClick={() => onOpen(m)}
      className="bg-white rounded-2xl border border-[#E2E8F0] flex flex-col overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer hover:border-[#4A7B5B]/50"
    >
      {/* Thumbnail Container */}
      <div className="relative w-full overflow-hidden shrink-0">
        <MaterialThumbnailDisplay
          thumbnail={m.thumbnail}
          title={m.title}
          conf={conf}
          aspectClass="aspect-[16/9] w-full"
        />

        {/* Top Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs backdrop-blur-xs"
              style={{ backgroundColor: conf.bg, color: conf.text }}
            >
              {m.materialType}
            </span>
            {m.featured && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-600/90 text-white backdrop-blur-xs shadow-xs">
                <Star size={10} fill="currentColor" /> Featured
              </span>
            )}
          </div>

          {/* Floating Bookmark Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBookmark(m.id, isBookmarked);
            }}
            className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md backdrop-blur-xs flex items-center justify-center transition shrink-0"
            title={isBookmarked ? "Remove bookmark" : "Bookmark this material"}
          >
            {isBookmarked ? (
              <BookmarkCheck size={16} className="text-[#4A7B5B]" />
            ) : (
              <BookmarkPlus size={16} className="text-slate-600 hover:text-[#4A7B5B]" />
            )}
          </button>
        </div>

        {/* Bottom Badges Overlay on Thumbnail */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          {m.category ? (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-black/50 text-white backdrop-blur-xs">
              {m.category}
            </span>
          ) : <span />}

          {m.premium ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-xs">
              <Lock size={10} /> {m.price ? `₹${m.price}` : "Premium"}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-xs">
              FREE
            </span>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 flex flex-col flex-1 gap-2.5">
        {/* Subject & Language Row */}
        <div className="flex items-center justify-between text-xs text-[#64748B]">
          <span className="font-semibold text-[#4A7B5B] truncate">
            {m.subject || m.stream || "General Study"}
          </span>
          {m.language && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
              {m.language}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-[#1E293B] line-clamp-2 leading-snug group-hover:text-[#4A7B5B] transition-colors">
          {m.title}
        </h3>

        {/* Short Description */}
        {m.description && (
          <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
            {m.description}
          </p>
        )}

        {/* Credentials author attribution if available */}
        {m.hasCredentials && (m.authorName || m.providerName) && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
            <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
            <span className="truncate">
              {m.authorName ? `${m.authorName}${m.authorRole ? ` (${m.authorRole})` : ''}` : m.providerName}
            </span>
          </div>
        )}

        {/* Meta Row: Downloads, Views, Pages / Size */}
        <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-1 mt-auto border-t border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1" title="Downloads">
              <Download size={11} /> {m.downloadCount.toLocaleString("en-IN")}
            </span>
            <span className="flex items-center gap-1" title="Views">
              <Eye size={11} /> {m.viewCount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {m.pages && <span>{m.pages} pgs</span>}
            {m.pages && m.fileSize && <span>•</span>}
            {m.fileSize && <span>{m.fileSize}</span>}
          </div>
        </div>

        {/* Connected Entities */}
        {(m.college || m.exam) && (
          <div className="flex flex-wrap gap-1 text-[11px]" onClick={(e) => e.stopPropagation()}>
            {m.college && (
              <Link to={`/colleges/${m.college.id}`} className="text-[#4A7B5B] hover:underline truncate max-w-[160px]">
                {m.college.name}
              </Link>
            )}
            {m.exam && (
              <Link to={`/exams/${m.exam.id}`} className="text-blue-600 hover:underline truncate max-w-[160px]">
                {m.exam.examName}
              </Link>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
          {/* Preview Button */}
          <button
            type="button"
            onClick={() => onPreview(m)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-[#4A7B5B] bg-[#E8F3EC] hover:bg-[#d9ede0] transition flex items-center gap-1.5 shrink-0"
            title={m.premium ? "Preview sample resource" : "Preview document"}
          >
            <Eye size={13} /> Preview
          </button>

          {/* Download / Unlock Button */}
          {m.fileUrl ? (
            <button
              type="button"
              onClick={() => onDownload(m)}
              disabled={isDownloading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white transition-all bg-[#4A7B5B] hover:bg-[#3d694d] shadow-xs disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : m.premium ? (
                <><Lock size={12} /> {m.price ? `Unlock (₹${m.price})` : "Unlock"}</>
              ) : (
                <><Download size={12} /> Download</>
              )}
            </button>
          ) : (
            <span className="flex-1 py-2 text-center text-xs font-medium text-[#94A3B8] bg-[#F1F5F9] rounded-xl cursor-default">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Material Detail Modal ────────────────────────────────────────────────────

function MaterialDetailModal({
  material,
  isOpen,
  onClose,
  isBookmarked,
  onBookmark,
  onDownload,
  onPreview,
  isDownloading,
}: {
  material: StudyMaterial | null;
  isOpen: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  onBookmark: (id: string, isBookmarked: boolean) => void;
  onDownload: (m: StudyMaterial) => void;
  onPreview: (m: StudyMaterial) => void;
  isDownloading: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [material?.thumbnail]);

  if (!isOpen || !material) return null;

  const conf = getTypeConfig(material.materialType);
  const Icon = conf.icon;
  const resolvedUrl = resolveThumbnailUrl(material.thumbnail);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + `/study-materials?id=${material.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#E2E8F0]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Image Banner (16:9 Aspect Ratio) */}
        <div className="relative w-full aspect-[16/9] max-h-[42vh] sm:max-h-[46vh] lg:max-h-none bg-slate-950 lg:bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
          {resolvedUrl && !imgError ? (
            <>
              <img
                src={resolvedUrl}
                alt={material.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-contain lg:object-cover object-center"
              />
              {/* Subtle dark gradient overlay at top & bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30 pointer-events-none" />
            </>
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-6 text-white select-none relative"
              style={{
                background: "linear-gradient(135deg, #1a3a2c 0%, #254d36 40%, #4A7B5B 100%)",
              }}
            >
              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center mb-2 shadow-inner">
                  <Icon size={28} className="text-white" />
                </div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-200">
                  Swayam Admission Academic Resource
                </span>
                <span className="text-sm font-semibold text-white/90 line-clamp-1 max-w-[280px] mt-1 text-center">
                  {material.title}
                </span>
              </div>
            </div>
          )}

          {/* Close button floating on banner */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition z-20 shadow-md"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E2E8F0] flex items-start justify-between gap-4 bg-[#F8FAFC] shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: conf.bg }}
            >
              <Icon size={22} style={{ color: conf.text }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: conf.bg, color: conf.text }}
                >
                  {material.materialType}
                </span>
                {material.category && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-[#64748B] border border-[#E2E8F0]">
                    {material.category}
                  </span>
                )}
                {material.premium && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Lock size={10} /> Premium {material.price ? `• ₹${material.price}` : ""}
                  </span>
                )}
                {material.featured && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-600 flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> Featured
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-[#1E293B] leading-snug">
                {material.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
            {material.subject && (
              <div>
                <span className="text-[11px] text-[#94A3B8] block">Subject</span>
                <span className="text-xs font-semibold text-[#1E293B]">{material.subject}</span>
              </div>
            )}
            {material.stream && (
              <div>
                <span className="text-[11px] text-[#94A3B8] block">Stream</span>
                <span className="text-xs font-semibold text-[#1E293B]">{material.stream}</span>
              </div>
            )}
            {material.semester && (
              <div>
                <span className="text-[11px] text-[#94A3B8] block">Semester</span>
                <span className="text-xs font-semibold text-[#1E293B]">{material.semester}</span>
              </div>
            )}
            {material.language && (
              <div>
                <span className="text-[11px] text-[#94A3B8] block">Language</span>
                <span className="text-xs font-semibold text-[#1E293B]">{material.language}</span>
              </div>
            )}
            {material.pages && (
              <div>
                <span className="text-[11px] text-[#94A3B8] block">Pages</span>
                <span className="text-xs font-semibold text-[#1E293B]">{material.pages} Pages</span>
              </div>
            )}
            {material.fileSize && (
              <div>
                <span className="text-[11px] text-[#94A3B8] block">File Size</span>
                <span className="text-xs font-semibold text-[#1E293B]">{material.fileSize}</span>
              </div>
            )}
            <div>
              <span className="text-[11px] text-[#94A3B8] block">Downloads</span>
              <span className="text-xs font-semibold text-[#1E293B]">{material.downloadCount}</span>
            </div>
            <div>
              <span className="text-[11px] text-[#94A3B8] block">Views</span>
              <span className="text-xs font-semibold text-[#1E293B]">{material.viewCount}</span>
            </div>
            {material.fileExtension && (
              <div>
                <span className="text-[11px] text-[#94A3B8] block">Format</span>
                <span className="text-xs font-semibold uppercase text-[#1E293B]">{material.fileExtension}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {material.description && (
            <div>
              <h4 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider mb-2">Description & Scope</h4>
              <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-[#E2E8F0]">
                {material.description}
              </p>
            </div>
          )}

          {/* Credentials & Verified Source Card */}
          {material.hasCredentials && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <div className="flex items-center gap-2 text-[#4A7B5B] font-bold text-xs mb-2.5">
                <ShieldCheck size={16} /> Verified Academic Source & Credentials
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {material.authorName && (
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Author / Instructor</span>
                    <span className="font-semibold text-slate-800">{material.authorName}</span>
                    {material.authorRole && <span className="text-slate-500 ml-1">({material.authorRole})</span>}
                  </div>
                )}
                {material.providerName && (
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Provider / Institution</span>
                    <span className="font-semibold text-slate-800">{material.providerName}</span>
                  </div>
                )}
                {material.credentialsUrl && (
                  <div className="sm:col-span-2">
                    <span className="text-[#64748B] block text-[11px]">Verification Reference</span>
                    <a
                      href={material.credentialsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4A7B5B] hover:underline font-medium inline-flex items-center gap-1 break-all"
                    >
                      {material.credentialsUrl} <ExternalLink size={11} />
                    </a>
                  </div>
                )}
                {material.credentialsNotes && (
                  <div className="sm:col-span-2">
                    <span className="text-[#64748B] block text-[11px]">Credentials & Accreditation Notes</span>
                    <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-emerald-100 text-xs mt-1">
                      {material.credentialsNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connected Entities */}
          {(material.course || material.college || material.exam) && (
            <div>
              <h4 className="text-xs font-bold text-[#4A7B5B] uppercase tracking-wider mb-2">Linked Academic Entities</h4>
              <div className="flex flex-wrap gap-2">
                {material.course && (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#E8F3EC] text-[#4A7B5B]">
                    Course: {material.course.name}
                  </span>
                )}
                {material.college && (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EFF6FF] text-[#2563EB]">
                    College: {material.college.name}
                  </span>
                )}
                {material.exam && (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F5F3FF] text-[#7C3AED]">
                    Exam: {material.exam.examName}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Secure Resource Access Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#4A7B5B] shrink-0 shadow-xs">
                <FileText size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-800">
                    {material.premium ? "Premium Protected Resource" : "Verified Academic Document"}
                  </p>
                  {material.premium && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                      ₹{material.price || 0}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {material.premium
                    ? "Full material is protected. View sample preview or unlock full download access."
                    : "Free for verified students. Stream preview or download authentic file."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onPreview(material)}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-[#4A7B5B] border border-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <Eye size={13} /> Preview
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-[#E2E8F0] flex items-center justify-between gap-3 bg-[#F8FAFC] shrink-0">
          <button
            onClick={handleCopyLink}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-white border border-[#E2E8F0] flex items-center gap-1.5 transition"
          >
            {copied ? <Check size={14} className="text-[#4A7B5B]" /> : <Share2 size={14} />}
            {copied ? "Link Copied!" : "Share"}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onBookmark(material.id, isBookmarked)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#E2E8F0] hover:bg-white flex items-center gap-1.5 transition"
            >
              {isBookmarked ? (
                <><BookmarkCheck size={15} className="text-[#4A7B5B]" /> Bookmarked</>
              ) : (
                <><BookmarkPlus size={15} className="text-[#94A3B8]" /> Bookmark</>
              )}
            </button>

            {/* Preview Button */}
            <button
              type="button"
              onClick={() => onPreview(material)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <Eye size={14} /> Preview
            </button>

            {material.fileUrl ? (
              <button
                onClick={() => { onDownload(material); }}
                disabled={isDownloading}
                className="px-5 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : material.premium ? (
                  <><Lock size={14} /> Unlock & Download</>
                ) : (
                  <><Download size={14} /> Download Document</>
                )}
              </button>
            ) : (
              <button
                disabled
                className="px-4 py-2 bg-gray-200 text-gray-400 text-xs font-semibold rounded-xl cursor-not-allowed"
              >
                File Unavailable
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function StudyMaterialsPage() {
  const { isLoggedIn } = useAuthContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  type TabType = "all" | "recommended" | "bookmarks" | "history" | "purchases";
  const [tab, setTab] = useState<TabType>("all");

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState("All");
  const [materialType, setMaterialType] = useState("All");
  const [stream, setStream] = useState("All");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterial | null>(null);

  // Modal states
  const [purchaseModalMaterial, setPurchaseModalMaterial] = useState<StudyMaterial | null>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Sync with URL query parameter
  useEffect(() => {
    const queryParam = searchParams.get("q");
    if (queryParam !== null && queryParam !== q) {
      setQ(queryParam);
    }
  }, [searchParams]);

  // Real-time cross-tab synchronization
  useEffect(() => {
    const channel = new BroadcastChannel("swayam_erp_sync");
    channel.onmessage = (event) => {
      if (
        event.data?.type?.startsWith("material.") ||
        event.data?.type?.startsWith("notification.")
      ) {
        queryClient.invalidateQueries({ queryKey: ["study_materials"] });
        queryClient.invalidateQueries({ queryKey: ["study_materials_recommended"] });
        queryClient.invalidateQueries({ queryKey: ["study_material_bookmarks"] });
        queryClient.invalidateQueries({ queryKey: ["study_material_history"] });
        queryClient.invalidateQueries({ queryKey: ["study_material_purchases"] });
      }
    };
    return () => channel.close();
  }, [queryClient]);

  const params: StudyMaterialQueryParams = {
    page,
    limit: 12,
    q: q || undefined,
    category: category !== "All" ? category : undefined,
    materialType: materialType !== "All" ? materialType : undefined,
    stream: stream !== "All" ? stream : undefined,
    sortBy: "downloadCount",
    sortOrder: "desc",
  };

  // 1. All Materials Query
  const {
    data: materialsRes,
    isLoading: isMaterialsLoading,
    isError: isMaterialsError,
    error: materialsError,
    refetch: refetchMaterials,
    isFetching: isMaterialsFetching,
  } = useQuery({
    queryKey: ["study_materials", params],
    queryFn: () => studyMaterialsApi.findAll(params),
    enabled: tab === "all",
  });

  // 2. Personalized / Public Recommendations
  const {
    data: recommendedRes,
    isLoading: isRecsLoading,
  } = useQuery({
    queryKey: ["study_materials_recommended"],
    queryFn: () => studyMaterialsApi.getRecommended({ limit: 12 }),
  });

  // 3. Bookmarks
  const {
    data: bookmarksRes,
    isLoading: isBookmarksLoading,
  } = useQuery({
    queryKey: ["study_material_bookmarks"],
    queryFn: () => studyMaterialsApi.getBookmarks(),
    enabled: isLoggedIn,
  });

  // 4. History
  const {
    data: historyRes,
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ["study_material_history"],
    queryFn: () => studyMaterialsApi.getHistory(),
    enabled: isLoggedIn,
  });

  // 5. Purchases
  const {
    data: purchasesRes,
    isLoading: isPurchasesLoading,
  } = useQuery({
    queryKey: ["study_material_purchases"],
    queryFn: () => studyMaterialsApi.getMyPurchases(),
    enabled: isLoggedIn,
  });

  const bookmarkedIds = new Set((bookmarksRes?.data?.data ?? []).map((m: StudyMaterial) => m.id));

  const addBookmarkMutation = useMutation({
    mutationFn: (id: string) => studyMaterialsApi.addBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study_material_bookmarks"] });
      const channel = new BroadcastChannel("swayam_erp_sync");
      channel.postMessage({ type: "material.bookmarked" });
      channel.close();
    },
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: (id: string) => studyMaterialsApi.removeBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study_material_bookmarks"] });
      const channel = new BroadcastChannel("swayam_erp_sync");
      channel.postMessage({ type: "material.unbookmarked" });
      channel.close();
    },
  });

  const handleBookmark = (id: string, isBookmarked: boolean) => {
    if (!isLoggedIn) {
      setLoginPromptOpen(true);
      return;
    }
    if (isBookmarked) {
      removeBookmarkMutation.mutate(id);
    } else {
      addBookmarkMutation.mutate(id);
    }
  };

  const handleOpenMaterial = (m: StudyMaterial) => {
    setSelectedMaterial(m);
    studyMaterialsApi.trackView(m.id);
    queryClient.invalidateQueries({ queryKey: ["study_material_history"] });
  };

  // Dedicated Preview Action
  const handlePreview = (m: StudyMaterial) => {
    if (m.premium && !m.previewFileUrl) {
      setPreviewNotice("Preview is not available for this premium material. You can unlock the full material to access it.");
      return;
    }
    const previewUrl = studyMaterialsApi.getPreviewUrl(m.id);
    window.open(previewUrl, "_blank");
  };

  // Dedicated Download Action (Access & Payment Entitlement Aware)
  const handleDownload = async (m: StudyMaterial) => {
    if (!isLoggedIn) {
      setLoginPromptOpen(true);
      return;
    }

    // Free material: download directly through streaming endpoint
    if (!m.premium) {
      try {
        setDownloadingId(m.id);
        await studyMaterialsApi.downloadFile(m.id, m.fileName);
        studyMaterialsApi.trackDownload(m.id);
        queryClient.invalidateQueries({ queryKey: ["study_materials"] });
      } catch (err: any) {
        alert(err.response?.data?.message || "Failed to download file.");
      } finally {
        setDownloadingId(null);
      }
      return;
    }

    // Premium material: verify entitlement
    try {
      setDownloadingId(m.id);
      const accessRes = await studyMaterialsApi.checkAccess(m.id);
      if (accessRes.data?.hasAccess || (accessRes.data as any)?.entitled) {
        await studyMaterialsApi.downloadFile(m.id, m.fileName);
        studyMaterialsApi.trackDownload(m.id);
        queryClient.invalidateQueries({ queryKey: ["study_materials"] });
      } else {
        // Not entitled -> Open purchase flow
        setPurchaseModalMaterial(m);
      }
    } catch {
      setPurchaseModalMaterial(m);
    } finally {
      setDownloadingId(null);
    }
  };

  const allMaterials = materialsRes?.data?.data ?? [];
  const totalPages = materialsRes?.data?.totalPages ?? 1;
  const totalCount = materialsRes?.data?.total ?? 0;

  const recommendedMaterials = recommendedRes?.data?.data ?? [];
  const bookmarkMaterials = bookmarksRes?.data?.data ?? [];
  const historyMaterials = historyRes?.data?.data ?? [];
  const purchasesList = purchasesRes?.data?.data ?? [];

  // Determine current active list
  const currentList =
    tab === "recommended"
      ? recommendedMaterials
      : tab === "bookmarks"
      ? bookmarkMaterials
      : tab === "history"
      ? historyMaterials
      : allMaterials;

  const currentLoading =
    tab === "recommended"
      ? isRecsLoading
      : tab === "bookmarks"
      ? isBookmarksLoading
      : tab === "history"
      ? isHistoryLoading
      : tab === "purchases"
      ? isPurchasesLoading
      : isMaterialsLoading;

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
            Academic Resource & Notes Library
          </div>
          <h1 className="text-white font-extrabold mb-3" style={{ fontSize: "clamp(24px, 4vw, 42px)" }}>
            Study Materials & Prep Hub
          </h1>
          <p className="text-white/80 mb-8 text-base max-w-2xl mx-auto">
            Access authentic syllabus notes, previous year question papers, mock tests, and verified entrance guides.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                const val = e.target.value;
                setQ(val);
                setPage(1);
                if (val) {
                  setSearchParams({ q: val });
                } else {
                  setSearchParams({});
                }
              }}
              placeholder="Search notes, PYQs, mock tests, subjects…"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm bg-white shadow-lg border-0 outline-none text-[#1E293B] focus:ring-2 focus:ring-[#4A7B5B]"
            />
            {q && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#1E293B]"
                onClick={() => {
                  setQ("");
                  setSearchParams({});
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full bg-white/5" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-[#E2E8F0]">
          <button
            onClick={() => { setTab("all"); setPage(1); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              tab === "all"
                ? "bg-[#4A7B5B] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#1E293B] hover:bg-white"
            }`}
          >
            <BookOpen size={16} /> All Materials
            {totalCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${tab === "all" ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                {totalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab("recommended")}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              tab === "recommended"
                ? "bg-[#4A7B5B] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#1E293B] hover:bg-white"
            }`}
          >
            <Star size={16} /> Recommended for You
            {recommendedMaterials.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${tab === "recommended" ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                {recommendedMaterials.length}
              </span>
            )}
          </button>

          {isLoggedIn && (
            <>
              <button
                onClick={() => setTab("bookmarks")}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  tab === "bookmarks"
                    ? "bg-[#4A7B5B] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#1E293B] hover:bg-white"
                }`}
              >
                <Bookmark size={16} /> My Bookmarks
                {bookmarkMaterials.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${tab === "bookmarks" ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                    {bookmarkMaterials.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setTab("history")}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  tab === "history"
                    ? "bg-[#4A7B5B] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#1E293B] hover:bg-white"
                }`}
              >
                <History size={16} /> Recently Viewed
                {historyMaterials.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${tab === "history" ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                    {historyMaterials.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setTab("purchases")}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  tab === "purchases"
                    ? "bg-[#4A7B5B] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#1E293B] hover:bg-white"
                }`}
              >
                <ShoppingBag size={16} /> My Purchases
                {purchasesList.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${tab === "purchases" ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                    {purchasesList.length}
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        {/* Filters Bar (Only on 'all' tab) */}
        {tab === "all" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              {/* Category pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {CATEGORIES.slice(0, 5).map((c) => (
                  <button
                    key={c}
                    onClick={() => { setCategory(c); setPage(1); }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
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
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569] flex items-center gap-1 hover:bg-[#E2E8F0] transition"
                >
                  <Filter size={12} /> {showFilters ? "Hide Filters" : "More Filters"}
                </button>
              </div>

              <div className="sm:ml-auto flex items-center gap-2">
                <span className="text-sm text-[#94A3B8]">{totalCount} available</span>
                <button
                  onClick={() => setView(view === "grid" ? "list" : "grid")}
                  className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-white"
                >
                  {view === "grid" ? <List size={16} /> : <LayoutGrid size={16} />}
                </button>
              </div>
            </div>

            {/* Extended Filters */}
            {showFilters && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-xs">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                    className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none bg-white text-[#1E293B]"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Material Type</label>
                  <select
                    value={materialType}
                    onChange={(e) => { setMaterialType(e.target.value); setPage(1); }}
                    className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none bg-white text-[#1E293B]"
                  >
                    {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5">Target Stream / Level</label>
                  <select
                    value={stream}
                    onChange={(e) => { setStream(e.target.value); setPage(1); }}
                    className="w-full text-sm border border-[#E2E8F0] rounded-xl px-3 py-2 outline-none bg-white text-[#1E293B]"
                  >
                    {STREAMS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    onClick={() => {
                      setQ("");
                      setCategory("All");
                      setMaterialType("All");
                      setStream("All");
                      setPage(1);
                      setSearchParams({});
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}

            {/* Quick Material Type Filters */}
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
          </>
        )}

        {/* Tab Context Banner */}
        {tab === "recommended" && (
          <div className="p-4 mb-6 rounded-2xl bg-[#E8F3EC] border border-[#4A7B5B]/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="text-[#4A7B5B] w-5 h-5 shrink-0" fill="currentColor" />
              <div>
                <h3 className="text-sm font-bold text-[#4A7B5B]">Tailored to Your Academic Profile</h3>
                <p className="text-xs text-[#64748B]">
                  Prioritized by your preferred course, education level, stream, and previous interactions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Section */}
        {tab === "purchases" ? (
          /* Purchases Tab */
          isPurchasesLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#4A7B5B]" />
              <span>Loading purchase history...</span>
            </div>
          ) : purchasesList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8F0] p-8">
              <ShoppingBag className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
              <h3 className="text-[#1E293B] font-bold text-base mb-1">No purchased materials yet</h3>
              <p className="text-sm text-[#94A3B8] max-w-md mx-auto mb-5">
                When you unlock premium study guides, test series, or e-books, they will permanently appear here for instant download.
              </p>
              <button
                onClick={() => setTab("all")}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4A7B5B] hover:bg-[#3d694d] transition shadow-sm"
              >
                Browse Premium Library
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {purchasesList.map((item: any) => (
                <div
                  key={item.paymentId}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                      <Lock size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                          ENTITLED
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Receipt size={11} /> {item.receiptNumber || item.paymentId}
                        </span>
                        <span className="text-xs text-slate-400">
                          • {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">
                        {item.material?.title || "Premium Study Resource"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Paid: ₹{(item.paidAmount ?? 0).toLocaleString()} {item.discountAmount > 0 ? `(Saved ₹${item.discountAmount.toLocaleString()})` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePreview(item.material)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      <Eye size={13} /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(item.material)}
                      disabled={downloadingId === item.material?.id}
                      className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      {downloadingId === item.material?.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Download size={13} />
                      )}
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : currentLoading ? (
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
        ) : isMaterialsError ? (
          <ErrorState
            title="Unable to load study materials"
            error={materialsError}
            onRetry={() => refetchMaterials()}
            isRetrying={isMaterialsFetching}
          />
        ) : currentList.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#E2E8F0] p-8">
            <AlertCircle className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
            <h3 className="text-[#1E293B] font-bold text-base mb-1">
              {tab === "recommended"
                ? "No study materials available for your current preferences."
                : tab === "bookmarks"
                ? "No bookmarked materials found."
                : tab === "history"
                ? "No viewing history yet."
                : "No study materials found."}
            </h3>
            <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
              {tab === "recommended"
                ? "Update your profile preferences or browse the full library to explore available resources."
                : tab === "bookmarks"
                ? "Click the bookmark icon on any material to save it for quick reference."
                : tab === "history"
                ? "Opened and downloaded materials will automatically appear here."
                : "Try adjusting your search keywords or clearing category filters."}
            </p>
            {tab !== "all" ? (
              <button
                onClick={() => setTab("all")}
                className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4A7B5B] hover:bg-[#3d694d] transition shadow-sm"
              >
                Browse All Materials
              </button>
            ) : (
              (q || category !== "All" || materialType !== "All" || stream !== "All") && (
                <button
                  onClick={() => {
                    setQ("");
                    setCategory("All");
                    setMaterialType("All");
                    setStream("All");
                    setSearchParams({});
                  }}
                  className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4A7B5B] hover:bg-[#3d694d] transition shadow-sm"
                >
                  Clear All Filters
                </button>
              )
            )}
          </div>
        ) : (
          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "flex flex-col gap-3"
            }
          >
            {currentList.map((m: StudyMaterial) => (
              <MaterialCard
                key={m.id}
                m={m}
                view={view}
                isBookmarked={bookmarkedIds.has(m.id)}
                onBookmark={handleBookmark}
                onDownload={handleDownload}
                onPreview={handlePreview}
                onOpen={handleOpenMaterial}
                isDownloading={downloadingId === m.id}
              />
            ))}
          </div>
        )}

        {/* Pagination (Only for 'all' tab) */}
        {tab === "all" && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#E2E8F0] text-[#64748B] disabled:opacity-40 hover:bg-white"
            >
              Previous
            </button>
            <span className="text-sm text-[#64748B]">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#E2E8F0] text-[#64748B] disabled:opacity-40 hover:bg-white"
            >
              Next
            </button>
          </div>
        )}

        {/* Sign In CTA if visitor */}
        {!isLoggedIn && (
          <div
            className="mt-12 rounded-3xl p-8 text-center"
            style={{ background: "linear-gradient(135deg, #1a3a2c, #2d5a3d)" }}
          >
            <BookOpen className="w-10 h-10 text-white/70 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg mb-2">Unlock Personalized Study Tools</h3>
            <p className="text-white/70 text-sm mb-5 max-w-md mx-auto">
              Sign in to bookmark documents, track your view history, and receive stream-aligned study materials.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-white text-[#1a3a2c] hover:bg-white/90 transition shadow-sm"
            >
              Sign In Now <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>

      {/* Material Detail Modal */}
      <MaterialDetailModal
        material={selectedMaterial}
        isOpen={Boolean(selectedMaterial)}
        onClose={() => setSelectedMaterial(null)}
        isBookmarked={Boolean(selectedMaterial && bookmarkedIds.has(selectedMaterial.id))}
        onBookmark={handleBookmark}
        onDownload={handleDownload}
        onPreview={handlePreview}
        isDownloading={Boolean(selectedMaterial && downloadingId === selectedMaterial.id)}
      />

      {/* Premium Purchase Modal */}
      {purchaseModalMaterial && (
        <StudyMaterialPurchaseModal
          material={purchaseModalMaterial}
          isOpen={Boolean(purchaseModalMaterial)}
          onClose={() => setPurchaseModalMaterial(null)}
          onPurchaseSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["study_materials"] });
            queryClient.invalidateQueries({ queryKey: ["study_material_purchases"] });
            queryClient.invalidateQueries({ queryKey: ["study_materials_recommended"] });
            queryClient.invalidateQueries({ queryKey: ["study_material_history"] });
          }}
        />
      )}

      {/* Login Required Modal */}
      {loginPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100">
            <div className="w-14 h-14 bg-emerald-50 text-[#4A7B5B] rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Authentication Required</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please log in to your Swayam Admission student account to download resources and unlock premium course guides.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLoginPromptOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginPromptOpen(false);
                  navigate("/login");
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#4A7B5B] hover:bg-[#3d694d] text-white text-xs font-bold transition shadow-sm"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Notice Modal */}
      {previewNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Preview Notice</h3>
              <p className="text-xs text-slate-600 mt-1.5">{previewNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewNotice(null)}
              className="w-full py-2.5 bg-[#4A7B5B] hover:bg-[#3d694d] text-white text-xs font-bold rounded-xl transition"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
