import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Globe,
  FileText,
  Compass,
  GraduationCap,
  Briefcase,
  BookOpen,
} from "lucide-react";
import { BlogDto } from "../../api/blogs.api";

interface BlogFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BlogDto) => void;
  initialData?: any;
  isLoading?: boolean;
}

const CATEGORIES = [
  "Career Guides",
  "Admission Guides",
  "Engineering",
  "MBA",
  "Medical",
  "Law",
  "Scholarships",
  "Admission Tips",
  "Exam Updates",
  "College News",
  "General",
];

const EDUCATION_LEVELS = [
  "10th",
  "12th",
  "Diploma",
  "Undergraduate",
  "Postgraduate",
  "PhD",
  "Other",
];

const STREAMS = [
  "Engineering",
  "Medical",
  "Commerce",
  "Arts/Humanities",
  "Science",
  "Law",
  "Management",
  "Other",
];

export default function BlogFormModal({ isOpen, onClose, onSubmit, initialData, isLoading }: BlogFormModalProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "guide" | "content" | "seo" | "entities">("basic");

  const [form, setForm] = useState<BlogDto>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    category: "Career Guides",
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

    // ERP Guide Fields
    guideType: "CAREER",
    educationLevel: "Undergraduate",
    stream: "Engineering",
    specialization: "",
    careerPath: "",
    skills: [],
    eligibility: "",
    entranceExams: [],
    salaryRange: "",
    averageSalary: "",
    growthRate: "",
    higherStudyOptions: [],
    jobRoles: [],
    govPrivatePaths: "",
    admissionProcess: "",
    applicationProcess: "",
    requiredDocuments: [],
    feesInfo: "",
    counsellingInfo: "",
    scholarshipInfo: "",
    stateSchemesInfo: "",
    importantTimelines: "",
    prepGuidance: "",
  });

  const [tagInput, setTagInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [examInput, setExamInput] = useState("");
  const [jobRoleInput, setJobRoleInput] = useState("");
  const [higherStudyInput, setHigherStudyInput] = useState("");
  const [docInput, setDocInput] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        guideType: initialData.guideType || "CAREER",
        educationLevel: initialData.educationLevel || "Undergraduate",
        stream: initialData.stream || "Engineering",
        skills: Array.isArray(initialData.skills) ? initialData.skills : [],
        entranceExams: Array.isArray(initialData.entranceExams) ? initialData.entranceExams : [],
        jobRoles: Array.isArray(initialData.jobRoles) ? initialData.jobRoles : [],
        higherStudyOptions: Array.isArray(initialData.higherStudyOptions) ? initialData.higherStudyOptions : [],
        requiredDocuments: Array.isArray(initialData.requiredDocuments) ? initialData.requiredDocuments : [],
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
        category: "Career Guides",
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

        guideType: "CAREER",
        educationLevel: "Undergraduate",
        stream: "Engineering",
        specialization: "",
        careerPath: "",
        skills: [],
        eligibility: "",
        entranceExams: [],
        salaryRange: "",
        averageSalary: "",
        growthRate: "",
        higherStudyOptions: [],
        jobRoles: [],
        govPrivatePaths: "",
        admissionProcess: "",
        applicationProcess: "",
        requiredDocuments: [],
        feesInfo: "",
        counsellingInfo: "",
        scholarshipInfo: "",
        stateSchemesInfo: "",
        importantTimelines: "",
        prepGuidance: "",
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const hasFaqs = form.faqs && form.faqs.some((f) => f.question && f.answer);
  const hasTakeaways = form.keyTakeaways && form.keyTakeaways.some((t) => t.trim().length > 0);

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

  // Helper tag adder
  const addArrayItem = (field: "skills" | "entranceExams" | "jobRoles" | "higherStudyOptions" | "requiredDocuments", val: string, setVal: (v: string) => void) => {
    if (val.trim() && !(form[field] || []).includes(val.trim())) {
      setForm({ ...form, [field]: [...(form[field] || []), val.trim()] });
      setVal("");
    }
  };

  const removeArrayItem = (field: "skills" | "entranceExams" | "jobRoles" | "higherStudyOptions" | "requiredDocuments", val: string) => {
    setForm({ ...form, [field]: (form[field] || []).filter((x) => x !== val) });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl">
              <Compass size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {initialData ? "Edit Guide / Article" : "Create Career & Admission Guide"}
              </h2>
              <p className="text-xs text-gray-500">ERP Guidance System & Knowledge Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50/50 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "basic" ? "border-[#4A7B5B] text-[#4A7B5B]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText size={15} /> Basic Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "guide" ? "border-[#4A7B5B] text-[#4A7B5B]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <GraduationCap size={15} /> ERP Guide Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "content" ? "border-[#4A7B5B] text-[#4A7B5B]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Sparkles size={15} /> Content & FAQs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("seo")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "seo" ? "border-[#4A7B5B] text-[#4A7B5B]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Globe size={15} /> SEO & Tags
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("entities")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "entities" ? "border-[#4A7B5B] text-[#4A7B5B]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Layers size={15} /> Location & Relations
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: BASIC DETAILS */}
          {activeTab === "basic" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Guide Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Complete Career Guide to B.Tech in Artificial Intelligence & Data Science 2026"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Guide Type *</label>
                  <select
                    value={form.guideType || "CAREER"}
                    onChange={(e) => setForm({ ...form, guideType: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
                  >
                    <option value="CAREER">Career Guide</option>
                    <option value="ADMISSION">Admission Guide</option>
                    <option value="GENERAL">General Article</option>
                  </select>
                </div>
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
                  <label className="block font-bold text-gray-700 mb-1">Publication Status *</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                  >
                    <option value="DRAFT">Draft (Admin Only)</option>
                    <option value="PUBLISHED">Published (Visible to Students)</option>
                    <option value="UNPUBLISHED">Unpublished</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Cover / Featured Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={form.featuredImage || ""}
                  onChange={(e) => setForm({ ...form, featuredImage: e.target.value, thumbnail: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Short Description / Excerpt *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="A concise 1-2 sentence overview of what students will discover in this guide..."
                  value={form.excerpt || ""}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="featured-check"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="w-4 h-4 text-[#4A7B5B] rounded-md focus:ring-[#4A7B5B]"
                />
                <label htmlFor="featured-check" className="font-bold text-gray-800 text-xs">
                  Mark as Featured Guide
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: ERP GUIDE DETAILS */}
          {activeTab === "guide" && (
            <div className="space-y-5 text-xs">
              <div className="p-4 bg-[#E8F3EC] border border-[#d8e8dc] rounded-2xl">
                <div className="font-bold text-[#2d4f37] mb-1 flex items-center gap-1.5">
                  <GraduationCap size={16} /> Student Personalization & Profile Sync Criteria
                </div>
                <div className="text-[#3d694d] text-[11px]">
                  These academic parameters match against the student's profile (Education level, Stream, Specialization, State) to automatically populate "Recommended for You".
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target Education Level *</label>
                  <select
                    value={form.educationLevel || "Undergraduate"}
                    onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    {EDUCATION_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Stream *</label>
                  <select
                    value={form.stream || "Engineering"}
                    onChange={(e) => setForm({ ...form, stream: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    {STREAMS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    placeholder="e.g., Computer Science, Mechanical, Finance..."
                    value={form.specialization || ""}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Career Specific Fields */}
              {form.guideType !== "ADMISSION" && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase size={15} className="text-[#4A7B5B]" /> Career Pathways & Industry Insights
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Career Path Overview</label>
                    <textarea
                      rows={2}
                      placeholder="Outline career progression paths (e.g., Junior Developer -> Lead Architect -> CTO)..."
                      value={form.careerPath || ""}
                      onChange={(e) => setForm({ ...form, careerPath: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Indicative Salary Range</label>
                      <input
                        type="text"
                        placeholder="e.g., ₹6 LPA - ₹18 LPA"
                        value={form.salaryRange || ""}
                        onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Average Starting Salary</label>
                      <input
                        type="text"
                        placeholder="e.g., ₹8.5 LPA"
                        value={form.averageSalary || ""}
                        onChange={(e) => setForm({ ...form, averageSalary: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Industry Growth Rate</label>
                      <input
                        type="text"
                        placeholder="e.g., 22% Annual YoY"
                        value={form.growthRate || ""}
                        onChange={(e) => setForm({ ...form, growthRate: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Skills Tag Input */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Key Skills Required</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add skill (e.g., Python, Machine Learning)..."
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("skills", skillInput, setSkillInput))}
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => addArrayItem("skills", skillInput, setSkillInput)}
                        className="px-3 py-1.5 bg-[#4A7B5B] text-white rounded-xl text-xs font-semibold"
                      >
                        Add Skill
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {form.skills?.map((sk) => (
                        <span key={sk} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium flex items-center gap-1">
                          {sk}
                          <button type="button" onClick={() => removeArrayItem("skills", sk)}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Job Roles Tag Input */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Target Job Roles</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add role (e.g., AI Research Engineer, Data Scientist)..."
                        value={jobRoleInput}
                        onChange={(e) => setJobRoleInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("jobRoles", jobRoleInput, setJobRoleInput))}
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => addArrayItem("jobRoles", jobRoleInput, setJobRoleInput)}
                        className="px-3 py-1.5 bg-[#4A7B5B] text-white rounded-xl text-xs font-semibold"
                      >
                        Add Role
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {form.jobRoles?.map((jr) => (
                        <span key={jr} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1">
                          {jr}
                          <button type="button" onClick={() => removeArrayItem("jobRoles", jr)}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Higher Study Options */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Higher Study Pathways</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add option (e.g., M.Tech, MS in CS, MBA Tech)..."
                        value={higherStudyInput}
                        onChange={(e) => setHigherStudyInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("higherStudyOptions", higherStudyInput, setHigherStudyInput))}
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => addArrayItem("higherStudyOptions", higherStudyInput, setHigherStudyInput)}
                        className="px-3 py-1.5 bg-[#4A7B5B] text-white rounded-xl text-xs font-semibold"
                      >
                        Add Option
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {form.higherStudyOptions?.map((hs) => (
                        <span key={hs} className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium flex items-center gap-1">
                          {hs}
                          <button type="button" onClick={() => removeArrayItem("higherStudyOptions", hs)}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Government vs. Private Pathways</label>
                    <textarea
                      rows={2}
                      placeholder="Opportunities in PSU, UPSC Engineering Services, DRDO vs. Private Tech giants..."
                      value={form.govPrivatePaths || ""}
                      onChange={(e) => setForm({ ...form, govPrivatePaths: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Admission Specific Fields */}
              {form.guideType !== "CAREER" && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-4">
                  <div className="font-bold text-emerald-900 flex items-center gap-2">
                    <BookOpen size={15} className="text-[#4A7B5B]" /> Admission & Application Guidance
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Eligibility Criteria</label>
                    <textarea
                      rows={2}
                      placeholder="Minimum marks (e.g., 60% in 10+2 PCM), entrance exam requirement..."
                      value={form.eligibility || ""}
                      onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    />
                  </div>

                  {/* Entrance Exams Input */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Recognized Entrance Exams</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add exam (e.g., JEE Main, CUET, GATE)..."
                        value={examInput}
                        onChange={(e) => setExamInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("entranceExams", examInput, setExamInput))}
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => addArrayItem("entranceExams", examInput, setExamInput)}
                        className="px-3 py-1.5 bg-[#4A7B5B] text-white rounded-xl text-xs font-semibold"
                      >
                        Add Exam
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {form.entranceExams?.map((ex) => (
                        <span key={ex} className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-medium flex items-center gap-1">
                          {ex}
                          <button type="button" onClick={() => removeArrayItem("entranceExams", ex)}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Required Documents Tag Input */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Required Verification Documents</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add document (e.g., 10th Marksheet, Aadhaar Card, Domicile)..."
                        value={docInput}
                        onChange={(e) => setDocInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("requiredDocuments", docInput, setDocInput))}
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => addArrayItem("requiredDocuments", docInput, setDocInput)}
                        className="px-3 py-1.5 bg-[#4A7B5B] text-white rounded-xl text-xs font-semibold"
                      >
                        Add Doc
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {form.requiredDocuments?.map((doc) => (
                        <span key={doc} className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-1">
                          {doc}
                          <button type="button" onClick={() => removeArrayItem("requiredDocuments", doc)}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Admission Process Steps</label>
                      <textarea
                        rows={2}
                        placeholder="Step 1: Registration, Step 2: Merit List, Step 3: Seat Allocation..."
                        value={form.admissionProcess || ""}
                        onChange={(e) => setForm({ ...form, admissionProcess: e.target.value })}
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Application Process & Form Filling</label>
                      <textarea
                        rows={2}
                        placeholder="Online application procedure, counseling registration portal link..."
                        value={form.applicationProcess || ""}
                        onChange={(e) => setForm({ ...form, applicationProcess: e.target.value })}
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Indicative Tuition & Fees</label>
                      <input
                        type="text"
                        placeholder="e.g., ₹1.2 Lakhs - ₹2.5 Lakhs per year"
                        value={form.feesInfo || ""}
                        onChange={(e) => setForm({ ...form, feesInfo: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Counselling Information</label>
                      <input
                        type="text"
                        placeholder="e.g., Centralized state counselling round 1 & 2"
                        value={form.counsellingInfo || ""}
                        onChange={(e) => setForm({ ...form, counsellingInfo: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Important Timelines / Deadlines</label>
                      <input
                        type="text"
                        placeholder="e.g., Application closes July 31, 2026"
                        value={form.importantTimelines || ""}
                        onChange={(e) => setForm({ ...form, importantTimelines: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Scholarship & Fee Waiver Info</label>
                      <textarea
                        rows={2}
                        placeholder="Merit scholarships, NSP guidelines, Swayam waiver scheme..."
                        value={form.scholarshipInfo || ""}
                        onChange={(e) => setForm({ ...form, scholarshipInfo: e.target.value })}
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">State Education-Finance Schemes</label>
                      <textarea
                        rows={2}
                        placeholder="State student credit cards, post-matric schemes..."
                        value={form.stateSchemesInfo || ""}
                        onChange={(e) => setForm({ ...form, stateSchemesInfo: e.target.value })}
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Preparation & Guidance Tips</label>
                    <textarea
                      rows={2}
                      placeholder="Tips on preparing statement of purpose, entrance cutoff strategy..."
                      value={form.prepGuidance || ""}
                      onChange={(e) => setForm({ ...form, prepGuidance: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTENT & FAQS */}
          {activeTab === "content" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Main Guide Content (Markdown supported) *</label>
                <textarea
                  rows={10}
                  required
                  placeholder="# Comprehensive Overview\n\nProvide structured, authentic details for students..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                />
              </div>

              {/* FAQs Manager */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-gray-800">Frequently Asked Questions (FAQs)</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, faqs: [...(form.faqs || []), { question: "", answer: "" }] })}
                    className="text-[#4A7B5B] hover:text-[#3d694d] text-xs font-bold flex items-center gap-1"
                  >
                    <Plus size={14} /> Add FAQ
                  </button>
                </div>

                <div className="space-y-3">
                  {form.faqs?.map((faq, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-600 text-[11px]">FAQ #{idx + 1}</span>
                        {form.faqs && form.faqs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, faqs: form.faqs?.filter((_, i) => i !== idx) })}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g., What are the best career opportunities after this degree?"
                        value={faq.question}
                        onChange={(e) => {
                          const updated = [...(form.faqs || [])];
                          updated[idx].question = e.target.value;
                          setForm({ ...form, faqs: updated });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                      <textarea
                        rows={2}
                        placeholder="Answer to this FAQ..."
                        value={faq.answer}
                        onChange={(e) => {
                          const updated = [...(form.faqs || [])];
                          updated[idx].answer = e.target.value;
                          setForm({ ...form, faqs: updated });
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SEO & TAGS */}
          {activeTab === "seo" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">SEO Meta Title</label>
                <input
                  type="text"
                  placeholder="e.g., B.Tech Admission Guide 2026 | Swayam Admission"
                  value={form.seoTitle || ""}
                  onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">SEO Meta Description</label>
                <textarea
                  rows={2}
                  placeholder="Meta description for search engine listings..."
                  value={form.seoDescription || ""}
                  onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              {/* Tags Input */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tags & Keywords</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add tag (e.g., Engineering, JEE, Career)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                  <button type="button" onClick={addTag} className="px-4 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs font-semibold">
                    Add Tag
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.tags?.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-[#E8F3EC] text-[#4A7B5B] rounded-lg text-xs font-medium flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LOCATION & RELATIONS */}
          {activeTab === "entities" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                  <Layers size={16} /> Location Targeting & Knowledge Graph
                </div>
                <div className="text-blue-700 text-[11px]">
                  Tag state or district to deliver localized state guidance and state financial scheme eligibility.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target State</label>
                  <input
                    type="text"
                    placeholder="e.g., Uttar Pradesh, Maharashtra, Delhi NCR..."
                    value={form.state || ""}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target City / District</label>
                  <input
                    type="text"
                    placeholder="e.g., Lucknow, Greater Noida, Pune..."
                    value={form.city || ""}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between shrink-0">
            <div className="text-xs text-gray-400">
              Publication Status: <strong className="text-gray-700">{form.status}</strong>
            </div>
            <div className="flex gap-3">
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
                {isLoading ? "Saving..." : initialData ? "Save Changes" : "Save Guide"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
