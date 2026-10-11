import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Briefcase,
  GraduationCap,
  Link as LinkIcon,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  careersApi,
  Vacancy,
  JobApplicationPayload,
  ApplicationSubmitResponse,
  RecruitmentPublicSettings,
} from "../../api/careers.api";

interface CareersApplyModalProps {
  vacancy: Vacancy;
  settings?: RecruitmentPublicSettings | null;
  onClose: () => void;
}

export default function CareersApplyModal({
  vacancy,
  settings,
  onClose,
}: CareersApplyModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<JobApplicationPayload>({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    address: "",
    city: "",
    state: "",
    qualification: "",
    experience: "",
    previousOrganization: "",
    currentDesignation: "",
    skills: [],
    expectedSalary: "",
    noticePeriod: "",
    linkedInUrl: "",
    portfolioUrl: "",
    coverLetter: "",
    additionalInfo: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [skillsInput, setSkillsInput] = useState("");
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] =
    useState<ApplicationSubmitResponse | null>(null);

  const maxMB = settings?.maxResumeSizeMB || 10;
  const allowedFormats = settings?.allowedResumeFormats || [
    "pdf",
    "doc",
    "docx",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase() || "";

      if (!allowedFormats.includes(ext)) {
        setError(
          `Invalid file format. Allowed formats: ${allowedFormats.join(", ").toUpperCase()}`,
        );
        return;
      }

      if (file.size > maxMB * 1024 * 1024) {
        setError(`File size exceeds maximum limit of ${maxMB} MB.`);
        return;
      }

      setError(null);
      setSelectedFile(file);
    }
  };

  const handleSkillsChange = (val: string) => {
    setSkillsInput(val);
    const parsed = val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setForm((prev) => ({ ...prev, skills: parsed }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim()) {
      setError("Please enter your first name.");
      return;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!form.mobile.trim() || form.mobile.length < 8) {
      setError("Please enter a valid mobile number.");
      return;
    }
    if (!selectedFile) {
      setError("Please upload your resume (PDF, DOC, or DOCX).");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await careersApi.applyForJob(vacancy.id, form, selectedFile);
      setSubmittedData(res.data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "Failed to submit application. Please check your details and try again.";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#F8FAFC] border-b border-slate-200 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#4A7B5B] bg-[#E8F3EC] px-2.5 py-0.5 rounded-full">
                Apply for Position
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {vacancy.vacancyCode}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 line-clamp-1">
              {vacancy.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {submittedData ? (
            /* Success Screen */
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Application Submitted!
                </h3>
                <p className="text-slate-600 text-sm mt-1 max-w-md mx-auto">
                  Thank you for applying for the <strong>{vacancy.title}</strong>{" "}
                  position at Swayam Admission.
                </p>
              </div>

              {/* Reference Card */}
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5 max-w-md mx-auto text-left space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">
                    Application ID
                  </span>
                  <span className="font-mono text-base font-bold text-[#4A7B5B]">
                    {submittedData.applicationId}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Position</span>
                  <span className="font-semibold text-slate-800">
                    {submittedData.position}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">
                    Submission Date
                  </span>
                  <span className="text-slate-800">
                    {new Date(submittedData.submittedAt).toLocaleDateString(
                      "en-IN",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-semibold border border-[#CBD5E1]">
                    {submittedData.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                An acknowledgement has been recorded. Our HR recruitment team
                will review your profile and reach out regarding next steps.
              </p>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3D664A] text-white font-semibold rounded-xl shadow-md transition-colors text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Application Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Section 1: Basic Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
                  1. Applicant Details *
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                      placeholder="e.g. Rahul"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={form.lastName || ""}
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                      placeholder="e.g. Sharma"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.mobile}
                      onChange={(e) =>
                        setForm({ ...form, mobile: e.target.value })
                      }
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Resume Upload (Mandatory) */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
                  2. Resume / CV <span className="text-red-500">*</span>
                </h3>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                    selectedFile
                      ? "border-[#4A7B5B] bg-[#E8F3EC]/40"
                      : "border-slate-300 hover:border-[#4A7B5B] hover:bg-slate-50"
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3 text-sm">
                      <FileText className="w-7 h-7 text-[#4A7B5B]" />
                      <div className="text-left">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB •
                          Click to replace
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <div className="text-sm font-semibold text-slate-700">
                        Click or drag to upload Resume
                      </div>
                      <div className="text-xs text-slate-500">
                        Formats:{" "}
                        {allowedFormats.map((f) => f.toUpperCase()).join(", ")}{" "}
                        (Max {maxMB}MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Professional Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Highest Qualification
                    </label>
                    <input
                      type="text"
                      value={form.qualification || ""}
                      onChange={(e) =>
                        setForm({ ...form, qualification: e.target.value })
                      }
                      placeholder="e.g. Master's in Education / MBA / B.Tech"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Total Experience
                    </label>
                    <input
                      type="text"
                      value={form.experience || ""}
                      onChange={(e) =>
                        setForm({ ...form, experience: e.target.value })
                      }
                      placeholder="e.g. 3 Years, Fresher, etc."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Current / Previous Organization
                    </label>
                    <input
                      type="text"
                      value={form.previousOrganization || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          previousOrganization: e.target.value,
                        })
                      }
                      placeholder="e.g. EduTech Global"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Current Designation
                    </label>
                    <input
                      type="text"
                      value={form.currentDesignation || ""}
                      onChange={(e) =>
                        setForm({ ...form, currentDesignation: e.target.value })
                      }
                      placeholder="e.g. Academic Counselor"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Key Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => handleSkillsChange(e.target.value)}
                    placeholder="e.g. Student Counseling, Sales, Public Speaking, English"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A7B5B]/30 focus:border-[#4A7B5B]"
                  />
                </div>
              </div>

              {/* Collapsible Section: Additional & Optional Fields */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#4A7B5B] hover:text-[#3D664A] transition-colors py-1"
                >
                  <span>
                    {showOptionalFields
                      ? "Hide Additional Details"
                      : "+ Add Additional Details (Location, LinkedIn, Notice Period, Cover Letter)"}
                  </span>
                  {showOptionalFields ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showOptionalFields && (
                  <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={form.city || ""}
                          onChange={(e) =>
                            setForm({ ...form, city: e.target.value })
                          }
                          placeholder="e.g. New Delhi"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#4A7B5B]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          State / Union Territory
                        </label>
                        <input
                          type="text"
                          value={form.state || ""}
                          onChange={(e) =>
                            setForm({ ...form, state: e.target.value })
                          }
                          placeholder="e.g. Delhi"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#4A7B5B]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Expected Salary / CTC
                        </label>
                        <input
                          type="text"
                          value={form.expectedSalary || ""}
                          onChange={(e) =>
                            setForm({ ...form, expectedSalary: e.target.value })
                          }
                          placeholder="e.g. ₹ 4.5 LPA"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#4A7B5B]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Notice Period
                        </label>
                        <input
                          type="text"
                          value={form.noticePeriod || ""}
                          onChange={(e) =>
                            setForm({ ...form, noticePeriod: e.target.value })
                          }
                          placeholder="e.g. Immediate / 15 Days / 1 Month"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#4A7B5B]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          LinkedIn Profile URL
                        </label>
                        <input
                          type="url"
                          value={form.linkedInUrl || ""}
                          onChange={(e) =>
                            setForm({ ...form, linkedInUrl: e.target.value })
                          }
                          placeholder="https://linkedin.com/in/username"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#4A7B5B]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Portfolio / Website URL
                        </label>
                        <input
                          type="url"
                          value={form.portfolioUrl || ""}
                          onChange={(e) =>
                            setForm({ ...form, portfolioUrl: e.target.value })
                          }
                          placeholder="https://yourportfolio.com"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#4A7B5B]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Cover Letter / Note for Hiring Team
                      </label>
                      <textarea
                        rows={3}
                        value={form.coverLetter || ""}
                        onChange={(e) =>
                          setForm({ ...form, coverLetter: e.target.value })
                        }
                        placeholder="Why are you a great fit for this role?"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#4A7B5B]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer CTA Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#4A7B5B] hover:bg-[#3D664A] text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Application</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
