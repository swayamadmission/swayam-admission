import React, { useState } from "react";
import {
  X, Globe, Edit, Trash2, Calendar, Download, Eye,
  BookOpen, GraduationCap, FileText, CheckCircle2,
  ChevronDown, ChevronUp, Star, AlertCircle, ExternalLink,
  Lock, Sparkles, Building, Layers
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { materialsApi, type StudyMaterial } from "../../api/materials.api";

interface StudyMaterialDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string | null;
  onEdit: (material: StudyMaterial) => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PUBLISHED: { bg: "#D1FAE5", text: "#059669" },
  DRAFT: { bg: "#F1F5F9", text: "#64748B" },
  ARCHIVED: { bg: "#FEE2E2", text: "#DC2626" },
};

const TYPE_COLORS: Record<string, string> = {
  PDF: "#DC2626",
  Notes: "#059669",
  PYQ: "#2563EB",
  "Mock Test": "#7C3AED",
  "Sample Paper": "#D97706",
  Syllabus: "#0EA5E9",
  Assignment: "#475569",
  "E-Book": "#0284C7",
};

const labelFmt = (s?: string) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#F1F5F9] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-[#F8FAFC] transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
          <Icon className="w-4 h-4" style={{ color: "#4A7B5B" }} />
          {title}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
        )}
      </button>
      {open && <div className="px-4 py-4 bg-[#F8FAFC] space-y-3">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-[#94A3B8] shrink-0 w-32">{label}</span>
      <span className="text-xs text-[#1E293B] font-medium text-right flex-1">{value}</span>
    </div>
  );
}

