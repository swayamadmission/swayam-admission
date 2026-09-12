import React, { useState, useEffect } from "react";
import { X, Save, Loader2, BookOpen, GraduationCap, IndianRupee, Briefcase, ChevronDown, Plus } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { coursesApi, type Course, type CreateCoursePayload } from "../../api/courses.api";
import { collegesApi } from "../../api/colleges.api";

interface CourseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  course?: Course | null;
}

type Tab = "basic" | "academic" | "fees" | "career";

const CATEGORIES = [
  "ENGINEERING", "MANAGEMENT", "MEDICAL", "LAW", "ARTS", "SCIENCE",
  "COMMERCE", "PHARMACY", "EDUCATION", "DESIGN", "AGRICULTURE",
  "COMPUTER_APPLICATIONS", "HOTEL_MANAGEMENT", "NURSING", "OTHER",
];

const LEVELS = ["UG", "PG", "DIPLOMA", "CERTIFICATE", "PHD", "INTEGRATED"];
const MODES = ["FULL_TIME", "PART_TIME", "DISTANCE", "ONLINE", "HYBRID"];
const DURATION_TYPES = ["YEARS", "MONTHS", "SEMESTERS"];
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "basic", label: "Basic Info", icon: BookOpen },
  { id: "academic", label: "Academic", icon: GraduationCap },
  { id: "fees", label: "Fees", icon: IndianRupee },
  { id: "career", label: "Career", icon: Briefcase },
];

