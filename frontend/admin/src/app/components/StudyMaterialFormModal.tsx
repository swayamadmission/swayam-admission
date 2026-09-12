import React, { useState, useEffect } from "react";
import {
  X, Save, Loader2, Calendar, BookOpen, GraduationCap,
  Globe, Shield, ChevronDown, Plus, Check, FileText, Upload
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { materialsApi, type StudyMaterial, type CreateStudyMaterialPayload } from "../../api/materials.api";
import { coursesApi } from "../../api/courses.api";
import { collegesApi } from "../../api/colleges.api";
import { examsApi } from "../../api/exams.api";

interface StudyMaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  material?: StudyMaterial | null;
}

type Tab = "basic" | "academic" | "file" | "seo";

const CATEGORIES = [
  "ENGINEERING", "MEDICAL", "MANAGEMENT", "LAW", "ARTS", "SCIENCE",
  "COMMERCE", "GENERAL", "OTHER",
];

const MATERIAL_TYPES = [
  "PDF", "Notes", "PYQ", "Mock Test", "Sample Paper",
  "Syllabus", "Assignment", "E-Book", "Presentation", "Video Link",
];

const STATUSES = ["PUBLISHED", "DRAFT", "ARCHIVED"];

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "basic", label: "Basic Info", icon: BookOpen },
  { id: "academic", label: "Academic Details", icon: GraduationCap },
  { id: "file", label: "File & Resource", icon: Upload },
  { id: "seo", label: "SEO & Notes", icon: Globe },
];