export default function StudyMaterialDetailDrawer({
  isOpen,
  onClose,
  materialId,
  onEdit,
}: StudyMaterialDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);

  const { data: materialRes, isLoading } = useQuery({
    queryKey: ["admin_material_detail", materialId],
    queryFn: () => materialsApi.findById(materialId!),
    enabled: isOpen && !!materialId,
  });

  const material = materialRes?.data;

  const downloadMutation = useMutation({
    mutationFn: () => materialsApi.download(materialId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_materials"] });
      queryClient.invalidateQueries({ queryKey: ["admin_material_detail", materialId] });
      queryClient.invalidateQueries({ queryKey: ["admin_materials_stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => materialsApi.delete(materialId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_materials"] });
      queryClient.invalidateQueries({ queryKey: ["admin_materials_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      onClose();
    },
  });

  const handleDelete = () => {
    if (!materialId) return;
    if (window.confirm(`Archive "${material?.title ?? 'this study material'}"?`)) {
      deleteMutation.mutate();
    }
  };

  const handleDownload = () => {
    if (!material) return;
    downloadMutation.mutate();
    if (material.fileUrl) {
      window.open(material.fileUrl, "_blank");
    } else {
      alert("No file URL specified for this resource.");
    }
  };

  if (!isOpen) return null;

  const statusConf = STATUS_COLORS[material?.status ?? "PUBLISHED"] ?? STATUS_COLORS.PUBLISHED;
  const typeColor = TYPE_COLORS[material?.materialType ?? "PDF"] ?? "#4A7B5B";
  const tags = Array.isArray(material?.tags) ? material.tags : [];

  const isPdf = material?.fileExtension?.toLowerCase() === "pdf" || material?.fileUrl?.toLowerCase().endsWith(".pdf");
  const isImage = ["jpg", "jpeg", "png", "webp"].includes(material?.fileExtension?.toLowerCase() ?? "");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div
          className="px-6 py-5 shrink-0 relative"
          style={{
            background: "linear-gradient(135deg, #4A7B5B 0%, #3B664A 100%)",
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-5 bg-white/20 rounded w-48 mb-2" />
              <div className="h-3 bg-white/20 rounded w-32" />
            </div>
          ) : material ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                  style={{ background: typeColor }}
                >
                  {material.materialType}
                </span>
                {material.premium && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400 text-amber-950 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Premium
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white mb-1 pr-10 leading-tight">
                {material.title}
              </h2>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <span>{material.subject || material.category || "General"}</span>
                {material.semester && (
                  <>
                    <span>·</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-semibold text-white">
                      {material.semester}
                    </span>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Action Bar */}
        {material && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F1F5F9] shrink-0 bg-white">
            <div className="px-2.5 py-1 rounded-full text-xs font-semibold" style={statusConf}>
              {labelFmt(material.status)}
            </div>
            {material.featured && (
              <div
                className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                style={{ background: "#FEF3C7", color: "#D97706" }}
              >
                <Star className="w-3 h-3 fill-current" />
                Featured
              </div>
            )}
            <div className="ml-auto flex gap-2">
              <button
                onClick={handleDownload}
                className="h-8 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 text-white transition-colors"
                style={{ background: "#4A7B5B" }}
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                onClick={() => { onClose(); onEdit(material); }}
                className="h-8 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 bg-[#E8F3EC] text-[#4A7B5B]"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="h-8 px-2.5 rounded-xl text-xs font-medium flex items-center text-red-600 border border-red-100 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
          {isLoading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#F1F5F9] p-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !material && (
            <div className="text-center py-10 text-[#94A3B8]">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Study material not found</p>
            </div>
          )}

          {!isLoading && material && (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border border-[#F1F5F9] text-center">
                  <div className="text-lg font-bold text-[#0F172A]">{material.downloadCount.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-[#94A3B8]">Downloads</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#F1F5F9] text-center">
                  <div className="text-lg font-bold text-[#0F172A]">{material.viewCount.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-[#94A3B8]">Views</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#F1F5F9] text-center">
                  <div className="text-lg font-bold text-[#0F172A]">{material.pages ?? "N/A"}</div>
                  <div className="text-xs text-[#94A3B8]">Pages</div>
                </div>
              </div>

              {/* Resource Preview Toggle */}
              {material.fileUrl && (
                <div className="bg-white p-3 rounded-xl border border-[#F1F5F9]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-[#4A7B5B]" />
                      Resource Preview
                    </span>
                    <button
                      onClick={() => setShowPreview((v) => !v)}
                      className="text-xs text-[#4A7B5B] hover:underline font-medium"
                    >
                      {showPreview ? "Hide Preview" : "Show Inline Preview"}
                    </button>
                  </div>
                  {showPreview && (
                    <div className="mt-2 rounded-lg border border-[#E2E8F0] overflow-hidden bg-gray-50 h-64 flex items-center justify-center">
                      {isPdf ? (
                        <iframe
                          src={`${material.fileUrl}#toolbar=0`}
                          className="w-full h-full"
                          title="PDF Preview"
                        />
                      ) : isImage ? (
                        <img
                          src={material.fileUrl}
                          alt="Resource Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <FileText className="w-8 h-8 mx-auto text-[#94A3B8] mb-2" />
                          <p className="text-xs text-[#475569] mb-2">Inline preview unavailable for format .{material.fileExtension ?? 'file'}</p>
                          <button
                            onClick={handleDownload}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white inline-flex items-center gap-1"
                            style={{ background: "#4A7B5B" }}
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open File
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Overview */}
              <Section title="Resource Overview" icon={BookOpen}>
                <InfoRow label="Category" value={labelFmt(material.category)} />
                <InfoRow label="Material Type" value={material.materialType} />
                <InfoRow label="Subject" value={material.subject} />
                <InfoRow label="Semester / Year" value={material.semester} />
                <InfoRow label="Language" value={material.language} />
                {material.description && (
                  <div className="pt-1">
                    <p className="text-xs text-[#94A3B8] mb-1">Description</p>
                    <p className="text-xs text-[#1E293B] leading-relaxed">{material.description}</p>
                  </div>
                )}
              </Section>

              {/* File Information */}
              <Section title="File & Metadata" icon={FileText}>
                <InfoRow label="File Name" value={material.fileName} />
                <InfoRow label="File Extension" value={material.fileExtension?.toUpperCase()} />
                <InfoRow label="File Size" value={material.fileSize} />
                <InfoRow label="Page Count" value={material.pages ? `${material.pages} pages` : undefined} />
                {material.fileUrl && (
                  <InfoRow
                    label="Direct File Link"
                    value={
                      <a
                        href={material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center justify-end gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Open File
                      </a>
                    }
                  />
                )}
              </Section>

              {/* Related Academic Entities */}
              <Section title="Linked Academic Entities" icon={GraduationCap}>
                <InfoRow label="Related Course" value={material.course?.name} />
                <InfoRow label="Related College" value={material.college?.name} />
                <InfoRow label="Related Exam" value={material.exam?.examName} />
              </Section>

              {/* Tags */}
              {tags.length > 0 && (
                <Section title="Tags & Keywords" icon={Layers}>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#E8F3EC] text-[#4A7B5B]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* SEO & Timestamps */}
              <Section title="SEO & Audit Metadata" icon={Globe}>
                <InfoRow label="SEO Title" value={material.seoTitle} />
                <InfoRow label="Created At" value={material.createdAt ? new Date(material.createdAt).toLocaleString("en-IN") : undefined} />
                <InfoRow label="Last Updated" value={material.updatedAt ? new Date(material.updatedAt).toLocaleString("en-IN") : undefined} />
              </Section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
