import React, { useState } from "react";
import {
  X, Building, Globe, Edit, Trash2, Calendar, Clock,
  BookOpen, GraduationCap, IndianRupee, Shield, CheckCircle2,
  ChevronDown, ChevronUp, Star, AlertCircle, FileText
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { scholarshipsApi, type Scholarship } from "../../api/scholarships.api";

interface ScholarshipDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scholarshipId: string | null;
  onEdit: (scholarship: Scholarship) => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PUBLISHED: { bg: "#D1FAE5", text: "#059669" },
  DRAFT: { bg: "#F1F5F9", text: "#64748B" },
  ARCHIVED: { bg: "#FEE2E2", text: "#DC2626" },
};

const CATEGORY_COLORS: Record<string, string> = {
  Central: "#2563EB",
  State: "#7C3AED",
  Private: "#0EA5E9",
  Corporate: "#D97706",
  NGO: "#059669",
  University: "#DC2626",
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
        <div className="flex items-center gap-2 text-sm font-semibold text-[#4A7B5B]">
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

export default function ScholarshipDetailDrawer({
  isOpen,
  onClose,
  scholarshipId,
  onEdit,
}: ScholarshipDetailDrawerProps) {
  const queryClient = useQueryClient();

  const { data: scholarshipRes, isLoading } = useQuery({
    queryKey: ["admin_scholarship_detail", scholarshipId],
    queryFn: () => scholarshipsApi.findById(scholarshipId!),
    enabled: isOpen && !!scholarshipId,
  });

  const scholarship = scholarshipRes?.data;

  const deleteMutation = useMutation({
    mutationFn: () => scholarshipsApi.delete(scholarshipId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_scholarships"] });
      queryClient.invalidateQueries({ queryKey: ["admin_scholarships_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      onClose();
    },
  });

  const handleDelete = () => {
    if (!scholarshipId) return;
    if (
      window.confirm(
        `Are you sure you want to archive "${scholarship?.scholarshipName ?? 'this scholarship'}"?`
      )
    ) {
      deleteMutation.mutate();
    }
  };

  if (!isOpen) return null;

  const statusConf = STATUS_COLORS[scholarship?.status ?? "PUBLISHED"] ?? STATUS_COLORS.PUBLISHED;
  const catColor = CATEGORY_COLORS[scholarship?.category ?? "Central"] ?? "#4A7B5B";

  const documents = Array.isArray(scholarship?.requiredDocuments) ? scholarship.requiredDocuments : [];

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
          ) : scholarship ? (
            <>
              <div
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
                style={{ background: `${catColor}22`, color: catColor, border: `1px solid ${catColor}40` }}
              >
                <Star className="w-3 h-3" />
                {scholarship.category || "General"}
              </div>
              <h2 className="text-xl font-bold text-white mb-1 pr-10 leading-tight">
                {scholarship.scholarshipName}
              </h2>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <span>{scholarship.provider || "Government / NGO Authority"}</span>
                {scholarship.state && (
                  <>
                    <span>·</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-semibold text-white">
                      {scholarship.state}
                    </span>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Action Bar */}
        {scholarship && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F1F5F9] shrink-0 bg-white">
            <div className="px-2.5 py-1 rounded-full text-xs font-semibold" style={statusConf}>
              {labelFmt(scholarship.status)}
            </div>
            {scholarship.featured && (
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
                onClick={() => { onClose(); onEdit(scholarship); }}
                className="h-8 px-3 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors bg-[#E8F3EC] text-[#4A7B5B]"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="h-8 px-3 rounded-xl text-sm font-medium flex items-center gap-1.5 text-red-600 border border-red-100 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Archive
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

          {!isLoading && !scholarship && (
            <div className="text-center py-10 text-[#94A3B8]">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Scholarship not found</p>
            </div>
          )}

          {!isLoading && scholarship && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Grant Amount",
                    value: scholarship.amount
                      ? `₹${scholarship.amount.toLocaleString("en-IN")}`
                      : "Variable",
                    icon: IndianRupee,
                    color: "#4A7B5B",
                  },
                  {
                    label: "Gender Target",
                    value: scholarship.gender || "ALL",
                    icon: GraduationCap,
                    color: "#0EA5E9",
                  },
                  {
                    label: "Type",
                    value: scholarship.scholarshipType || "Merit",
                    icon: BookOpen,
                    color: "#7C3AED",
                  },
                  {
                    label: "Income Limit",
                    value: scholarship.incomeLimit
                      ? `₹${scholarship.incomeLimit.toLocaleString("en-IN")}`
                      : "No limit",
                    icon: Shield,
                    color: "#F97316",
                  },
                ].map((s) => (
                  <div key={s.label} className="bg-white p-3 rounded-xl border border-[#F1F5F9]">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: `${s.color}15` }}
                      >
                        <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                      </div>
                      <span className="text-xs text-[#94A3B8]">{s.label}</span>
                    </div>
                    <div className="text-base font-bold text-[#4A7B5B]">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Overview */}
              <Section title="Scholarship Overview" icon={BookOpen}>
                <InfoRow label="Provider" value={scholarship.provider} />
                <InfoRow label="Category" value={scholarship.category} />
                <InfoRow label="Scholarship Type" value={scholarship.scholarshipType} />
                <InfoRow label="State" value={scholarship.state || "All India"} />
                <InfoRow label="Country" value={scholarship.country} />
                {scholarship.officialWebsite && (
                  <InfoRow
                    label="Official Portal"
                    value={
                      <a
                        href={scholarship.officialWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center justify-end gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        Apply Online
                      </a>
                    }
                  />
                )}
                {scholarship.description && (
                  <div className="pt-1">
                    <p className="text-xs text-[#94A3B8] mb-1">Description</p>
                    <p className="text-xs text-[#1E293B] leading-relaxed">{scholarship.description}</p>
                  </div>
                )}
              </Section>

              {/* Eligibility */}
              <Section title="Eligibility & Requirements" icon={CheckCircle2}>
                {scholarship.eligibility && (
                  <p className="text-xs text-[#1E293B] leading-relaxed mb-2">{scholarship.eligibility}</p>
                )}
                <InfoRow
                  label="Required Marks"
                  value={scholarship.requiredMarks ? `${scholarship.requiredMarks}%` : undefined}
                />
                <InfoRow
                  label="Max Family Income"
                  value={
                    scholarship.incomeLimit
                      ? `₹${scholarship.incomeLimit.toLocaleString("en-IN")}`
                      : undefined
                  }
                />
                <InfoRow
                  label="Annual Renewal"
                  value={scholarship.renewalRequired ? "Required" : "Not Required"}
                />
              </Section>

              {/* Documents */}
              {documents.length > 0 && (
                <Section title="Required Documents" icon={FileText}>
                  <div className="flex flex-wrap gap-1.5">
                    {documents.map((doc, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#E8F3EC] text-[#4A7B5B]"
                      >
                        {doc}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Timeline */}
              <Section title="Timeline & Deadlines" icon={Calendar}>
                <InfoRow
                  label="Application Start"
                  value={
                    scholarship.applicationStart
                      ? new Date(scholarship.applicationStart).toLocaleDateString("en-IN")
                      : "Open"
                  }
                />
                <InfoRow
                  label="Application Deadline"
                  value={
                    scholarship.applicationEnd
                      ? new Date(scholarship.applicationEnd).toLocaleDateString("en-IN")
                      : "Ongoing"
                  }
                />
                <InfoRow
                  label="Created At"
                  value={scholarship.createdAt ? new Date(scholarship.createdAt).toLocaleString("en-IN") : "N/A"}
                />
                <InfoRow
                  label="Last Updated"
                  value={scholarship.updatedAt ? new Date(scholarship.updatedAt).toLocaleString("en-IN") : "N/A"}
                />
              </Section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
