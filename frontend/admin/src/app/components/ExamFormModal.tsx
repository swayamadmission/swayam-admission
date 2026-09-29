import React, { useState, useEffect } from "react";
import {
  X, Save, Loader2, Calendar, BookOpen, GraduationCap, IndianRupee,
  Globe, Shield, ChevronDown, Plus, Check, Search
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { examsApi, type Exam, type CreateExamPayload } from "../../api/exams.api";
import { coursesApi } from "../../api/courses.api";
import { organizationApi, StateItem } from "../../api/organization.api";

interface ExamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam?: Exam | null;
}

type Tab = "basic" | "schedule" | "eligibility" | "pattern" | "courses" | "seo";

const CATEGORIES = [
  "ENGINEERING", "MEDICAL", "MANAGEMENT", "LAW", "ARTS", "SCIENCE",
  "COMMERCE", "PHARMACY", "EDUCATION", "DESIGN", "AGRICULTURE",
  "COMPUTER_APPLICATIONS", "HOTEL_MANAGEMENT", "NURSING", "OTHER",
];

const LEVELS = ["NATIONAL", "STATE", "PRIVATE", "UG", "PG"];
const MODES = ["ONLINE", "OFFLINE", "HYBRID"];
const STATUSES = ["PUBLISHED", "DRAFT", "ARCHIVED"];

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "basic", label: "Basic Info", icon: BookOpen },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "eligibility", label: "Eligibility & Fees", icon: GraduationCap },
  { id: "pattern", label: "Pattern & Syllabus", icon: Shield },
  { id: "courses", label: "Courses", icon: GraduationCap },
  { id: "seo", label: "SEO", icon: Globe },
];

