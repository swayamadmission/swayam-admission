import React, { useState, useEffect } from "react";
import {
  X, Save, Loader2, Calendar, BookOpen, GraduationCap, IndianRupee,
  Globe, Shield, ChevronDown, Plus, Check, FileText
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scholarshipsApi, type Scholarship, type CreateScholarshipPayload } from "../../api/scholarships.api";

interface ScholarshipFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  scholarship?: Scholarship | null;
}

type Tab = "basic" | "eligibility" | "amount" | "dates" | "documents" | "seo";

const CATEGORIES = ["Central", "State", "Private", "Corporate", "NGO", "University"];
const TYPES = ["Merit Based", "Need Based", "Minority", "Sports", "Special Ability", "General"];
const GENDERS = ["ALL", "MALE", "FEMALE", "OTHER"];
const STATUSES = ["PUBLISHED", "DRAFT", "ARCHIVED"];

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "basic", label: "Basic Info", icon: BookOpen },
  { id: "eligibility", label: "Eligibility", icon: GraduationCap },
  { id: "amount", label: "Grant & Fees", icon: IndianRupee },
  { id: "dates", label: "Important Dates", icon: Calendar },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "seo", label: "SEO", icon: Globe },
];

const labelFmt = (s?: string) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function ScholarshipFormModal({ isOpen, onClose, scholarship }: ScholarshipFormModalProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docInput, setDocInput] = useState("");

  const [form, setForm] = useState<CreateScholarshipPayload>({
    scholarshipName: "",
    provider: "",
    description: "",
    scholarshipType: "Merit Based",
    category: "Central",
    gender: "ALL",
    state: "",
    country: "India",
    incomeLimit: undefined,
    requiredMarks: undefined,
    eligibility: "",
    amount: undefined,
    currency: "INR",
    percentage: undefined,
    applicationMode: "ONLINE",
    applicationStart: "",
    applicationEnd: "",
    renewalRequired: false,
    requiredDocuments: [],
    officialWebsite: "",
    faqs: null,
    featured: false,
    status: "PUBLISHED",
  });

  useEffect(() => {
    if (!isOpen) return;
    setTab("basic");
    setErrors({});
    setDocInput("");

    if (scholarship) {
      setForm({
        scholarshipName: scholarship.scholarshipName ?? "",
        provider: scholarship.provider ?? "",
        description: scholarship.description ?? "",
        scholarshipType: scholarship.scholarshipType || "Merit Based",
        category: scholarship.category || "Central",
        gender: scholarship.gender || "ALL",
        state: scholarship.state ?? "",
        country: scholarship.country ?? "India",
        incomeLimit: scholarship.incomeLimit ?? undefined,
        requiredMarks: scholarship.requiredMarks ?? undefined,
        eligibility: scholarship.eligibility ?? "",
        amount: scholarship.amount ?? undefined,
        currency: scholarship.currency ?? "INR",
        percentage: scholarship.percentage ?? undefined,
        applicationMode: scholarship.applicationMode ?? "ONLINE",
        applicationStart: scholarship.applicationStart ? String(scholarship.applicationStart).split("T")[0] : "",
        applicationEnd: scholarship.applicationEnd ? String(scholarship.applicationEnd).split("T")[0] : "",
        renewalRequired: Boolean(scholarship.renewalRequired),
        requiredDocuments: Array.isArray(scholarship.requiredDocuments) ? scholarship.requiredDocuments : [],
        officialWebsite: scholarship.officialWebsite ?? "",
        faqs: scholarship.faqs ?? null,
        featured: Boolean(scholarship.featured),
        status: scholarship.status ?? "PUBLISHED",
      });
    } else {
      setForm({
        scholarshipName: "",
        provider: "",
        description: "",
        scholarshipType: "Merit Based",
        category: "Central",
        gender: "ALL",
        state: "",
        country: "India",
        incomeLimit: undefined,
        requiredMarks: undefined,
        eligibility: "",
        amount: undefined,
        currency: "INR",
        percentage: undefined,
        applicationMode: "ONLINE",
        applicationStart: "",
        applicationEnd: "",
        renewalRequired: false,
        requiredDocuments: [],
        officialWebsite: "",
        faqs: null,
        featured: false,
        status: "PUBLISHED",
      });
    }
  }, [scholarship, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: CreateScholarshipPayload) => {
      if (scholarship?.id) return scholarshipsApi.update(scholarship.id, data);
      return scholarshipsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_scholarships"] });
      queryClient.invalidateQueries({ queryKey: ["admin_scholarships_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_metrics"] });
      if (scholarship?.id) {
        queryClient.invalidateQueries({ queryKey: ["admin_scholarship_detail", scholarship.id] });
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

  const addDocItem = () => {
    const item = docInput.trim();
    if (!item) return;
    setForm((prev) => ({
      ...prev,
      requiredDocuments: [...(prev.requiredDocuments ?? []), item],
    }));
    setDocInput("");
  };

  const removeDocItem = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      requiredDocuments: (prev.requiredDocuments ?? []).filter((_, i) => i !== idx),
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.scholarshipName || !form.scholarshipName.trim()) {
      errs.scholarshipName = "Scholarship name is required";
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
                {scholarship ? "Edit Scholarship" : "Add Scholarship"}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {scholarship ? "Update scholarship details & criteria" : "Configure a new financial aid or merit scholarship"}
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
                      Scholarship Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="scholarshipName"
                      value={form.scholarshipName}
                      onChange={handleChange}
                      placeholder="e.g. Post-Matric Merit Scholarship for Students"
                      className={inputCls("scholarshipName")}
                    />
                    {errors.scholarshipName && (
                      <p className="text-red-500 text-xs mt-1">{errors.scholarshipName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Provider / Ministry / Organization</label>
                      <input
                        name="provider"
                        value={form.provider}
                        onChange={handleChange}
                        placeholder="e.g. Ministry of Human Resource Development"
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">State (if state specific)</label>
                      <input
                        name="state"
                        value={form.state}
                        onChange={handleChange}
                        placeholder="e.g. Maharashtra, All India"
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
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Type</label>
                      <div className="relative">
                        <select name="scholarshipType" value={form.scholarshipType} onChange={handleChange} className={selectCls}>
                          {TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Gender Eligibility</label>
                      <div className="relative">
                        <select name="gender" value={form.gender} onChange={handleChange} className={selectCls}>
                          {GENDERS.map((g) => (
                            <option key={g} value={g}>{g}</option>
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
                          checked={Boolean(form.featured)}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#4A7B5B] peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                        <span className="ml-2 text-xs font-medium text-[#374151]">Featured Scholarship</span>
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
                      placeholder="Brief overview of the scholarship..."
                      className={textareaCls}
                    />
                  </div>
                </>
              )}

              {/* ── Tab: Eligibility ────────────────────────────────────── */}
              {tab === "eligibility" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Eligibility Criteria Summary</label>
                    <textarea
                      name="eligibility"
                      value={form.eligibility}
                      onChange={handleChange}
                      rows={3}
                      placeholder="e.g. Students currently enrolled in 1st year UG degree..."
                      className={textareaCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Family Income Limit (₹ / year)</label>
                      <input
                        name="incomeLimit"
                        type="number"
                        value={form.incomeLimit ?? ""}
                        onChange={handleChange}
                        placeholder="e.g. 250000"
                        min={0}
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Min. Required Marks (%)</label>
                      <input
                        name="requiredMarks"
                        type="number"
                        value={form.requiredMarks ?? ""}
                        onChange={handleChange}
                        placeholder="e.g. 60"
                        min={0}
                        max={100}
                        className={inputCls()}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="renewalRequired"
                        checked={Boolean(form.renewalRequired)}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#4A7B5B] peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                      <span className="ml-2 text-xs font-medium text-[#374151]">Annual Renewal Required</span>
                    </label>
                  </div>
                </>
              )}

              {/* ── Tab: Amount ────────────────────────────────────────── */}
              {tab === "amount" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">
                        <IndianRupee className="inline w-3 h-3 mr-0.5" />Scholarship Amount (₹ / year)
                      </label>
                      <input
                        name="amount"
                        type="number"
                        value={form.amount ?? ""}
                        onChange={handleChange}
                        placeholder="e.g. 50000"
                        min={0}
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Tuition Fee Coverage (%)</label>
                      <input
                        name="percentage"
                        type="number"
                        value={form.percentage ?? ""}
                        onChange={handleChange}
                        placeholder="e.g. 100"
                        min={0}
                        max={100}
                        className={inputCls()}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Application Mode</label>
                      <input
                        name="applicationMode"
                        value={form.applicationMode}
                        onChange={handleChange}
                        placeholder="e.g. ONLINE (NSP Portal)"
                        className={inputCls()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#374151] mb-1.5">Official Website URL</label>
                      <input
                        name="officialWebsite"
                        value={form.officialWebsite}
                        onChange={handleChange}
                        placeholder="e.g. https://scholarships.gov.in"
                        className={inputCls()}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── Tab: Dates ─────────────────────────────────────────── */}
              {tab === "dates" && (
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
                </>
              )}

              {/* ── Tab: Documents ─────────────────────────────────────── */}
              {tab === "documents" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Required Documents</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={docInput}
                        onChange={(e) => setDocInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); addDocItem(); }
                        }}
                        placeholder="Add document (e.g. Income Certificate) and press Enter..."
                        className={inputCls() + " flex-1"}
                      />
                      <button
                        type="button"
                        onClick={addDocItem}
                        className="h-9 px-3 rounded-xl text-white text-sm font-medium flex items-center gap-1"
                        style={{ background: "#4A7B5B" }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {(form.requiredDocuments ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(form.requiredDocuments ?? []).map((item, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E8F3EC] text-[#4A7B5B]"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => removeDocItem(i)}
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

              {/* ── Tab: SEO ───────────────────────────────────────────── */}
              {tab === "seo" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1.5">Notes & Additional Guidelines</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Additional notes for students and counselors..."
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
                  {scholarship ? "Save Changes" : "Create Scholarship"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