const labelFmt = (s?: string) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function StudyMaterialFormModal({ isOpen, onClose, material }: StudyMaterialFormModalProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState<CreateStudyMaterialPayload>({
    title: "",
    materialType: "PDF",
    category: "ENGINEERING",
    description: "",
    stream: "",
    courseId: "",
    collegeId: "",
    examId: "",
    subject: "",
    semester: "",
    language: "English",
    fileName: "",
    fileUrl: "",
    thumbnail: "",
    fileSize: "",
    fileExtension: "pdf",
    pages: undefined,
    featured: false,
    premium: false,
    tags: [],
    status: "PUBLISHED",
    seoTitle: "",
    seoDescription: "",
  });

  // Fetch relations for select dropdowns
  const { data: coursesRes } = useQuery({
    queryKey: ["admin_courses", { limit: 100 }],
    queryFn: () => coursesApi.findAll({ limit: 100 }),
    enabled: isOpen,
  });

  const { data: collegesRes } = useQuery({
    queryKey: ["admin_colleges", { limit: 100 }],
    queryFn: () => collegesApi.findAll({ limit: 100 }),
    enabled: isOpen,
  });

  const { data: examsRes } = useQuery({
    queryKey: ["admin_exams", { limit: 100 }],
    queryFn: () => examsApi.findAll({ limit: 100 }),
    enabled: isOpen,
  });

  const courses = Array.isArray(coursesRes?.data?.data) ? coursesRes.data.data : [];
  const colleges = Array.isArray(collegesRes?.data?.data) ? collegesRes.data.data : [];
  const exams = Array.isArray(examsRes?.data?.data) ? examsRes.data.data : [];

  useEffect(() => {
    if (!isOpen) return;
    setTab("basic");
    setErrors({});
    setTagInput("");

    if (material) {
      setForm({
        title: material.title ?? "",
        materialType: material.materialType || "PDF",
        category: material.category || "ENGINEERING",
        description: material.description ?? "",
        stream: material.stream ?? "",
        courseId: material.courseId ?? "",
        collegeId: material.collegeId ?? "",
        examId: material.examId ?? "",
        subject: material.subject ?? "",
        semester: material.semester ?? "",
        language: material.language ?? "English",
        fileName: material.fileName ?? "",
        fileUrl: material.fileUrl ?? "",
        thumbnail: material.thumbnail ?? "",
        fileSize: material.fileSize ?? "",
        fileExtension: material.fileExtension ?? "pdf",
        pages: material.pages ?? undefined,
        featured: Boolean(material.featured),
        premium: Boolean(material.premium),
        tags: Array.isArray(material.tags) ? material.tags : [],
        status: material.status ?? "PUBLISHED",
        seoTitle: material.seoTitle ?? "",
        seoDescription: material.seoDescription ?? "",
      });
    } else {
      setForm({
        title: "",
        materialType: "PDF",
        category: "ENGINEERING",
        description: "",
        stream: "",
        courseId: "",
        collegeId: "",
        examId: "",
        subject: "",
        semester: "",
        language: "English",
        fileName: "",
        fileUrl: "",
        thumbnail: "",
        fileSize: "",
        fileExtension: "pdf",
        pages: undefined,
        featured: false,
        premium: false,
        tags: [],
        status: "PUBLISHED",
        seoTitle: "",
        seoDescription: "",
      });
    }
  }, [material, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: CreateStudyMaterialPayload) => {
      if (material?.id) return materialsApi.update(material.id, data);
      return materialsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_materials"] });
      queryClient.invalidateQueries({ queryKey: ["admin_materials_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      if (material?.id) {
        queryClient.invalidateQueries({ queryKey: ["admin_material_detail", material.id] });
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

  const addTagItem = () => {
    const item = tagInput.trim();
    if (!item) return;
    setForm((prev) => ({
      ...prev,
      tags: [...(prev.tags ?? []), item],
    }));
    setTagInput("");
  };

  const removeTagItem = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      tags: (prev.tags ?? []).filter((_, i) => i !== idx),
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title || !form.title.trim()) {
      errs.title = "Title is required";
    }
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
                {material ? "Edit Study Material" : "Upload Study Material"}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {material ? "Update digital resource details & links" : "Add a new PDF, notes, PYQ or mock test to learning library"}
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
                      Resource Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="e.g. Organic Chemistry Complete Revision Notes - Sem 1"
                      className={inputCls("title")}
                    />
                    {errors.title && (
                      <p className="text-red-500 text-xs mt-1">{errors.title}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Material Type</label>
                      <div className="relative">
                        <select name="materialType" value={form.materialType} onChange={handleChange} className={selectCls}>
                          {MATERIAL_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>

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
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Language</label>
                      <input
                        name="language"
                        value={form.language}
                        onChange={handleChange}
                        placeholder="e.g. English / Hindi"
                        className={inputCls()}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
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

                    <div className="flex items-center gap-2 pt-5">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="featured"
                          checked={Boolean(form.featured)}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#4A7B5B] peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                        <span className="ml-2 text-xs font-medium text-[#374151]">Featured</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="premium"
                          checked={Boolean(form.premium)}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#D97706] peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                        <span className="ml-2 text-xs font-medium text-[#374151]">Premium Only</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Description</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Brief overview of what is covered in this resource..."
                      className={textareaCls}
                    />
                  </div>
                </>
              )}

              {/* ── Tab: Academic ──────────────────────────────────────── */}
              {tab === "academic" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Subject</label>
                      <input
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        placeholder="e.g. Physics, Data Structures, Anatomy"
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Semester / Year</label>
                      <input
                        name="semester"
                        value={form.semester}
                        onChange={handleChange}
                        placeholder="e.g. Semester 1 / Year 1"
                        className={inputCls()}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Related Course</label>
                      <div className="relative">
                        <select name="courseId" value={form.courseId} onChange={handleChange} className={selectCls}>
                          <option value="">None (General)</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Related College</label>
                      <div className="relative">
                        <select name="collegeId" value={form.collegeId} onChange={handleChange} className={selectCls}>
                          <option value="">None (General)</option>
                          {colleges.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Related Exam</label>
                      <div className="relative">
                        <select name="examId" value={form.examId} onChange={handleChange} className={selectCls}>
                          <option value="">None (General)</option>
                          {exams.map((e) => (
                            <option key={e.id} value={e.id}>{e.examName}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Keywords & Tags</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); addTagItem(); }
                        }}
                        placeholder="Add tag (e.g. Important, 2026 PYQ) and press Enter..."
                        className={inputCls() + " flex-1"}
                      />
                      <button
                        type="button"
                        onClick={addTagItem}
                        className="h-9 px-3 rounded-xl text-white text-sm font-medium flex items-center gap-1"
                        style={{ background: "#4A7B5B" }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {(form.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(form.tags ?? []).map((t, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E8F3EC] text-[#4A7B5B]"
                          >
                            {t}
                            <button
                              type="button"
                              onClick={() => removeTagItem(i)}
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

              {/* ── Tab: File & Resource ───────────────────────────────── */}
              {tab === "file" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">File URL / Video Link / Resource URL</label>
                    <input
                      name="fileUrl"
                      value={form.fileUrl}
                      onChange={handleChange}
                      placeholder="e.g. https://storage.swayamadmission.com/materials/notes-01.pdf"
                      className={inputCls()}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">File Name</label>
                      <input
                        name="fileName"
                        value={form.fileName}
                        onChange={handleChange}
                        placeholder="e.g. Chemistry_Revision_2026.pdf"
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Thumbnail URL (optional)</label>
                      <input
                        name="thumbnail"
                        value={form.thumbnail}
                        onChange={handleChange}
                        placeholder="e.g. https://.../thumb.jpg"
                        className={inputCls()}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">File Format</label>
                      <input
                        name="fileExtension"
                        value={form.fileExtension}
                        onChange={handleChange}
                        placeholder="e.g. pdf, docx, pptx"
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">File Size</label>
                      <input
                        name="fileSize"
                        value={form.fileSize}
                        onChange={handleChange}
                        placeholder="e.g. 4.2 MB"
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Number of Pages</label>
                      <input
                        name="pages"
                        type="number"
                        value={form.pages ?? ""}
                        onChange={handleChange}
                        placeholder="e.g. 32"
                        min={0}
                        className={inputCls()}
                      />
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
                      placeholder="e.g. Download NEET UG 2026 Physics Formula Sheet PDF"
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
                  {material ? "Save Changes" : "Create Material"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
