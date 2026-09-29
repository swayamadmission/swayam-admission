import React, { useState } from "react";
import {
  X, Building, Globe, Edit, Trash2, Calendar, Clock,
  BookOpen, GraduationCap, IndianRupee, Shield, CheckCircle2,
  ChevronDown, ChevronUp, Star, AlertCircle
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { examsApi, type Exam } from "../../api/exams.api";

interface ExamDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string | null;
  onEdit: (exam: Exam) => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PUBLISHED: { bg: "#D1FAE5", text: "#059669" },
  DRAFT: { bg: "#F1F5F9", text: "#64748B" },
  ARCHIVED: { bg: "#FEE2E2", text: "#DC2626" },
};

const CATEGORY_COLORS: Record<string, string> = {
  ENGINEERING: "#2563EB",
  MANAGEMENT: "#7C3AED",
  MEDICAL: "#DC2626",
  LAW: "#D97706",
  ARTS: "#0EA5E9",
  SCIENCE: "#059669",
  COMMERCE: "#F97316",
  OTHER: "#64748B",
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

export default function ExamDetailDrawer({
  isOpen,
  onClose,
  examId,
  onEdit,
}: ExamDetailDrawerProps) {
  const queryClient = useQueryClient();

  const { data: examRes, isLoading } = useQuery({
    queryKey: ["admin_exam_detail", examId],
    queryFn: () => examsApi.findById(examId!),
    enabled: isOpen && !!examId,
  });

  const exam = examRes?.data;

  const deleteMutation = useMutation({
    mutationFn: () => examsApi.delete(examId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_exams"] });
      queryClient.invalidateQueries({ queryKey: ["admin_exams_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      onClose();
    },
  });

  const handleDelete = () => {
    if (!examId) return;
    if (
      window.confirm(
        `Are you sure you want to archive "${exam?.examName ?? 'this exam'}"? This action sets the exam to ARCHIVED status.`
      )
    ) {
      deleteMutation.mutate();
    }
  };

  if (!isOpen) return null;

  const statusConf = STATUS_COLORS[exam?.status ?? "PUBLISHED"] ?? STATUS_COLORS.PUBLISHED;
  const catColor = CATEGORY_COLORS[exam?.category ?? "OTHER"] ?? "#64748B";

  const rawCourses = exam?.courses;
  const courses = Array.isArray(rawCourses) ? rawCourses : [];

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
          ) : exam ? (
            <>
              <div
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
                style={{ background: `${catColor}22`, color: catColor, border: `1px solid ${catColor}40` }}
              >
                <GraduationCap className="w-3 h-3" />
                {labelFmt(exam.category)}
              </div>
              <h2 className="text-xl font-bold text-white mb-1 pr-10 leading-tight">
                {exam.examName}
              </h2>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <span>{exam.conductedBy || "National Exam Authority"}</span>
                <span>·</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-semibold text-white">
                  {labelFmt(exam.level)}
                </span>
              </div>
            </>
          ) : null}
        </div>

        {/* Action Bar */}
        {exam && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F1F5F9] shrink-0 bg-white">
            <div className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: statusConf.bg, color: statusConf.text }}>
              {labelFmt(exam.status)}
            </div>
            {exam.featured && (
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
                onClick={() => { onClose(); onEdit(exam); }}
                className="h-8 px-3 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors"
                style={{ background: "#E8F3EC", color: "#4A7B5B" }}
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

          {!isLoading && !exam && (
            <div className="text-center py-10 text-[#94A3B8]">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Exam not found</p>
            </div>
          )}

          {!isLoading && exam && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Accepted Courses",
                    value: courses.length,
                    icon: BookOpen,
                    color: "#4A7B5B",
                  },
                  {
                    label: "Exam Mode",
                    value: labelFmt(exam.examMode ?? "ONLINE"),
                    icon: Shield,
                    color: "#0EA5E9",
                  },
                  {
                    label: "Application Fee",
                    value: exam.applicationFee ? `₹${exam.applicationFee}` : "Free",
                    icon: IndianRupee,
                    color: "#7C3AED",
                  },
                  {
                    label: "Total Marks",
                    value: exam.totalMarks ? `${exam.totalMarks} Marks` : "N/A",
                    icon: GraduationCap,
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

              {/* Description */}
              {exam.description && (
                <Section title="Description & Highlights" icon={BookOpen}>
                  <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-wrap">
                    {exam.description}
                  </p>
                </Section>
              )}

              {/* Overview */}
              <Section title="Exam Overview" icon={BookOpen}>
                <InfoRow label="Conducted By" value={exam.conductedBy} />
                <InfoRow
                  label="Assigned State"
                  value={exam.state ? `${exam.state.name} (${exam.state.code})` : "National / All-India"}
                />
                <InfoRow label="Category" value={labelFmt(exam.category)} />
                <InfoRow label="Exam Level" value={labelFmt(exam.level)} />
                <InfoRow label="Exam Mode" value={labelFmt(exam.examMode)} />
                <InfoRow label="Duration" value={exam.duration} />
                {exam.officialWebsite && (
                  <InfoRow
                    label="Official Website"
                    value={
                      <a
                        href={exam.officialWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center justify-end gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        Visit Website
                      </a>
                    }
                  />
                )}
              </Section>

              {/* Schedule */}
              <Section title="Important Dates" icon={Calendar}>
                <InfoRow
                  label="Application Start"
                  value={
                    exam.applicationStart
                      ? new Date(exam.applicationStart).toLocaleDateString("en-IN")
                      : "TBA"
                  }
                />
                <InfoRow
                  label="Application End"
                  value={
                    exam.applicationEnd
                      ? new Date(exam.applicationEnd).toLocaleDateString("en-IN")
                      : "TBA"
                  }
                />
                <InfoRow
                  label="Exam Date"
                  value={
                    exam.examDate
                      ? new Date(exam.examDate).toLocaleDateString("en-IN")
                      : "TBA"
                  }
                />
                <InfoRow
                  label="Result Date"
                  value={
                    exam.resultDate
                      ? new Date(exam.resultDate).toLocaleDateString("en-IN")
                      : "TBA"
                  }
                />
                <InfoRow
                  label="Counselling Date"
                  value={
                    exam.counsellingDate
                      ? new Date(exam.counsellingDate).toLocaleDateString("en-IN")
                      : "TBA"
                  }
                />
              </Section>

              {/* Eligibility */}
              <Section title="Eligibility Criteria" icon={CheckCircle2}>
                {exam.eligibility && (
                  <p className="text-xs text-[#1E293B] leading-relaxed mb-2">{exam.eligibility}</p>
                )}
                <InfoRow label="Qualification" value={exam.qualification} />
                <InfoRow label="Age Limit" value={exam.ageLimit} />
                <InfoRow
                  label="Application Fee"
                  value={exam.applicationFee ? `₹${exam.applicationFee}` : undefined}
                />
              </Section>

              {/* Pattern & Syllabus */}
              {(exam.pattern || (exam.syllabus ?? []).length > 0) && (
                <Section title="Pattern & Syllabus" icon={Shield}>
                  <InfoRow label="Pattern" value={exam.pattern} />
                  <InfoRow label="Total Marks" value={exam.totalMarks} />
                  {(exam.syllabus ?? []).length > 0 && (
                    <div>
                      <p className="text-xs text-[#94A3B8] mb-1.5">Syllabus Topics</p>
                      <div className="flex flex-wrap gap-1.5">
                        {exam.syllabus!.map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-xs font-medium"
                            style={{ background: "#E8F3EC", color: "#4A7B5B" }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {exam.preparationTips && (
                    <div>
                      <p className="text-xs text-[#94A3B8] mb-1">Preparation Tips</p>
                      <p className="text-xs text-[#1E293B] leading-relaxed">{exam.preparationTips}</p>
                    </div>
                  )}
                </Section>
              )}

              {/* Accepted Courses & Colleges */}
              <Section
                title={`Accepted Courses (${courses.length})`}
                icon={GraduationCap}
                defaultOpen={courses.length > 0}
              >
                {courses.length === 0 ? (
                  <p className="text-xs text-[#94A3B8]">No courses linked to this exam yet.</p>
                ) : (
                  <div className="space-y-2">
                    {courses.map((item) => (
                      <div
                        key={item?.courseId ?? Math.random()}
                        className="bg-white p-3 rounded-xl border border-[#F1F5F9]"
                      >
                        <div className="text-xs font-bold text-[#4A7B5B]">
                          {item?.course?.name ?? "Unnamed Course"}
                        </div>
                        {item?.course?.college && (
                          <div className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-1">
                            <Building className="w-3 h-3 text-[#4A7B5B]" />
                            {item.course.college.name} ({item.course.college.city ?? ""}, {item.course.college.state ?? ""})
                          </div>
                        )}
                        {item?.course?.totalFees && (
                          <div className="text-[11px] text-[#94A3B8] mt-1">
                            Fee: ₹{item.course.totalFees.toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Timeline */}
              <Section title="Metadata & Audit" icon={Clock} defaultOpen={false}>
                <InfoRow label="Created At" value={exam.createdAt ? new Date(exam.createdAt).toLocaleString("en-IN") : "N/A"} />
                <InfoRow label="Last Updated" value={exam.updatedAt ? new Date(exam.updatedAt).toLocaleString("en-IN") : "N/A"} />
                <InfoRow label="Slug" value={exam.slug} />
              </Section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
