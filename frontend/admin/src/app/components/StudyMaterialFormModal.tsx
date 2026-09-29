import React, { useState, useEffect, useRef } from "react";
import {
  X, Save, Loader2, Calendar, BookOpen, GraduationCap,
  Globe, Shield, ChevronDown, Plus, Check, FileText, Upload,
  Image as ImageIcon, UserCheck, Sparkles, ExternalLink
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { materialsApi, resolveThumbnailUrl, type StudyMaterial, type CreateStudyMaterialPayload } from "../../api/materials.api";
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
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isUploadingPreview, setIsUploadingPreview] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUploadError, setPreviewUploadError] = useState<string | null>(null);
  const [thumbnailUploadError, setThumbnailUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [previewSuccessMessage, setPreviewSuccessMessage] = useState<string | null>(null);
  const [thumbnailSuccessMessage, setThumbnailSuccessMessage] = useState<string | null>(null);

  const fullFileInputRef = useRef<HTMLInputElement>(null);
  const previewFileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

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
    price: 0,
    previewFileUrl: "",
    previewFileName: "",
    previewFileSize: "",
    educationLevel: "",
    academicSession: "",
    specialization: "",
    notes: "",
    hasCredentials: false,
    authorName: "",
    authorRole: "",
    providerName: "",
    credentialsUrl: "",
    credentialsNotes: "",
    seoKeywords: "",
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
    setUploadError(null);
    setPreviewUploadError(null);
    setThumbnailUploadError(null);
    setUploadSuccessMessage(null);
    setPreviewSuccessMessage(null);
    setThumbnailSuccessMessage(null);

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
        price: material.price ?? 0,
        previewFileUrl: material.previewFileUrl ?? "",
        previewFileName: material.previewFileName ?? "",
        previewFileSize: material.previewFileSize ?? "",
        educationLevel: material.educationLevel ?? "",
        academicSession: material.academicSession ?? "",
        specialization: material.specialization ?? "",
        notes: material.notes ?? "",
        hasCredentials: Boolean(material.hasCredentials),
        authorName: material.authorName ?? "",
        authorRole: material.authorRole ?? "",
        providerName: material.providerName ?? "",
        credentialsUrl: material.credentialsUrl ?? "",
        credentialsNotes: material.credentialsNotes ?? "",
        seoKeywords: material.seoKeywords ?? "",
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
        price: 0,
        previewFileUrl: "",
        previewFileName: "",
        previewFileSize: "",
        educationLevel: "",
        academicSession: "",
        specialization: "",
        notes: "",
        hasCredentials: false,
        authorName: "",
        authorRole: "",
        providerName: "",
        credentialsUrl: "",
        credentialsNotes: "",
        seoKeywords: "",
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingFile(true);
      setUploadError(null);
      setUploadSuccessMessage(null);
      const res = await materialsApi.uploadFile(file);
      const data = res.data;
      setForm((prev) => ({
        ...prev,
        fileUrl: data.fileUrl,
        fileName: data.fileName || file.name,
        fileSize: data.fileSize || `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        fileExtension: data.fileExtension || file.name.split(".").pop() || "pdf",
      }));
      setUploadSuccessMessage("Material document uploaded successfully");
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || "Failed to upload file. Please check file format and try again.");
    } finally {
      setIsUploadingFile(false);
      if (e.target) e.target.value = "";
    }
  };

  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPreview(true);
      setPreviewUploadError(null);
      setPreviewSuccessMessage(null);
      const res = await materialsApi.uploadPreviewFile(file);
      const data = res.data;
      const uploadedUrl = data.previewFileUrl || (data as any).fileUrl || "";
      const uploadedName = data.previewFileName || (data as any).fileName || file.name;
      const uploadedSize = data.previewFileSize || (data as any).fileSize || `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      setForm((prev) => ({
        ...prev,
        previewFileUrl: uploadedUrl,
        previewFileName: uploadedName,
        previewFileSize: uploadedSize,
      }));
      setPreviewSuccessMessage("Preview resource uploaded");
    } catch (err: any) {
      setPreviewUploadError(err?.response?.data?.message || "Preview resource upload failed. Please try again.");
    } finally {
      setIsUploadingPreview(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveFullFile = () => {
    setForm((prev) => ({
      ...prev,
      fileUrl: "",
      fileName: "",
      fileSize: "",
    }));
    setUploadSuccessMessage(null);
    if (fullFileInputRef.current) fullFileInputRef.current.value = "";
  };

  const handleRemovePreviewFile = () => {
    setForm((prev) => ({
      ...prev,
      previewFileUrl: "",
      previewFileName: "",
      previewFileSize: "",
    }));
    setPreviewSuccessMessage(null);
    if (previewFileInputRef.current) previewFileInputRef.current.value = "";
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingThumbnail(true);
      setThumbnailUploadError(null);
      setThumbnailSuccessMessage(null);
      const res = await materialsApi.uploadThumbnail(file);
      const data = res.data;
      const uploadedUrl = data.thumbnailUrl || data.fileUrl || "";
      setForm((prev) => ({
        ...prev,
        thumbnail: uploadedUrl,
      }));
      setThumbnailSuccessMessage("Thumbnail image uploaded successfully");
    } catch (err: any) {
      setThumbnailUploadError(err?.response?.data?.message || "Thumbnail upload failed. Please choose an image (.jpg, .png, .webp) and try again.");
    } finally {
      setIsUploadingThumbnail(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveThumbnail = () => {
    setForm((prev) => ({
      ...prev,
      thumbnail: "",
    }));
    setThumbnailSuccessMessage(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
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
    if (form.premium && (!form.price || Number(form.price) <= 0)) {
      errs.price = "Price must be greater than 0 for premium materials";
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

                  {form.premium && (
                    <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-amber-900">
                          Resource Price (₹) <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-amber-700 font-semibold">
                          Authoritative price for student unlock & coupon discounts
                        </span>
                      </div>
                      <input
                        type="number"
                        name="price"
                        min="1"
                        value={form.price || ""}
                        onChange={handleChange}
                        placeholder="e.g. 199"
                        className={inputCls("price")}
                      />
                      {errors.price && <p className="text-red-500 text-xs">{errors.price}</p>}
                    </div>
                  )}

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
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Education Level</label>
                      <input
                        name="educationLevel"
                        value={form.educationLevel || ""}
                        onChange={handleChange}
                        placeholder="e.g. Undergraduate / PG"
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Academic Session</label>
                      <input
                        name="academicSession"
                        value={form.academicSession || ""}
                        onChange={handleChange}
                        placeholder="e.g. 2026-2027"
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Specialization</label>
                      <input
                        name="specialization"
                        value={form.specialization || ""}
                        onChange={handleChange}
                        placeholder="e.g. Computer Science"
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

                  {/* Credentials Section (Optional) */}
                  <div className="border border-[#E2E8F0] rounded-2xl p-4 bg-[#F8FAFC]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#E8F3EC] flex items-center justify-center text-[#4A7B5B]">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#1E293B] block">Credentials & Source Information</span>
                          <span className="text-[11px] text-[#64748B]">Optional: author, educator, coaching institute or verified contributor</span>
                        </div>
                      </div>

                      {/* Add Credentials Toggle Button */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#64748B]">Add Credentials</span>
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, hasCredentials: !prev.hasCredentials }))}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            form.hasCredentials ? "bg-[#4A7B5B]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              form.hasCredentials ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {form.hasCredentials ? (
                      <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-[#374151] mb-1">Author / Educator Name</label>
                            <input
                              name="authorName"
                              value={form.authorName || ""}
                              onChange={handleChange}
                              placeholder="e.g. Dr. H.C. Verma / Er. R.K. Sharma"
                              className={inputCls()}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#374151] mb-1">Author Role / Designation</label>
                            <input
                              name="authorRole"
                              value={form.authorRole || ""}
                              onChange={handleChange}
                              placeholder="e.g. Senior Faculty / HOD Physics"
                              className={inputCls()}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-[#374151] mb-1">Source / Institute / Provider</label>
                            <input
                              name="providerName"
                              value={form.providerName || ""}
                              onChange={handleChange}
                              placeholder="e.g. Kota Classroom Notes / Swayam Academic Council"
                              className={inputCls()}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#374151] mb-1">Profile / Credential Link (Optional)</label>
                            <input
                              name="credentialsUrl"
                              value={form.credentialsUrl || ""}
                              onChange={handleChange}
                              placeholder="e.g. https://faculty-profile.org or linkedin/..."
                              className={inputCls()}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#374151] mb-1">Credentials Notes & Verification Scope</label>
                          <textarea
                            rows={2}
                            name="credentialsNotes"
                            value={form.credentialsNotes || ""}
                            onChange={handleChange}
                            placeholder="e.g. Curated from verified top-ranker lecture notes and solved questions."
                            className={textareaCls}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#94A3B8] mt-2">
                        Credentials section is OFF (skipped). Switch toggle ON to link verified author, educator, or provider credentials to this study material.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* ── Tab: File & Resource ───────────────────────────────── */}
              {tab === "file" && (
                <>
                  {/* 1. Full Material File Upload */}
                  <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#4A7B5B] rounded-2xl p-5 text-center transition-colors bg-[#F8FAFC]">
                    <Upload className="w-7 h-7 text-[#4A7B5B] mx-auto mb-1.5" />
                    <p className="text-sm font-semibold text-[#1E293B] mb-0.5">
                      Full Material Document / File {form.premium && <span className="text-amber-600 text-xs font-bold">(Protected for Premium)</span>}
                    </p>
                    <p className="text-xs text-[#64748B] mb-3">
                      Complete resource saved to secure storage.
                    </p>
                    <button
                      type="button"
                      onClick={() => fullFileInputRef.current?.click()}
                      disabled={isUploadingFile}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer transition shadow-xs"
                    >
                      {isUploadingFile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading Full File...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Select Full File
                        </>
                      )}
                    </button>
                    <input
                      ref={fullFileInputRef}
                      id="study-material-full-file-input"
                      type="file"
                      onChange={handleFileUpload}
                      disabled={isUploadingFile}
                      className="hidden"
                      accept=".pdf,.docx,.doc,.pptx,.ppt,.jpg,.jpeg,.png"
                    />

                    {uploadError && (
                      <p className="text-xs text-red-500 mt-2 font-medium">{uploadError}</p>
                    )}

                    {uploadSuccessMessage && !uploadError && (
                      <p className="text-xs text-emerald-700 mt-2 font-medium flex items-center justify-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {uploadSuccessMessage}
                      </p>
                    )}

                    {form.fileUrl && (
                      <div className="mt-3 p-3 bg-[#E8F3EC] border border-[#4A7B5B]/30 rounded-xl text-xs text-[#4A7B5B] flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate max-w-[70%]">
                          <Check className="w-4 h-4 text-[#4A7B5B] shrink-0" />
                          <span className="font-semibold truncate">
                            Attached: {form.fileName || form.fileUrl}
                          </span>
                          {form.fileSize && <span className="text-[11px] opacity-75 shrink-0 font-medium">({form.fileSize})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fullFileInputRef.current?.click()}
                            className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#4A7B5B]/40 hover:bg-[#4A7B5B] hover:text-white rounded-lg transition"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveFullFile}
                            className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Premium Preview File Upload (Dedicated preview resource) */}
                  {form.premium ? (
                    <div className="border-2 border-dashed border-amber-300 hover:border-amber-400 rounded-2xl p-5 text-center transition-colors bg-amber-50/50">
                      <BookOpen className="w-7 h-7 text-amber-700 mx-auto mb-1.5" />
                      <p className="text-sm font-semibold text-amber-950 mb-0.5">
                        Premium Preview Resource
                      </p>
                      <p className="text-xs text-amber-800/90 mb-3 max-w-md mx-auto">
                        Upload a sample chapter, excerpt, preview pages, or another resource that students may access before purchasing.
                      </p>
                      <button
                        type="button"
                        onClick={() => previewFileInputRef.current?.click()}
                        disabled={isUploadingPreview}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer transition shadow-xs"
                      >
                        {isUploadingPreview ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading preview resource…
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Select Preview File
                          </>
                        )}
                      </button>
                      <input
                        ref={previewFileInputRef}
                        id="study-material-preview-file-input"
                        type="file"
                        onChange={handlePreviewUpload}
                        disabled={isUploadingPreview}
                        className="hidden"
                        accept=".pdf,.docx,.doc,.pptx,.ppt,.jpg,.jpeg,.png"
                      />

                      {previewUploadError && (
                        <p className="text-xs text-red-600 mt-2 font-medium">{previewUploadError}</p>
                      )}

                      {previewSuccessMessage && !previewUploadError && (
                        <p className="text-xs text-emerald-700 mt-2 font-medium flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" /> {previewSuccessMessage}
                        </p>
                      )}

                      {form.previewFileUrl && (
                        <div className="mt-3 p-3 bg-white border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2 truncate max-w-[70%]">
                            <Check className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="font-semibold truncate">
                              Attached: {form.previewFileName || form.previewFileUrl}
                            </span>
                            {form.previewFileSize && (
                              <span className="text-[11px] text-amber-700 shrink-0 font-medium">({form.previewFileSize})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => previewFileInputRef.current?.click()}
                              className="px-2.5 py-1 text-xs font-semibold bg-amber-50 border border-amber-300 hover:bg-amber-600 hover:text-white text-amber-900 rounded-lg transition"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={handleRemovePreviewFile}
                              className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50/70">
                      <p className="text-xs text-slate-500">
                        Dedicated preview resource is not required for Free materials (students can preview the full file directly). Enable <strong>Premium Only</strong> in Basic Info if you want to protect the full material and provide an excerpt.
                      </p>
                    </div>
                  )}

                  {/* 3. Thumbnail / Cover Image Upload (Optional) */}
                  <div className="border border-[#CBD5E1] rounded-2xl p-5 bg-[#F8FAFC]">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#E8F3EC] flex items-center justify-center text-[#4A7B5B] shrink-0">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-[#1E293B]">
                              Material Thumbnail / Cover Image
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                              Optional
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B]">
                            Upload a cover thumbnail image. If not uploaded, the student portal automatically displays the official Swayam Admission subject icon placeholder.
                          </p>
                        </div>
                      </div>

                      {form.thumbnail && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                          <Check className="w-3.5 h-3.5" /> Attached
                        </span>
                      )}
                    </div>

                    {form.thumbnail ? (
                      <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
                        {/* Image Preview Box */}
                        <div className="w-36 aspect-[16/9] rounded-lg overflow-hidden bg-slate-950 border border-slate-200 shrink-0 relative flex items-center justify-center">
                          <img
                            src={resolveThumbnailUrl(form.thumbnail)!}
                            alt="Thumbnail preview"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#1E293B] truncate">
                            {form.thumbnail}
                          </p>
                          <p className="text-[11px] text-[#64748B] mt-0.5">
                            Custom thumbnail synced and active on student study materials cards.
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => thumbnailInputRef.current?.click()}
                              disabled={isUploadingThumbnail}
                              className="px-3 py-1.5 text-xs font-semibold bg-[#E8F3EC] text-[#4A7B5B] hover:bg-[#d9ede0] rounded-lg transition"
                            >
                              Replace Image
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveThumbnail}
                              className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#4A7B5B] rounded-xl p-4 text-center transition-colors bg-white">
                        <button
                          type="button"
                          onClick={() => thumbnailInputRef.current?.click()}
                          disabled={isUploadingThumbnail}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer transition shadow-xs"
                        >
                          {isUploadingThumbnail ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading Thumbnail...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Select Thumbnail Image
                            </>
                          )}
                        </button>
                        <p className="text-[11px] text-[#94A3B8] mt-2">
                          Supports PNG, JPG, JPEG, WEBP (Recommended ratio 16:9, max 5MB)
                        </p>
                      </div>
                    )}

                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      onChange={handleThumbnailUpload}
                      disabled={isUploadingThumbnail}
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.webp"
                    />

                    {thumbnailUploadError && (
                      <p className="text-xs text-red-500 mt-2 font-medium">{thumbnailUploadError}</p>
                    )}

                    {thumbnailSuccessMessage && !thumbnailUploadError && (
                      <p className="text-xs text-emerald-700 mt-2 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {thumbnailSuccessMessage}
                      </p>
                    )}
                  </div>

                  <details className="mt-1 text-left text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200">
                    <summary className="cursor-pointer font-medium text-slate-700 hover:text-slate-900 flex items-center justify-between">
                      <span>Advanced: Direct File, Preview & Thumbnail URLs</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </summary>
                    <div className="grid grid-cols-3 gap-3 mt-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1">Full File URL</label>
                        <input
                          name="fileUrl"
                          value={form.fileUrl}
                          onChange={handleChange}
                          placeholder="e.g. /uploads/materials/..."
                          className={inputCls()}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1">Preview Resource URL</label>
                        <input
                          name="previewFileUrl"
                          value={form.previewFileUrl || ""}
                          onChange={handleChange}
                          placeholder="e.g. /uploads/materials/preview-..."
                          className={inputCls()}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#374151] mb-1">Thumbnail URL</label>
                        <input
                          name="thumbnail"
                          value={form.thumbnail || ""}
                          onChange={handleChange}
                          placeholder="e.g. /uploads/thumbnails/... or https://..."
                          className={inputCls()}
                        />
                      </div>
                    </div>
                  </details>

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
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">File Format</label>
                      <input
                        name="fileExtension"
                        value={form.fileExtension}
                        onChange={handleChange}
                        placeholder="e.g. pdf, docx, pptx"
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

              {/* ── Tab: SEO & Notes ───────────────────────────────────── */}
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
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">
                      SEO Keywords & Generative Engine Optimization (GEO) Tags
                    </label>
                    <input
                      name="seoKeywords"
                      value={form.seoKeywords || ""}
                      onChange={handleChange}
                      placeholder="e.g. neet notes, formula sheet 2026, swayam study library"
                      className={inputCls()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Admin Internal Notes</label>
                    <textarea
                      name="notes"
                      value={form.notes || ""}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Optional notes for internal admin reference..."
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
