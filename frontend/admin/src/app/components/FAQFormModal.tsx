import React, { useState, useEffect } from "react";
import { X, Sparkles, HelpCircle, Layers, Globe, FileText, Plus, Trash2 } from "lucide-react";
import { FaqDto } from "../../api/faqs.api";

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
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

  const removeKeyword = (kw: string) => {
    setForm({ ...form, keywords: form.keywords?.filter((k) => k !== kw) });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
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
                  Associate this FAQ with specific entity IDs across Colleges, Courses, Exams, Scholarships, Study Materials, or Blogs.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">College ID</label>
                  <input
                    type="text"
                    placeholder="e.g. clg_xyz123"
                    value={form.collegeId || ""}
                    onChange={(e) => setForm({ ...form, collegeId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Course ID</label>
                  <input
                    type="text"
                    placeholder="e.g. crs_abc456"
                    value={form.courseId || ""}
                    onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Exam ID</label>
                  <input
                    type="text"
                    placeholder="e.g. exm_789"
                    value={form.examId || ""}
                    onChange={(e) => setForm({ ...form, examId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Scholarship ID</label>
                  <input
                    type="text"
                    placeholder="e.g. sch_111"
                    value={form.scholarshipId || ""}
                    onChange={(e) => setForm({ ...form, scholarshipId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Blog ID</label>
                  <input
                    type="text"
                    placeholder="e.g. blg_222"
                    value={form.blogId || ""}
                    onChange={(e) => setForm({ ...form, blogId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Study Material ID</label>
                  <input
                    type="text"
                    placeholder="e.g. mat_333"
                    value={form.studyMaterialId || ""}
                    onChange={(e) => setForm({ ...form, studyMaterialId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
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
                  placeholder="https://swayamadmission.org/faq/your-slug"
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
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3d694d] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : initialData ? "Save Changes" : "Save FAQ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
