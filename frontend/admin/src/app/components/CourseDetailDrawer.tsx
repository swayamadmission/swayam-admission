import React, { useState } from "react";
import {
  X, MapPin, Building, Globe, Phone, Mail, Edit, Trash2,
  GraduationCap, IndianRupee, Briefcase, Users, BookOpen,
  Star, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Calendar, Clock, Layers
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { coursesApi, type Course } from "../../api/courses.api";

interface CourseDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string | null;
  onEdit: (course: Course) => void;
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
      <span className="text-xs text-[#94A3B8] shrink-0 w-28">{label}</span>
      <span className="text-xs text-[#1E293B] font-medium text-right flex-1">{value}</span>
    </div>
  );
}

export default function CourseDetailDrawer({
  isOpen,
  onClose,
  courseId,
  onEdit,
}: CourseDetailDrawerProps) {
  const queryClient = useQueryClient();

  const { data: courseRes, isLoading } = useQuery({
    queryKey: ["admin_course_detail", courseId],
    queryFn: () => coursesApi.findById(courseId!),
    enabled: isOpen && !!courseId,
  });

  const course = courseRes?.data;

  const deleteMutation = useMutation({
    mutationFn: () => coursesApi.delete(courseId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin_courses_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      onClose();
    },
  });

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to archive "${course?.name}"? This action sets the course to ARCHIVED status.`
      )
    ) {
      deleteMutation.mutate();
    }
  };

  if (!isOpen) return null;

  const statusConf = STATUS_COLORS[course?.status ?? "DRAFT"];
  const catColor = CATEGORY_COLORS[course?.category ?? "OTHER"] ?? "#64748B";

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
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="px-6 py-5 shrink-0 relative"
          style={{
            background: "linear-gradient(135deg, #4A7B5B 0%, #5a9b6b 100%)",
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
          ) : course ? (
            <>
              {/* Category badge */}
              <div
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
                style={{ background: `${catColor}22`, color: catColor, border: `1px solid ${catColor}40` }}
              >
                <GraduationCap className="w-3 h-3" />
                {labelFmt(course.category)}
              </div>
              <h2 className="text-xl font-bold text-white mb-1 pr-10 leading-tight">
                {course.name}
              </h2>
              <div className="flex items-center gap-1.5 text-white/80 text-sm">
                <Building className="w-3.5 h-3.5" />
                {course.college?.name}
                {course.college?.city && (
                  <span className="text-white/50">·</span>
                )}
                {course.college?.city && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {course.college.city}
                  </span>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* ── Action Bar ──────────────────────────────────────────────────── */}
        {course && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F1F5F9] shrink-0 bg-white">
            <div
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: statusConf.bg, color: statusConf.text }}
            >
              {labelFmt(course.status)}
            </div>
            {course.featured && (
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
                type="button"
                onClick={() => onEdit(course)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ background: "#4A7B5B" }}
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#DC2626] bg-[#FEE2E2] hover:bg-[#FECACA] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Archive
              </button>
            </div>
          </div>
        )}

        {/* ── Drawer Body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "#4A7B5B", borderTopColor: "transparent" }}
              />
              <span className="text-xs text-[#94A3B8]">Loading details...</span>
            </div>
          ) : course ? (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Applications",
                    value: course._count?.applications ?? 0,
                    icon: Users,
                    color: "#4A7B5B",
                  },
                  {
                    label: "Total Seats",
                    value: course.seats ?? "—",
                    icon: GraduationCap,
                    color: "#0EA5E9",
                  },
                  {
                    label: "Total Fee",
                    value: course.totalFees
                      ? `₹${course.totalFees.toLocaleString("en-IN")}`
                      : "—",
                    icon: IndianRupee,
                    color: "#7C3AED",
                  },
                  {
                    label: "Avg Salary",
                    value: course.averageSalary
                      ? `${course.averageSalary} LPA`
                      : "—",
                    icon: Briefcase,
                    color: "#F97316",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-white p-3 rounded-xl border border-[#F1F5F9]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: `${s.color}15` }}
                      >
                        <s.icon
                          className="w-3.5 h-3.5"
                          style={{ color: s.color }}
                        />
                      </div>
                      <span className="text-xs text-[#94A3B8]">{s.label}</span>
                    </div>
                    <div className="text-lg font-bold text-[#4A7B5B]">
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Overview */}
              <Section title="Overview" icon={BookOpen}>
                <InfoRow label="Level" value={labelFmt(course.level)} />
                <InfoRow
                  label="Duration"
                  value={`${course.duration} ${labelFmt(course.durationType)}`}
                />
                <InfoRow label="Mode" value={labelFmt(course.mode)} />
                <InfoRow label="Category" value={labelFmt(course.category)} />
                {course.description && (
                  <div>
                    <p className="text-xs text-[#94A3B8] mb-1">Description</p>
                    <p className="text-xs text-[#1E293B] leading-relaxed">
                      {course.description}
                    </p>
                  </div>
                )}
              </Section>

              {/* Branches & Specializations */}
              <Section
                title={`Branches & Specializations (${(course.branches ?? []).length})`}
                icon={Layers}
                defaultOpen={true}
              >
                {(course.branches ?? []).length > 0 ? (
                  <div className="space-y-2">
                    {course.branches!.map((b) => (
                      <div
                        key={b.id}
                        className="bg-white p-3 rounded-lg border border-[#E2E8F0] flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#4A7B5B]">
                              {b.name}
                            </span>
                            {b.code && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#E8F3EC] text-[#2D5A3D] border border-[#C2DEC9]">
                                {b.code}
                              </span>
                            )}
                          </div>
                          {b.type && (
                            <span className="text-[10px] text-[#64748B]">
                              Type: {b.type}
                            </span>
                          )}
                        </div>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            backgroundColor:
                              b.status === "ACTIVE"
                                ? "#D1FAE5"
                                : b.status === "DISABLED"
                                ? "#FEF3C7"
                                : "#FEE2E2",
                            color:
                              b.status === "ACTIVE"
                                ? "#059669"
                                : b.status === "DISABLED"
                                ? "#D97706"
                                : "#DC2626",
                          }}
                        >
                          {b.status}
                        </span>
                      </div>
                    ))}
                    <p className="text-[11px] text-[#64748B] pt-1">
                      {course.allowOtherBranch !== false
                        ? "✓ Allows applicants to specify a custom 'Other' specialization during admission."
                        : "✕ Custom 'Other' specialization is restricted for this course."}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-white rounded-lg border border-dashed border-[#CBD5E1]">
                    <Layers className="w-6 h-6 text-[#94A3B8] mx-auto mb-1.5 opacity-60" />
                    <p className="text-xs font-medium text-[#475569]">
                      Standalone Program
                    </p>
                    <p className="text-[11px] text-[#94A3B8]">
                      No sub-specializations configured. Students apply directly to this program.
                    </p>
                  </div>
                )}
              </Section>

              {/* Eligibility */}
              {(course.eligibility || course.entranceExam) && (
                <Section title="Eligibility" icon={CheckCircle2}>
                  <InfoRow label="Criteria" value={course.eligibility} />
                  <InfoRow label="Entrance Exam" value={course.entranceExam} />
                </Section>
              )}

              {/* Fees */}
              {(course.totalFees || course.semesterFees) && (
                <Section title="Fee Structure" icon={IndianRupee}>
                  <InfoRow
                    label="Total Fee"
                    value={
                      course.totalFees
                        ? `₹${course.totalFees.toLocaleString("en-IN")}`
                        : undefined
                    }
                  />
                  <InfoRow
                    label="Semester Fee"
                    value={
                      course.semesterFees
                        ? `₹${course.semesterFees.toLocaleString("en-IN")}`
                        : undefined
                    }
                  />
                </Section>
              )}

              {/* Syllabus */}
              {(course.syllabus ?? []).length > 0 && (
                <Section title="Syllabus" icon={BookOpen} defaultOpen={false}>
                  <div className="flex flex-wrap gap-2">
                    {course.syllabus!.map((item, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{ background: "#E8F3EC", color: "#4A7B5B" }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Career */}
              {(course.careerScope || course.averageSalary) && (
                <Section title="Career Information" icon={Briefcase}>
                  {course.careerScope && (
                    <p className="text-xs text-[#1E293B] leading-relaxed">
                      {course.careerScope}
                    </p>
                  )}
                  <InfoRow
                    label="Avg Salary"
                    value={
                      course.averageSalary
                        ? `${course.averageSalary} LPA`
                        : undefined
                    }
                  />
                </Section>
              )}

              {/* College Info */}
              {course.college && (
                <Section title="College" icon={Building} defaultOpen={false}>
                  <InfoRow label="College" value={course.college.name} />
                  <InfoRow
                    label="Location"
                    value={
                      course.college.city
                        ? `${course.college.city}, ${course.college.state}`
                        : course.college.state
                    }
                  />
                  {course.college.university && (
                    <InfoRow label="University" value={course.college.university} />
                  )}
                  {course.college.naacGrade && (
                    <InfoRow label="NAAC Grade" value={course.college.naacGrade} />
                  )}
                  {(course.college.approvals ?? []).length > 0 && (
                    <InfoRow
                      label="Approvals"
                      value={(course.college.approvals ?? []).join(", ")}
                    />
                  )}
                  {course.college.website && (
                    <InfoRow
                      label="Website"
                      value={
                        <a
                          href={course.college.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Globe className="w-3 h-3" />
                          Visit
                        </a>
                      }
                    />
                  )}
                  {course.college.phone && (
                    <InfoRow
                      label="Phone"
                      value={
                        <a
                          href={`tel:${course.college.phone}`}
                          className="flex items-center gap-1 text-[#4A7B5B]"
                        >
                          <Phone className="w-3 h-3" />
                          {course.college.phone}
                        </a>
                      }
                    />
                  )}
                  {course.college.email && (
                    <InfoRow
                      label="Email"
                      value={
                        <a
                          href={`mailto:${course.college.email}`}
                          className="flex items-center gap-1 text-[#4A7B5B]"
                        >
                          <Mail className="w-3 h-3" />
                          {course.college.email}
                        </a>
                      }
                    />
                  )}
                </Section>
              )}

              {/* Recent Applications */}
              {(course.applications ?? []).length > 0 && (
                <Section
                  title={`Applications (${course._count?.applications ?? 0})`}
                  icon={Users}
                  defaultOpen={false}
                >
                  <div className="space-y-2">
                    {course.applications!.map((app) => (
                      <div
                        key={app.id}
                        className="bg-white p-3 rounded-xl border border-[#F1F5F9]"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-[#4A7B5B]">
                            {app.user?.fullName}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background:
                                app.status === "ADMISSION_CONFIRMED"
                                  ? "#D1FAE5"
                                  : "#F1F5F9",
                              color:
                                app.status === "ADMISSION_CONFIRMED"
                                  ? "#059669"
                                  : "#64748B",
                            }}
                          >
                            {labelFmt(app.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
                          <span className="flex items-center gap-0.5">
                            <Mail className="w-3 h-3" />
                            {app.user?.email}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(app.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(course._count?.applications ?? 0) > 10 && (
                      <p className="text-xs text-center text-[#94A3B8] pt-1">
                        Showing latest 10 of {course._count?.applications} applications
                      </p>
                    )}
                  </div>
                </Section>
              )}

              {/* Timeline */}
              <Section title="Timeline" icon={Clock} defaultOpen={false}>
                <InfoRow
                  label="Created"
                  value={new Date(course.createdAt).toLocaleString("en-IN")}
                />
                <InfoRow
                  label="Last Updated"
                  value={new Date(course.updatedAt).toLocaleString("en-IN")}
                />
              </Section>
            </>
          ) : (
            <div className="text-center py-10 text-[#94A3B8]">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Course not found</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
