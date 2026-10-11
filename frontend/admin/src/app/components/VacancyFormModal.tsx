import React, { useState, useEffect } from "react";
import { X, Save, Loader2, Briefcase, FileText, Settings, Calendar, Info, MapPin, IndianRupee } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hrApi, type Vacancy, type CreateVacancyPayload } from "../../api/hr.api";

interface VacancyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  vacancy?: Vacancy | null;
}

type Tab = "basic" | "details" | "config";

const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT", "TEMPORARY", "CONSULTANT"];
const WORK_MODES = ["ONSITE", "REMOTE", "HYBRID"];
const STATUSES = ["DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "ARCHIVED"];

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "basic", label: "Basic Info", icon: Briefcase },
  { id: "details", label: "Job Details", icon: FileText },
  { id: "config", label: "Configuration", icon: Settings },
];

const labelFmt = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function VacancyFormModal({ isOpen, onClose, vacancy }: VacancyFormModalProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<CreateVacancyPayload>({
    title: "",
    department: "",
    designation: "",
    employmentType: "FULL_TIME",
    workMode: "ONSITE",
    location: "",
    numberOfPositions: 1,
    minimumQualification: "",
    preferredQualification: "",
    experience: "",
    salaryMin: undefined,
    salaryMax: undefined,
    salaryCurrency: "INR",
    jobDescription: "",
    responsibilities: "",
    educationRequirements: "",
    experienceRequirements: "",
    status: "DRAFT",
    priority: "MEDIUM",
  });

  useEffect(() => {
    if (!isOpen) return;
    setTab("basic");
    setErrors({});

    if (vacancy) {
      setForm({
        title: vacancy.title,
        department: vacancy.department,
        designation: vacancy.designation,
        employmentType: vacancy.employmentType,
        workMode: vacancy.workMode,
        location: vacancy.location || "",
        numberOfPositions: vacancy.numberOfPositions,
        minimumQualification: vacancy.minimumQualification || "",
        preferredQualification: vacancy.preferredQualification || "",
        experience: vacancy.experience || "",
        salaryMin: vacancy.salaryMin,
        salaryMax: vacancy.salaryMax,
        salaryCurrency: vacancy.salaryCurrency || "INR",
        jobDescription: vacancy.jobDescription || "",
        responsibilities: vacancy.responsibilities || "",
        educationRequirements: vacancy.educationRequirements || "",
        experienceRequirements: vacancy.experienceRequirements || "",
        status: vacancy.status,
        priority: vacancy.priority || "MEDIUM",
        applicationStartDate: vacancy.applicationStartDate ? new Date(vacancy.applicationStartDate).toISOString().split('T')[0] : "",
        applicationEndDate: vacancy.applicationEndDate ? new Date(vacancy.applicationEndDate).toISOString().split('T')[0] : "",
      });
    } else {
      setForm({
        title: "",
        department: "",
        designation: "",
        employmentType: "FULL_TIME",
        workMode: "ONSITE",
        location: "",
        numberOfPositions: 1,
        minimumQualification: "",
        preferredQualification: "",
        experience: "",
        salaryMin: undefined,
        salaryMax: undefined,
        salaryCurrency: "INR",
        jobDescription: "",
        responsibilities: "",
        educationRequirements: "",
        experienceRequirements: "",
        status: "DRAFT",
        priority: "MEDIUM",
      });
    }
  }, [isOpen, vacancy]);

  const mutation = useMutation({
    mutationFn: (data: CreateVacancyPayload) => {
      if (vacancy) {
        return hrApi.updateVacancy(vacancy.id, data);
      }
      return hrApi.createVacancy(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_vacancies"] });
      onClose();
    },
    onError: (error: any) => {
      console.error("Create vacancy failed:", error);
      
      const responseData = error.response?.data;
      const msg = responseData?.message;
      
      // If it's a class-validator array of string messages
      if (Array.isArray(msg)) {
        alert("Unable to create vacancy. Please check the highlighted fields.\n\nDetails: " + msg.join(", "));
        // optionally map to field-level errors if we parse them, but for now just show them safely
      } else if (typeof msg === "string") {
        alert(`Unable to create vacancy: ${msg}`);
      } else if (typeof msg === "object" && msg !== null) {
        setErrors(msg as Record<string, string>);
        alert("Unable to create vacancy. Please check the highlighted fields.");
      } else {
        alert("Unable to create vacancy. Please review the form and try again.");
      }
    },
  });

  if (!isOpen) return null;

  const normalizePayload = (payload: CreateVacancyPayload): CreateVacancyPayload => {
    const data = { ...payload };
    
    // Normalize empty strings to undefined for optional fields
    Object.keys(data).forEach((key) => {
      const k = key as keyof CreateVacancyPayload;
      if (typeof data[k] === 'string' && data[k] === "") {
        (data[k] as any) = undefined;
      }
    });

    // Ensure dates are sent as ISO strings if they exist
    const dateFields = ['applicationStartDate', 'applicationEndDate', 'applicationDeadline'];
    dateFields.forEach((field) => {
      const k = field as keyof CreateVacancyPayload;
      const val = data[k] as string | undefined;
      if (val && typeof val === 'string' && !val.includes('T')) {
        try {
          (data[k] as any) = new Date(val).toISOString();
        } catch (e) {
          (data[k] as any) = undefined;
        }
      }
    });

    return data;
  };

  const validate = () => {
    const newErrs: Record<string, string> = {};
    if (!form.title.trim()) newErrs.title = "Required";
    if (!form.department.trim()) newErrs.department = "Required";
    if (!form.designation.trim()) newErrs.designation = "Required";
    if (!form.employmentType) newErrs.employmentType = "Required";
    if (!form.workMode) newErrs.workMode = "Required";
    if (form.numberOfPositions < 1) newErrs.numberOfPositions = "Must be at least 1";
    if (!form.jobDescription?.trim()) newErrs.jobDescription = "Required";
    if (!form.responsibilities?.trim()) newErrs.responsibilities = "Required";
    
    if (form.salaryMin && form.salaryMax && form.salaryMin > form.salaryMax) {
      newErrs.salaryMax = "Max must be >= Min";
    }

    setErrors(newErrs);
    return Object.keys(newErrs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const cleanData = normalizePayload(form);
    mutation.mutate(cleanData);
  };

  const handleSaveDraft = () => {
    setForm((prev) => ({ ...prev, status: "DRAFT" }));
    setTimeout(() => {
      if (!validate()) return;
      const cleanData = normalizePayload({ ...form, status: "DRAFT" });
      mutation.mutate(cleanData);
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6" style={{ margin: 0 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
          <div>
            <h2 className="text-xl font-bold text-[#1E293B]">
              {vacancy ? "Edit Job Vacancy" : "Post Job Vacancy"}
            </h2>
            <p className="text-sm text-[#64748B]">
              {vacancy ? `Editing ${vacancy.vacancyCode || 'vacancy'}` : "Create a new recruitment vacancy"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#E2E8F0] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-[#E2E8F0] overflow-x-auto shrink-0 bg-white">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "border-[#4A7B5B] text-[#4A7B5B]"
                  : "border-transparent text-[#64748B] hover:text-[#1E293B] hover:border-[#CBD5E1]"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {Object.keys(errors).some(k => {
                if (t.id === "basic") return ["title", "department", "designation", "employmentType", "workMode", "numberOfPositions"].includes(k);
                if (t.id === "details") return ["jobDescription", "responsibilities", "salaryMax"].includes(k);
                return false;
              }) && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          
          {tab === "basic" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="col-span-full">
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Job Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Senior Software Engineer"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] ${errors.title ? "border-red-500" : "border-[#E2E8F0]"}`}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Department *</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g. Engineering"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] ${errors.department ? "border-red-500" : "border-[#E2E8F0]"}`}
                />
                {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Designation *</label>
                <input
                  type="text"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  placeholder="e.g. Team Lead"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] ${errors.designation ? "border-red-500" : "border-[#E2E8F0]"}`}
                />
                {errors.designation && <p className="text-red-500 text-xs mt-1">{errors.designation}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Employment Type *</label>
                <select
                  value={form.employmentType}
                  onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] bg-white"
                >
                  {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{labelFmt(t)}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Work Mode *</label>
                <select
                  value={form.workMode}
                  onChange={(e) => setForm({ ...form, workMode: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] bg-white"
                >
                  {WORK_MODES.map(t => <option key={t} value={t}>{labelFmt(t)}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={form.location || ""}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Mumbai, Maharashtra"
                    className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Number of Openings *</label>
                <input
                  type="number"
                  min="1"
                  value={form.numberOfPositions}
                  onChange={(e) => setForm({ ...form, numberOfPositions: parseInt(e.target.value) || 1 })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] ${errors.numberOfPositions ? "border-red-500" : "border-[#E2E8F0]"}`}
                />
              </div>

            </div>
          )}

          {tab === "details" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-[#1E293B] mb-1">Job Description *</label>
                  <textarea
                    rows={4}
                    value={form.jobDescription || ""}
                    onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                    placeholder="Describe the overall role and expectations..."
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] resize-y ${errors.jobDescription ? "border-red-500" : "border-[#E2E8F0]"}`}
                  />
                  {errors.jobDescription && <p className="text-red-500 text-xs mt-1">{errors.jobDescription}</p>}
                </div>

                <div className="col-span-full">
                  <label className="block text-sm font-medium text-[#1E293B] mb-1">Key Responsibilities *</label>
                  <textarea
                    rows={4}
                    value={form.responsibilities || ""}
                    onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
                    placeholder="List the day-to-day responsibilities..."
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] resize-y ${errors.responsibilities ? "border-red-500" : "border-[#E2E8F0]"}`}
                  />
                  {errors.responsibilities && <p className="text-red-500 text-xs mt-1">{errors.responsibilities}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1">Minimum Qualification</label>
                  <input
                    type="text"
                    value={form.minimumQualification || ""}
                    onChange={(e) => setForm({ ...form, minimumQualification: e.target.value })}
                    placeholder="e.g. Bachelor's Degree in CS"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1">Preferred Qualification</label>
                  <input
                    type="text"
                    value={form.preferredQualification || ""}
                    onChange={(e) => setForm({ ...form, preferredQualification: e.target.value })}
                    placeholder="e.g. Master's Degree"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1">Experience Required</label>
                  <input
                    type="text"
                    value={form.experience || ""}
                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    placeholder="e.g. 3-5 Years"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#1E293B] mb-1">Salary Min</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                      <input
                        type="number"
                        value={form.salaryMin || ""}
                        onChange={(e) => setForm({ ...form, salaryMin: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#1E293B] mb-1">Salary Max</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                      <input
                        type="number"
                        value={form.salaryMax || ""}
                        onChange={(e) => setForm({ ...form, salaryMax: e.target.value ? Number(e.target.value) : undefined })}
                        className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] ${errors.salaryMax ? "border-red-500" : "border-[#E2E8F0]"}`}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {tab === "config" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Application Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type="date"
                    value={form.applicationStartDate || ""}
                    onChange={(e) => setForm({ ...form, applicationStartDate: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Application End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type="date"
                    value={form.applicationEndDate || ""}
                    onChange={(e) => setForm({ ...form, applicationEndDate: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Initial Status *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] bg-white"
                >
                  {STATUSES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Priority</label>
                <select
                  value={form.priority || "MEDIUM"}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/20 focus:border-[#4A7B5B] bg-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="col-span-full mt-4 p-4 rounded-lg bg-blue-50 border border-blue-100 flex gap-3 text-sm text-blue-800">
                <Info className="w-5 h-5 shrink-0 text-blue-500" />
                <p>
                  <strong>Note on Statuses:</strong> Vacancies must be set to <strong>PUBLISHED</strong> and fall within the application dates to be visible to candidates. Drafts are only visible to HR admins.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#1E293B] hover:bg-[#E2E8F0] rounded-lg transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSaveDraft}
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium text-[#4A7B5B] border border-[#4A7B5B] bg-white hover:bg-[#E8F3EC] rounded-lg transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>

          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-[#4A7B5B] hover:bg-[#3d664c] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {vacancy ? "Update Vacancy" : "Post Vacancy"}
          </button>
        </div>
      </div>
    </div>
  );
}