const labelFmt = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function CourseFormModal({ isOpen, onClose, course }: CourseFormModalProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [syllabusInput, setSyllabusInput] = useState("");

  const [form, setForm] = useState<CreateCoursePayload>({
    name: "",
    collegeId: "",
    category: "OTHER",
    level: "UG",
    duration: "1",
    durationType: "YEARS",
    mode: "FULL_TIME",
    featured: false,
    status: "DRAFT",
    description: "",
    eligibility: "",
    entranceExam: "",
    seats: undefined,
    syllabus: [],
    totalFees: undefined,
    semesterFees: undefined,
    careerScope: "",
    averageSalary: undefined,
  });

  // Load colleges for the college picker
  const { data: collegesRes } = useQuery({
    queryKey: ["admin_colleges", { limit: 200 }],
    queryFn: () => collegesApi.findAll({ limit: 200 }),
    enabled: isOpen,
  });
  const colleges = collegesRes?.data?.data ?? [];

  // Reset form when opening
  useEffect(() => {
    if (!isOpen) return;
    setTab("basic");
    setErrors({});
    setSyllabusInput("");

    if (course) {
      setForm({
        name: course.name,
        collegeId: course.collegeId,
        category: course.category,
        level: course.level,
        duration: course.duration,
        durationType: course.durationType,
        mode: course.mode,
        featured: course.featured,
        status: course.status,
        description: course.description ?? "",
        eligibility: course.eligibility ?? "",
        entranceExam: course.entranceExam ?? "",
        seats: course.seats,
        syllabus: course.syllabus ?? [],
        totalFees: course.totalFees,
        semesterFees: course.semesterFees,
        careerScope: course.careerScope ?? "",
        averageSalary: course.averageSalary,
      });
    } else {
      setForm({
        name: "",
        collegeId: "",
        category: "OTHER",
        level: "UG",
        duration: "1",
        durationType: "YEARS",
        mode: "FULL_TIME",
        featured: false,
        status: "DRAFT",
        description: "",
        eligibility: "",
        entranceExam: "",
        seats: undefined,
        syllabus: [],
        totalFees: undefined,
        semesterFees: undefined,
        careerScope: "",
        averageSalary: undefined,
      });
    }
  }, [course, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: CreateCoursePayload) => {
      if (course?.id) return coursesApi.update(course.id, data);
      return coursesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin_courses_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_colleges"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      if (course?.id) {
        queryClient.invalidateQueries({ queryKey: ["admin_course_detail", course.id] });
      }
      onClose();
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setErrors((prev) => ({ ...prev, [name]: "" }));
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === "number") {
      setForm((prev) => ({ ...prev, [name]: value === "" ? undefined : Number(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addSyllabusItem = () => {
    const item = syllabusInput.trim();
    if (!item) return;
    setForm((prev) => ({ ...prev, syllabus: [...(prev.syllabus ?? []), item] }));
    setSyllabusInput("");
  };

  const removeSyllabusItem = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      syllabus: (prev.syllabus ?? []).filter((_, i) => i !== idx),
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Course name is required";
    if (!form.collegeId) errs.collegeId = "Please select a college";
    if (!form.duration || form.duration === "") errs.duration = "Duration is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setTab("basic");
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate(form);
  };

  if (!isOpen) return null;

  const inputCls = (field?: string) =>
    `w-full h-9 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
      field && errors[field]
        ? "border-red-400 focus:ring-red-200"
        : "border-[#E2E8F0] focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
    } bg-white`;

  const textareaCls = `w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] transition-all resize-none bg-white`;

  const selectCls = `w-full h-9 px-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] transition-all bg-white appearance-none cursor-pointer`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] shrink-0"
            style={{ background: "linear-gradient(135deg, #4A7B5B 0%, #5a9b6b 100%)" }}
          >
            <div>
              <h2 className="text-lg font-semibold text-white">
                {course ? "Edit Course" : "Add Course"}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {course ? "Update course details below" : "Fill in the details to create a new course"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#F1F5F9] bg-[#F8FAFC] shrink-0 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === id
                    ? "border-[#4A7B5B] text-[#4A7B5B] bg-white"
                    : "border-transparent text-[#94A3B8] hover:text-[#475569]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* ── Tab: Basic ─────────────────────────────────────────── */}
              {tab === "basic" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">
                      Course Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Bachelor of Technology (Computer Science)"
                      className={inputCls("name")}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">
                      College <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="collegeId"
                        value={form.collegeId}
                        onChange={handleChange}
                        className={selectCls + (errors.collegeId ? " border-red-400" : "")}
                      >
                        <option value="">— Select College —</option>
                        {colleges.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.city}, {c.state})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                    </div>
                    {errors.collegeId && (
                      <p className="text-red-500 text-xs mt-1">{errors.collegeId}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Category</label>
                      <div className="relative">
                        <select name="category" value={form.category} onChange={handleChange} className={selectCls}>
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{labelFmt(c)}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Level</label>
                      <div className="relative">
                        <select name="level" value={form.level} onChange={handleChange} className={selectCls}>
                          {LEVELS.map((l) => (
                            <option key={l} value={l}>{labelFmt(l)}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">
                        Duration <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="duration"
                        value={form.duration}
                        onChange={handleChange}
                        placeholder="e.g. 4"
                        className={inputCls("duration")}
                      />
                      {errors.duration && (
                        <p className="text-red-500 text-xs mt-1">{errors.duration}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Duration Type</label>
                      <div className="relative">
                        <select name="durationType" value={form.durationType} onChange={handleChange} className={selectCls}>
                          {DURATION_TYPES.map((d) => (
                            <option key={d} value={d}>{labelFmt(d)}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Mode</label>
                      <div className="relative">
                        <select name="mode" value={form.mode} onChange={handleChange} className={selectCls}>
                          {MODES.map((m) => (
                            <option key={m} value={m}>{labelFmt(m)}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Status</label>
                      <div className="relative">
                        <select name="status" value={form.status} onChange={handleChange} className={selectCls}>
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{labelFmt(s)}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-5">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="featured"
                          checked={form.featured}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#4A7B5B] peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                        <span className="ml-2 text-xs font-medium text-[#374151]">Featured</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* ── Tab: Academic ──────────────────────────────────────── */}
              {tab === "academic" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Description</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Brief course description..."
                      className={textareaCls}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Eligibility Criteria</label>
                    <textarea
                      name="eligibility"
                      value={form.eligibility}
                      onChange={handleChange}
                      rows={2}
                      placeholder="e.g. 10+2 with PCM, minimum 60%"
                      className={textareaCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Entrance Exam</label>
                      <input
                        name="entranceExam"
                        value={form.entranceExam}
                        onChange={handleChange}
                        placeholder="e.g. JEE Main, CAT, NEET"
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Total Seats</label>
                      <input
                        name="seats"
                        type="number"
                        value={form.seats ?? ""}
                        onChange={handleChange}
                        placeholder="e.g. 120"
                        min={0}
                        className={inputCls()}
                      />
                    </div>
                  </div>

                  {/* Syllabus Tag Input */}
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Syllabus / Subjects</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={syllabusInput}
                        onChange={(e) => setSyllabusInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); addSyllabusItem(); }
                        }}
                        placeholder="Add subject and press Enter..."
                        className={inputCls() + " flex-1"}
                      />
                      <button
                        type="button"
                        onClick={addSyllabusItem}
                        className="h-9 px-3 rounded-xl text-white text-sm font-medium flex items-center gap-1"
                        style={{ background: "#4A7B5B" }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {(form.syllabus ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(form.syllabus ?? []).map((item, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                            style={{ background: "#E8F3EC", color: "#4A7B5B" }}
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => removeSyllabusItem(i)}
                              className="ml-0.5 text-[#4A7B5B]/60 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Tab: Fees ──────────────────────────────────────────── */}
              {tab === "fees" && (
                <>
                  <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                    <p className="text-xs text-[#64748B] mb-3">Enter fee amounts in ₹ (INR)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1.5">
                          <IndianRupee className="inline w-3 h-3 mr-0.5" />Total Fee (per year)
                        </label>
                        <input
                          name="totalFees"
                          type="number"
                          value={form.totalFees ?? ""}
                          onChange={handleChange}
                          placeholder="e.g. 150000"
                          min={0}
                          className={inputCls()}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1.5">
                          <IndianRupee className="inline w-3 h-3 mr-0.5" />Semester Fee
                        </label>
                        <input
                          name="semesterFees"
                          type="number"
                          value={form.semesterFees ?? ""}
                          onChange={handleChange}
                          placeholder="e.g. 75000"
                          min={0}
                          className={inputCls()}
                        />
                      </div>
                    </div>
                  </div>

                  {form.totalFees !== undefined && form.totalFees > 0 && (
                    <div
                      className="p-3 rounded-xl text-sm"
                      style={{ background: "#E8F3EC", color: "#4A7B5B" }}
                    >
                      <div className="font-medium">Fee Summary</div>
                      <div className="text-xs mt-1">
                        Total: ₹{form.totalFees.toLocaleString("en-IN")}
                        {form.semesterFees
                          ? ` | Semester: ₹${form.semesterFees.toLocaleString("en-IN")}`
                          : ""}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Tab: Career ────────────────────────────────────────── */}
              {tab === "career" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Career Scope</label>
                    <textarea
                      name="careerScope"
                      value={form.careerScope}
                      onChange={handleChange}
                      rows={4}
                      placeholder="e.g. Software Engineer, Data Scientist, System Analyst..."
                      className={textareaCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">
                      Average Salary (LPA)
                    </label>
                    <input
                      name="averageSalary"
                      type="number"
                      value={form.averageSalary ?? ""}
                      onChange={handleChange}
                      placeholder="e.g. 8"
                      min={0}
                      step={0.5}
                      className={inputCls()}
                    />
                    <p className="text-xs text-[#94A3B8] mt-1">
                      In Lakhs Per Annum (LPA)
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC] shrink-0">
              <div className="flex gap-2">
                {TABS.map(({ id }, i) => (
                  <div
                    key={id}
                    className="w-2 h-2 rounded-full transition-colors"
                    style={{
                      background: tab === id ? "#4A7B5B" : "#CBD5E1",
                    }}
                    onClick={() => setTab(TABS[i].id)}
                  />
                ))}
              </div>

              {mutation.isError && (
                <span className="text-red-500 text-xs">
                  {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Save failed"}
                </span>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-xl border border-[#E2E8F0] text-sm text-[#475569] hover:bg-[#F1F5F9] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="h-9 px-5 rounded-xl text-white text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-60"
                  style={{ background: "#4A7B5B" }}
                >
                  {mutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {course ? "Save Changes" : "Create Course"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
