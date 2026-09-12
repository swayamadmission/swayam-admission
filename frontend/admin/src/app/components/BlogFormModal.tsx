import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Sparkles, CheckCircle, HelpCircle, Code, Tag, Layers, Globe, FileText, Share2, Lightbulb } from "lucide-react";
import { BlogDto } from "../../api/blogs.api";

interface BlogFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BlogDto) => void;
  initialData?: any;
  isLoading?: boolean;
}

const CATEGORIES = [
  "Engineering",
  "MBA",
  "Medical",
  "Law",
  "Scholarships",
  "Admission Tips",
  "Career Guides",
  "Exam Updates",
  "College News",
  "General",
];

export default function BlogFormModal({ isOpen, onClose, onSubmit, initialData, isLoading }: BlogFormModalProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "content" | "seo" | "entities">("basic");

  const [form, setForm] = useState<BlogDto>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    category: "General",
    tags: [],
    status: "DRAFT",
    featured: false,
    seoTitle: "",
    seoDescription: "",
    seoKeywords: [],
    canonicalUrl: "",
    metaRobots: "index, follow",
    aiSummary: "",
    tldr: "",
    keyTakeaways: [""],
    faqs: [{ question: "", answer: "" }],
    collegeId: "",
    courseId: "",
    examId: "",
    scholarshipId: "",
    state: "",
    city: "",
  });

  const [tagInput, setTagInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        keyTakeaways: Array.isArray(initialData.keyTakeaways) && initialData.keyTakeaways.length > 0 ? initialData.keyTakeaways : [""],
        faqs: Array.isArray(initialData.faqs) && initialData.faqs.length > 0 ? initialData.faqs : [{ question: "", answer: "" }],
        tags: Array.isArray(initialData.tags) ? initialData.tags : [],
        seoKeywords: Array.isArray(initialData.seoKeywords) ? initialData.seoKeywords : [],
      });
    } else {
      setForm({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        featuredImage: "",
        category: "General",
        tags: [],
        status: "DRAFT",
        featured: false,
        seoTitle: "",
        seoDescription: "",
        seoKeywords: [],
        canonicalUrl: "",
        metaRobots: "index, follow",
        aiSummary: "",
        tldr: "",
        keyTakeaways: [""],
        faqs: [{ question: "", answer: "" }],
        collegeId: "",
        courseId: "",
        examId: "",
        scholarshipId: "",
        state: "",
        city: "",
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Real-time GEO score estimation
  const wordCount = (form.content || "").split(/\s+/).filter(Boolean).length;
  const hasFaqs = form.faqs && form.faqs.some((f) => f.question && f.answer);
  const hasTakeaways = form.keyTakeaways && form.keyTakeaways.some((t) => t.trim().length > 0);
  const hasSeo = form.seoTitle || form.seoDescription;

  let estimatedGeoScore = 60;
  if (hasFaqs) estimatedGeoScore += 15;
  if (hasTakeaways) estimatedGeoScore += 15;
  if (form.aiSummary || form.tldr) estimatedGeoScore += 10;
  estimatedGeoScore = Math.min(100, estimatedGeoScore);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTakeaways = (form.keyTakeaways || []).filter((t) => t.trim() !== "");
    const cleanFaqs = (form.faqs || []).filter((f) => f.question.trim() !== "" && f.answer.trim() !== "");

    onSubmit({
      ...form,
      keyTakeaways: cleanTakeaways,
      faqs: cleanFaqs,
      geoScore: estimatedGeoScore,
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags?.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...(form.tags || []), tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags?.filter((t) => t !== tag) });
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !form.seoKeywords?.includes(keywordInput.trim())) {
      setForm({ ...form, seoKeywords: [...(form.seoKeywords || []), keywordInput.trim()] });
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    setForm({ ...form, seoKeywords: form.seoKeywords?.filter((k) => k !== kw) });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{initialData ? "Edit Article" : "Create New Blog & GEO Article"}</h2>
              <p className="text-xs text-gray-500">Enterprise AI SEO & Generative Engine Optimization Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50/50 shrink-0">
          <button
            onClick={() => setActiveTab("basic")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "basic" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText size={15} /> Basic Details
          </button>
          <button
            onClick={() => setActiveTab("content")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "content" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Sparkles size={15} /> Content & AI Assistant
          </button>
          <button
            onClick={() => setActiveTab("seo")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "seo" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Globe size={15} /> SEO & OpenGraph
          </button>
          <button
            onClick={() => setActiveTab("entities")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "entities" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Layers size={15} /> Knowledge Graph Entities
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: BASIC DETAILS */}
          {activeTab === "basic" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Article Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Top B.Tech Colleges in Delhi NCR 2026: Fees, Cutoff & Admission Process"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Custom Slug (Optional)</label>
                  <input
                    type="text"
                    placeholder="top-btech-colleges-delhi-ncr-2026"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Featured Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={form.featuredImage || ""}
                  onChange={(e) => setForm({ ...form, featuredImage: e.target.value, thumbnail: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Short Excerpt</label>
                <textarea
                  rows={2}
                  placeholder="A concise 1-2 sentence overview of what students will learn..."
                  value={form.excerpt || ""}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Tags Input */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tags & Keywords</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add tag (e.g., BTech, Admissions, JEE Main)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                  <button type="button" onClick={addTag} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                    Add Tag
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.tags?.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Status & Featured */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Publication Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="featured-check"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
                  />
                  <label htmlFor="featured-check" className="font-bold text-gray-800 text-xs">
                    Mark as Featured Article
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTENT & AI ASSISTANT */}
          {activeTab === "content" && (
            <div className="space-y-5 text-xs">
              {/* Score Indicator Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-emerald-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 font-bold text-gray-900">
                    <Sparkles className="text-purple-600" size={16} /> Real-Time GEO Readiness Rating
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">Calculated automatically for AI Search Engines (ChatGPT, Gemini, Perplexity)</div>
                </div>
                <div className="px-4 py-1.5 bg-white shadow-sm border border-purple-200 rounded-xl font-extrabold text-sm text-purple-700">
                  {estimatedGeoScore} / 100
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Article Content (HTML supported) *</label>
                <textarea
                  rows={8}
                  required
                  placeholder="<h2>Overview</h2><p>Write your detailed article here...</p>"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="text-[11px] text-gray-400 mt-1 flex justify-between">
                  <span>Supports HTML headings (&lt;h2&gt;, &lt;h3&gt;), paragraphs, tables, and lists.</span>
                  <span>Word count: {wordCount}</span>
                </div>
              </div>

              {/* TL;DR & AI Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">AI TL;DR Summary</label>
                  <textarea
                    rows={2}
                    placeholder="Short 2-line summary designed for LLM quick answer boxes..."
                    value={form.tldr || ""}
                    onChange={(e) => setForm({ ...form, tldr: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Comprehensive AI Summary</label>
                  <textarea
                    rows={2}
                    placeholder="100-200 word summary for semantic graph indexing..."
                    value={form.aiSummary || ""}
                    onChange={(e) => setForm({ ...form, aiSummary: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Key Takeaways Builder */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-bold text-gray-700">Key Takeaways (Bullet Points for AI Answers)</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, keyTakeaways: [...(form.keyTakeaways || []), ""] })}
                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 text-xs"
                  >
                    <Plus size={14} /> Add Bullet
                  </button>
                </div>
                <div className="space-y-2">
                  {form.keyTakeaways?.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Takeaway #${idx + 1}`}
                        value={item}
                        onChange={(e) => {
                          const updated = [...(form.keyTakeaways || [])];
                          updated[idx] = e.target.value;
                          setForm({ ...form, keyTakeaways: updated });
                        }}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                      />
                      {form.keyTakeaways!.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, keyTakeaways: form.keyTakeaways?.filter((_, i) => i !== idx) })}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ Builder */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-bold text-gray-700">Structured FAQs (Powers FAQ Schema & AI Answers)</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, faqs: [...(form.faqs || []), { question: "", answer: "" }] })}
                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 text-xs"
                  >
                    <Plus size={14} /> Add FAQ
                  </button>
                </div>
                <div className="space-y-3">
                  {form.faqs?.map((faq, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, faqs: form.faqs?.filter((_, i) => i !== idx) })}
                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                      <input
                        type="text"
                        placeholder={`Question #${idx + 1} (e.g., What is the last date to apply?)`}
                        value={faq.question}
                        onChange={(e) => {
                          const updated = [...(form.faqs || [])];
                          updated[idx].question = e.target.value;
                          setForm({ ...form, faqs: updated });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                      />
                      <textarea
                        rows={2}
                        placeholder="Detailed answer..."
                        value={faq.answer}
                        onChange={(e) => {
                          const updated = [...(form.faqs || [])];
                          updated[idx].answer = e.target.value;
                          setForm({ ...form, faqs: updated });
                        }}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SEO & OPENGRAPH */}
          {activeTab === "seo" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">SEO Title Tag</label>
                <input
                  type="text"
                  placeholder="Defaults to article title if blank..."
                  value={form.seoTitle || ""}
                  onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Meta Description</label>
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
                  placeholder="https://swayamadmission.org/blog/your-slug"
                  value={form.canonicalUrl || ""}
                  onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              {/* Keywords Input */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target SEO Keywords</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g., JEE Main 2026, Engineering Admission..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                  <button type="button" onClick={addKeyword} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.seoKeywords?.map((kw) => (
                    <span key={kw} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium flex items-center gap-1">
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

          {/* TAB 4: KNOWLEDGE GRAPH ENTITIES */}
          {activeTab === "entities" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl">
                <div className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                  <Layers size={16} /> Knowledge Graph Entity Association
                </div>
                <div className="text-blue-700 text-[11px]">
                  Link this article to specific Colleges, Courses, Exams, and Scholarships to automatically populate recommendation cards and AI Counselor knowledge.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Associated State</label>
                  <input
                    type="text"
                    placeholder="e.g., Uttar Pradesh, Delhi NCR"
                    value={form.state || ""}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Associated City</label>
                  <input
                    type="text"
                    placeholder="e.g., Greater Noida, Lucknow"
                    value={form.city || ""}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
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
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : initialData ? "Save Changes" : "Publish / Save Article"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
