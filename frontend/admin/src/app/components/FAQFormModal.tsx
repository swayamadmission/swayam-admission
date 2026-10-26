import React, { useState, useEffect } from "react";
import { X, Sparkles, HelpCircle, Layers, Globe, FileText, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { FaqDto } from "../../api/faqs.api";
import { collegesApi } from "../../api/colleges.api";
import { coursesApi } from "../../api/courses.api";
import { examsApi } from "../../api/exams.api";
import { scholarshipsApi } from "../../api/scholarships.api";
import { blogsApi } from "../../api/blogs.api";
import { materialsApi } from "../../api/materials.api";

interface FAQFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FaqDto) => void;
  initialData?: any;
  isLoading?: boolean;
}

const CATEGORIES = [
  "Admission",
  "College",
  "Course",
  "Exam",
  "Scholarship",
  "Hostel",
  "Placement",
  "Fee",
  "General",
];

export default function FAQFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}: FAQFormModalProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "relations" | "seo" | "ai">("basic");

  // Query connected entities for searchable selectors
  const { data: collegesRes } = useQuery({
    queryKey: ["admin_faq_entity_colleges"],
    queryFn: () => collegesApi.findAll({ limit: 100 }),
    enabled: isOpen,
  });

  const { data: coursesRes } = useQuery({
    queryKey: ["admin_faq_entity_courses"],
    queryFn: () => coursesApi.findAll({ limit: 100 }),
    enabled: isOpen,
  });

  const { data: examsRes } = useQuery({
    queryKey: ["admin_faq_entity_exams"],
    queryFn: () => examsApi.findAll({ limit: 100 }),
    enabled: isOpen,
  });

  const { data: scholarshipsRes } = useQuery({
    queryKey: ["admin_faq_entity_scholarships"],
    queryFn: () => scholarshipsApi.findAll({ limit: 100 }),
    enabled: isOpen,
  });

  const { data: blogsRes } = useQuery({
    queryKey: ["admin_faq_entity_blogs"],
    queryFn: () => blogsApi.findAll({ limit: 100 }),
    enabled: isOpen,
  });

  const { data: materialsRes } = useQuery({
    queryKey: ["admin_faq_entity_materials"],
    queryFn: () => materialsApi.findAll({ limit: 100 }),
    enabled: isOpen,
  });

  const colleges = Array.isArray(collegesRes?.data?.data) ? collegesRes.data.data : [];
  const courses = Array.isArray(coursesRes?.data?.data) ? coursesRes.data.data : [];
  const exams = Array.isArray(examsRes?.data?.data) ? examsRes.data.data : [];
  const scholarships = Array.isArray(scholarshipsRes?.data?.data) ? scholarshipsRes.data.data : [];
  const blogs = Array.isArray(blogsRes?.data?.data) ? blogsRes.data.data : [];
  const materials = Array.isArray(materialsRes?.data?.data) ? materialsRes.data.data : [];

  const [form, setForm] = useState<FaqDto>({
    question: "",
    answer: "",
    slug: "",
    category: "General",
    tags: [],
    language: "en",
    featured: false,
    priority: 0,
    displayOrder: 0,
    status: "PUBLISHED",
    collegeId: "",
    courseId: "",
    examId: "",
    scholarshipId: "",
    studyMaterialId: "",
    blogId: "",
    aiSummary: "",
    keywords: [],
    searchTerms: [],
    semanticKeywords: [],
    geoScore: 80,
    aiReadinessScore: 80,
    seoTitle: "",
    seoDescription: "",
    canonicalUrl: "",
    metaRobots: "index, follow",
  });

  const [tagInput, setTagInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        tags: Array.isArray(initialData.tags) ? initialData.tags : [],
        keywords: Array.isArray(initialData.keywords) ? initialData.keywords : [],
        searchTerms: Array.isArray(initialData.searchTerms) ? initialData.searchTerms : [],
        semanticKeywords: Array.isArray(initialData.semanticKeywords) ? initialData.semanticKeywords : [],
      });
    } else {
      setForm({
        question: "",
        answer: "",
        slug: "",
        category: "General",
        tags: [],
        language: "en",
        featured: false,
        priority: 0,
        displayOrder: 0,
        status: "PUBLISHED",
        collegeId: "",
        courseId: "",
        examId: "",
        scholarshipId: "",
        studyMaterialId: "",
        blogId: "",
        aiSummary: "",
        keywords: [],
        searchTerms: [],
        semanticKeywords: [],
        geoScore: 80,
        aiReadinessScore: 80,
        seoTitle: "",
        seoDescription: "",
        canonicalUrl: "",
        metaRobots: "index, follow",
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question.trim()) {
      setActiveTab("basic");
      return;
    }
    if (!form.answer.trim()) {
      setActiveTab("basic");
      return;
    }

    const cleanedPayload: FaqDto = {
      ...form,
      question: form.question.trim(),
      answer: form.answer.trim(),
      slug: form.slug?.trim() ? form.slug.trim() : undefined,
      collegeId: form.collegeId?.trim() ? form.collegeId.trim() : undefined,
      courseId: form.courseId?.trim() ? form.courseId.trim() : undefined,
      examId: form.examId?.trim() ? form.examId.trim() : undefined,
      scholarshipId: form.scholarshipId?.trim() ? form.scholarshipId.trim() : undefined,
      blogId: form.blogId?.trim() ? form.blogId.trim() : undefined,
      studyMaterialId: form.studyMaterialId?.trim() ? form.studyMaterialId.trim() : undefined,
      aiSummary: form.aiSummary?.trim() ? form.aiSummary.trim() : undefined,
      seoTitle: form.seoTitle?.trim() ? form.seoTitle.trim() : undefined,
      seoDescription: form.seoDescription?.trim() ? form.seoDescription.trim() : undefined,
      canonicalUrl: form.canonicalUrl?.trim() ? form.canonicalUrl.trim() : undefined,
      metaRobots: form.metaRobots?.trim() ? form.metaRobots.trim() : undefined,
    };

    onSubmit(cleanedPayload);
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags?.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...(form.tags || []), tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (t: string) => {
    setForm({ ...form, tags: form.tags?.filter((tag) => tag !== t) });
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !form.keywords?.includes(keywordInput.trim())) {
      setForm({ ...form, keywords: [...(form.keywords || []), keywordInput.trim()] });
      setKeywordInput("");
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const removeKeyword = (kw: string) => {
    setForm({ ...form, keywords: form.keywords?.filter((k) => k !== kw) });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {initialData ? "Edit FAQ Item" : "Create Enterprise Knowledge Base FAQ"}
              </h2>
              <p className="text-xs text-gray-500">
                AI Knowledge Base & GEO Structured FAQ Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50/50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "basic"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText size={15} /> Basic Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("relations")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "relations"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Layers size={15} /> Entity Relations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("seo")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "seo"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Globe size={15} /> SEO Metadata
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "ai"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Sparkles size={15} /> AI & GEO Engine
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: BASIC */}
          {activeTab === "basic" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Question *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., What are the eligibility criteria for B.Tech admission at DTU?"
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Detailed Answer *</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Provide a complete, structured answer..."
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Custom Slug (Optional)</label>
                  <input
                    type="text"
                    placeholder="eligibility-btech-dtu-admission"
                    value={form.slug || ""}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Tags Input */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add tag (e.g., Eligibility, DTU, JEE Main)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.tags?.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                      {t}
                      <button type="button" onClick={() => removeTag(t)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Priority (0 - 100)</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Publication Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="faq-featured"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
                  />
                  <label htmlFor="faq-featured" className="font-bold text-gray-800 text-xs">
                    Mark Featured
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENTITY RELATIONS */}
          {activeTab === "relations" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl">
                <div className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                  <Layers size={16} /> Knowledge Graph Entity Linking
                </div>
                <div className="text-blue-700 text-[11px]">
                  Associate this FAQ with real database records across Colleges, Courses, Exams, Scholarships, Blogs, or Study Materials.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* College Selector */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-700">Linked College</label>
                    {form.collegeId && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, collegeId: "" })}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <select
                    value={form.collegeId || ""}
                    onChange={(e) => setForm({ ...form, collegeId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  >
                    <option value="">-- None / No College Linked --</option>
                    {colleges.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.city ? `(${c.city})` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter custom College ID..."
                    value={form.collegeId || ""}
                    onChange={(e) => setForm({ ...form, collegeId: e.target.value })}
                    className="w-full px-3 py-1 bg-white border border-gray-200/80 rounded-lg text-[10px] text-gray-500 font-mono"
                  />
                </div>

                {/* Course Selector */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-700">Linked Course</label>
                    {form.courseId && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, courseId: "" })}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <select
                    value={form.courseId || ""}
                    onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  >
                    <option value="">-- None / No Course Linked --</option>
                    {courses.map((crs: any) => (
                      <option key={crs.id} value={crs.id}>
                        {crs.name} {crs.college?.name ? `(${crs.college.name})` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter custom Course ID..."
                    value={form.courseId || ""}
                    onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                    className="w-full px-3 py-1 bg-white border border-gray-200/80 rounded-lg text-[10px] text-gray-500 font-mono"
                  />
                </div>

                {/* Exam Selector */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-700">Linked Exam</label>
                    {form.examId && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, examId: "" })}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <select
                    value={form.examId || ""}
                    onChange={(e) => setForm({ ...form, examId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  >
                    <option value="">-- None / No Exam Linked --</option>
                    {exams.map((ex: any) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.examName} {ex.category ? `(${ex.category})` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter custom Exam ID..."
                    value={form.examId || ""}
                    onChange={(e) => setForm({ ...form, examId: e.target.value })}
                    className="w-full px-3 py-1 bg-white border border-gray-200/80 rounded-lg text-[10px] text-gray-500 font-mono"
                  />
                </div>

                {/* Scholarship Selector */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-700">Linked Scholarship</label>
                    {form.scholarshipId && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, scholarshipId: "" })}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <select
                    value={form.scholarshipId || ""}
                    onChange={(e) => setForm({ ...form, scholarshipId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  >
                    <option value="">-- None / No Scholarship Linked --</option>
                    {scholarships.map((sch: any) => (
                      <option key={sch.id} value={sch.id}>
                        {sch.scholarshipName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter custom Scholarship ID..."
                    value={form.scholarshipId || ""}
                    onChange={(e) => setForm({ ...form, scholarshipId: e.target.value })}
                    className="w-full px-3 py-1 bg-white border border-gray-200/80 rounded-lg text-[10px] text-gray-500 font-mono"
                  />
                </div>

                {/* Blog Selector */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-700">Linked Blog</label>
                    {form.blogId && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, blogId: "" })}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <select
                    value={form.blogId || ""}
                    onChange={(e) => setForm({ ...form, blogId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  >
                    <option value="">-- None / No Blog Linked --</option>
                    {blogs.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter custom Blog ID..."
                    value={form.blogId || ""}
                    onChange={(e) => setForm({ ...form, blogId: e.target.value })}
                    className="w-full px-3 py-1 bg-white border border-gray-200/80 rounded-lg text-[10px] text-gray-500 font-mono"
                  />
                </div>

                {/* Study Material Selector */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-700">Linked Study Material</label>
                    {form.studyMaterialId && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, studyMaterialId: "" })}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <select
                    value={form.studyMaterialId || ""}
                    onChange={(e) => setForm({ ...form, studyMaterialId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  >
                    <option value="">-- None / No Material Linked --</option>
                    {materials.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter custom Study Material ID..."
                    value={form.studyMaterialId || ""}
                    onChange={(e) => setForm({ ...form, studyMaterialId: e.target.value })}
                    className="w-full px-3 py-1 bg-white border border-gray-200/80 rounded-lg text-[10px] text-gray-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SEO */}
          {activeTab === "seo" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">SEO Title</label>
                <input
                  type="text"
                  placeholder="Defaults to Question if left blank..."
                  value={form.seoTitle || ""}
                  onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">SEO Description</label>
                <textarea
                  rows={3}
                  placeholder="150-160 character meta description..."
                  value={form.seoDescription || ""}
                  onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Canonical URL</label>
                <input
                  type="url"
                  placeholder="https://swayam-admission.vercel.app/faq/your-slug"
                  value={form.canonicalUrl || ""}
                  onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 4: AI & GEO ENGINE */}
          {activeTab === "ai" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">AI Answer Summary</label>
                <textarea
                  rows={3}
                  placeholder="Short 2-3 sentence direct answer summary for LLMs (ChatGPT, Gemini, Perplexity)..."
                  value={form.aiSummary || ""}
                  onChange={(e) => setForm({ ...form, aiSummary: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Keywords</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add keyword..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    className="px-4 py-2 bg-[#4A7B5B] hover:bg-[#3d694d] text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.keywords?.map((kw) => (
                    <span
                      key={kw}
                      className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                      {kw}
                      <button type="button" onClick={() => removeKeyword(kw)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                onSubmit({ ...form, status: "DRAFT" });
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3d694d] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : initialData ? "Save & Apply" : "Create FAQ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