const labelFmt = (s?: string) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function ExamFormModal({ isOpen, onClose, exam }: ExamFormModalProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [syllabusInput, setSyllabusInput] = useState("");
  const [courseSearch, setCourseSearch] = useState("");

  const [form, setForm] = useState<CreateExamPayload>({
    examName: "",
    category: "ENGINEERING",
    level: "NATIONAL",
    conductedBy: "",
    eligibility: "",
    qualification: "",
    ageLimit: "",
    examMode: "ONLINE",
    applicationStart: "",
    applicationEnd: "",
    examDate: "",
    resultDate: "",
    counsellingDate: "",
    syllabus: [],
    pattern: "",
    totalMarks: undefined,
    duration: "",
    applicationFee: undefined,
    officialWebsite: "",
    preparationTips: "",
    importantBooks: [],
    previousYearPapers: [],
    faqs: null,
    seoTitle: "",
    seoDescription: "",
    description: "",
    stateId: "",
    featured: false,
    status: "PUBLISHED",
    courseIds: [],
  });

  // Fetch states list
  const { data: statesRes } = useQuery({
    queryKey: ["geography_states"],
    queryFn: () => organizationApi.getStates(),
    enabled: isOpen,
  });
  const statesList: StateItem[] = Array.isArray(statesRes) ? statesRes : (statesRes as any)?.data || [];

  // Fetch courses list for linking
  const { data: coursesRes } = useQuery({
    queryKey: ["admin_courses", { limit: 200 }],
    queryFn: () => coursesApi.findAll({ limit: 200 }),
    enabled: isOpen,
  });

  const rawCourses = coursesRes?.data?.data ?? (Array.isArray(coursesRes?.data) ? coursesRes?.data : []);
  const allCourses = Array.isArray(rawCourses) ? rawCourses : [];

  useEffect(() => {
    if (!isOpen) return;
    setTab("basic");
    setErrors({});
    setSyllabusInput("");
    setCourseSearch("");

    if (exam) {
      setForm({
        examName: exam.examName ?? "",
        category: exam.category || "ENGINEERING",
        level: exam.level || "NATIONAL",
        conductedBy: exam.conductedBy ?? "",
        eligibility: exam.eligibility ?? "",
        qualification: exam.qualification ?? "",
        ageLimit: exam.ageLimit ?? "",
        examMode: exam.examMode ?? "ONLINE",
        applicationStart: exam.applicationStart ? String(exam.applicationStart).split("T")[0] : "",
        applicationEnd: exam.applicationEnd ? String(exam.applicationEnd).split("T")[0] : "",
        examDate: exam.examDate ? String(exam.examDate).split("T")[0] : "",
        resultDate: exam.resultDate ? String(exam.resultDate).split("T")[0] : "",
        counsellingDate: exam.counsellingDate ? String(exam.counsellingDate).split("T")[0] : "",
        syllabus: Array.isArray(exam.syllabus) ? exam.syllabus : [],
        pattern: exam.pattern ?? "",
        totalMarks: exam.totalMarks ?? undefined,
        duration: exam.duration ?? "",
        applicationFee: exam.applicationFee ?? undefined,
        officialWebsite: exam.officialWebsite ?? "",
        preparationTips: exam.preparationTips ?? "",
        importantBooks: Array.isArray(exam.importantBooks) ? exam.importantBooks : [],
        previousYearPapers: Array.isArray(exam.previousYearPapers) ? exam.previousYearPapers : [],
        faqs: exam.faqs ?? null,
        seoTitle: exam.seoTitle ?? "",
        seoDescription: exam.seoDescription ?? "",
        description: exam.description ?? "",
        stateId: exam.stateId ?? "",
        featured: Boolean(exam.featured),
        status: exam.status ?? "PUBLISHED",
        courseIds: Array.isArray(exam.courses) ? exam.courses.map((c) => c?.courseId).filter(Boolean) : [],
      });
    } else {
      setForm({
        examName: "",
        category: "ENGINEERING",
        level: "NATIONAL",
        conductedBy: "",
        eligibility: "",
        qualification: "",
        ageLimit: "",
        examMode: "ONLINE",
        applicationStart: "",
        applicationEnd: "",
        examDate: "",
        resultDate: "",
        counsellingDate: "",
        syllabus: [],
        pattern: "",
        totalMarks: undefined,
        duration: "",
        applicationFee: undefined,
        officialWebsite: "",
        preparationTips: "",
        importantBooks: [],
        previousYearPapers: [],
        faqs: null,
        seoTitle: "",
        seoDescription: "",
        description: "",
        stateId: "",
        featured: false,
        status: "PUBLISHED",
        courseIds: [],
      });
    }
  }, [exam, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: CreateExamPayload) => {
      if (exam?.id) return examsApi.update(exam.id, data);
      return examsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_exams"] });
      queryClient.invalidateQueries({ queryKey: ["admin_exams_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      if (exam?.id) {
        queryClient.invalidateQueries({ queryKey: ["admin_exam_detail", exam.id] });
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

  const toggleCourseSelection = (courseId: string) => {
    setForm((prev) => {
      const current = prev.courseIds ?? [];
      const updated = current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId];
      return { ...prev, courseIds: updated };
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.examName || !form.examName.trim()) errs.examName = "Exam name is required";
    if (!form.category) errs.category = "Category is required";
    if (!form.level) errs.level = "Exam level is required";
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

  const filteredCourses = allCourses.filter((c) => {
    const courseName = (c?.name ?? "").toLowerCase();
    const collegeName = (c?.college?.name ?? "").toLowerCase();
    const query = courseSearch.toLowerCase();
    return courseName.includes(query) || collegeName.includes(query);
  });

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
          style={{ maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] shrink-0"
            style={{ background: "linear-gradient(135deg, #4A7B5B 0%, #3B664A 100%)" }}
          >
            <div>
              <h2 className="text-lg font-semibold text-white">
                {exam ? "Edit Entrance Exam" : "Add Entrance Exam"}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {exam ? "Update exam schedule, pattern & details" : "Configure a new national, state or university exam"}
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
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
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
                      Exam Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="examName"
                      value={form.examName}
                      onChange={handleChange}
                      placeholder="e.g. JEE Main, NEET UG, CAT"
                      className={inputCls("examName")}
                    />
                    {errors.examName && (
                      <p className="text-red-500 text-xs mt-1">{errors.examName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Conducted By</label>
                      <input
                        name="conductedBy"
                        value={form.conductedBy}
                        onChange={handleChange}
                        placeholder="e.g. National Testing Agency (NTA)"
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Official Website</label>
                      <input
                        name="officialWebsite"
                        value={form.officialWebsite}
                        onChange={handleChange}
                        placeholder="e.g. https://jeemain.nta.nic.in"
                        className={inputCls()}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
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
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Exam Level</label>
                      <div className="relative">
                        <select name="level" value={form.level} onChange={handleChange} className={selectCls}>
                          {LEVELS.map((l) => (
                            <option key={l} value={l}>{labelFmt(l)}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Exam Mode</label>
                      <div className="relative">
                        <select name="examMode" value={form.examMode} onChange={handleChange} className={selectCls}>
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
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">
                        Assigned State (State Tab Sync)
                      </label>
                      <div className="relative">
                        <select
                          name="stateId"
                          value={form.stateId || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((prev) => ({
                              ...prev,
                              stateId: val,
                              level: val ? (prev.level === "NATIONAL" ? "STATE" : prev.level) : prev.level,
                            }));
                          }}
                          className={selectCls}
                        >
                          <option value="">National / All India (No State)</option>
                          {statesList.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name} ({st.code})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-1">
                        Assigning to a state publishes it directly under that State's Exam tab.
                      </p>
                    </div>

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

                      <div className="flex items-center gap-3 pt-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="featured"
                            checked={Boolean(form.featured)}
                            onChange={handleChange}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#4A7B5B] peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                          <span className="ml-2 text-xs font-medium text-[#374151]">Featured Exam</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Description & Overview</label>
                    <textarea
                      name="description"
                      value={form.description || ""}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Comprehensive overview of this entrance exam, conducting body, syllabus, and eligibility highlights..."
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#4A7B5B] placeholder:text-[#94A3B8]"
                    />
                  </div>
                </>
              )}

              {/* ── Tab: Schedule ──────────────────────────────────────── */}
              {tab === "schedule" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Application Start Date</label>
                      <input
                        type="date"
                        name="applicationStart"
                        value={form.applicationStart}
                        onChange={handleChange}
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Application Deadline</label>
                      <input
                        type="date"
                        name="applicationEnd"
                        value={form.applicationEnd}
                        onChange={handleChange}
                        className={inputCls()}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Exam Date</label>
                      <input
                        type="date"
                        name="examDate"
                        value={form.examDate}
                        onChange={handleChange}
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Result Date</label>
                      <input
                        type="date"
                        name="resultDate"
                        value={form.resultDate}
                        onChange={handleChange}
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Counselling Start</label>
                      <input
                        type="date"
                        name="counsellingDate"
                        value={form.counsellingDate}
                        onChange={handleChange}
                        className={inputCls()}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Exam Duration</label>
                    <input
                      name="duration"
                      value={form.duration}
                      onChange={handleChange}
                      placeholder="e.g. 3 Hours (180 Minutes)"
                      className={inputCls()}
                    />
                  </div>
                </>
              )}

              {/* ── Tab: Eligibility & Fees ────────────────────────────── */}
              {tab === "eligibility" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Eligibility Summary</label>
                    <textarea
                      name="eligibility"
                      value={form.eligibility}
                      onChange={handleChange}
                      rows={3}
                      placeholder="e.g. Must have passed 10+2 with PCM minimum 75% marks..."
                      className={textareaCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Minimum Qualification</label>
                      <input
                        name="qualification"
                        value={form.qualification}
                        onChange={handleChange}
                        placeholder="e.g. 10+2 / Diploma"
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Age Limit</label>
                      <input
                        name="ageLimit"
                        value={form.ageLimit}
                        onChange={handleChange}
                        placeholder="e.g. 17-25 Years"
                        className={inputCls()}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">
                      <IndianRupee className="inline w-3 h-3 mr-0.5" />Application Fee (₹)
                    </label>
                    <input
                      name="applicationFee"
                      type="number"
                      value={form.applicationFee ?? ""}
                      onChange={handleChange}
                      placeholder="e.g. 1000"
                      min={0}
                      className={inputCls()}
                    />
                  </div>
                </>
              )}

              {/* ── Tab: Pattern & Syllabus ────────────────────────────── */}
              {tab === "pattern" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Exam Pattern</label>
                      <input
                        name="pattern"
                        value={form.pattern}
                        onChange={handleChange}
                        placeholder="e.g. MCQ based (Physics, Chemistry, Maths)"
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Total Marks</label>
                      <input
                        name="totalMarks"
                        type="number"
                        value={form.totalMarks ?? ""}
                        onChange={handleChange}
                        placeholder="e.g. 300"
                        min={0}
                        className={inputCls()}
                      />
                    </div>
                  </div>

                  {/* Syllabus tags */}
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Syllabus Topics</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={syllabusInput}
                        onChange={(e) => setSyllabusInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); addSyllabusItem(); }
                        }}
                        placeholder="Add topic (e.g. Thermodynamics) and press Enter..."
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

                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Preparation Tips</label>
                    <textarea
                      name="preparationTips"
                      value={form.preparationTips}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Tips and strategies for candidates..."
                      className={textareaCls}
                    />
                  </div>
                </>
              )}

              {/* ── Tab: Courses ────────────────────────────────────────── */}
              {tab === "courses" && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-[#374151]">
                        Select Accepted Courses ({(form.courseIds ?? []).length} selected)
                      </label>
                    </div>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                      <input
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        placeholder="Search courses or colleges..."
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:border-[#4A7B5B]"
                      />
                    </div>

                    <div className="border border-[#E2E8F0] rounded-xl max-h-60 overflow-y-auto divide-y divide-[#F1F5F9]">
                      {filteredCourses.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[#94A3B8]">No courses found</div>
                      ) : (
                        filteredCourses.map((c) => {
                          const isSelected = (form.courseIds ?? []).includes(c.id);
                          return (
                            <div
                              key={c.id}
                              onClick={() => toggleCourseSelection(c.id)}
                              className={`p-3 flex items-center justify-between cursor-pointer hover:bg-[#F8FAFC] transition-colors ${
                                isSelected ? "bg-[#E8F3EC]/50" : ""
                              }`}
                            >
                              <div>
                                <div className="text-xs font-semibold text-[#4A7B5B]">{c.name ?? "Unnamed Course"}</div>
                                <div className="text-[11px] text-[#94A3B8]">
                                  {c.college?.name ?? "College N/A"} ({c.college?.city ?? ""}, {c.college?.state ?? ""})
                                </div>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                  isSelected
                                    ? "bg-[#4A7B5B] border-[#4A7B5B] text-white"
                                    : "border-[#CBD5E1] bg-white"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ── Tab: SEO ───────────────────────────────────────────── */}
              {tab === "seo" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Meta Title</label>
                    <input
                      name="seoTitle"
                      value={form.seoTitle}
                      onChange={handleChange}
                      placeholder="e.g. JEE Main 2026 - Exam Dates, Syllabus, Cutoff"
                      className={inputCls()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Meta Description</label>
                    <textarea
                      name="seoDescription"
                      value={form.seoDescription}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Brief meta description for search engines..."
                      className={textareaCls}
                    />
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
                    className="w-2 h-2 rounded-full transition-colors cursor-pointer"
                    style={{ background: tab === id ? "#4A7B5B" : "#CBD5E1" }}
                    onClick={() => setTab(TABS[i].id)}
                  />
                ))}
              </div>

              {mutation.isError && (
                <span className="text-red-500 text-xs">
                  Save failed. Please check inputs.
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
                  {exam ? "Save Changes" : "Create Exam"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
