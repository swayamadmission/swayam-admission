import { useState } from "react";
import { Link } from "react-router";
import { Shield, FileText, Calendar, Cookie, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { LegalUserApi, PublicLegalPolicy, CookieDeclaration } from "../../api/legal.api";

function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function PublicLegalPage() {
  const [grievanceCategory, setGrievanceCategory] = useState("ADMISSION_DISPUTE");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const { data: policies = [], isLoading: isLoadingPolicies } = useQuery({
    queryKey: ["public_published_policies"],
    queryFn: () => LegalUserApi.getPublishedPolicies(),
  });

  const { data: cookies = [], isLoading: isLoadingCookies } = useQuery({
    queryKey: ["public_cookies"],
    queryFn: () => LegalUserApi.getCookies(),
  });

  const grievanceMutation = useMutation({
    mutationFn: (payload: any) => LegalUserApi.submitGrievance(payload),
    onSuccess: (data) => {
      setSubmittedId(data?.complaintId || "Submitted");
      toast.success("Grievance registered successfully.");
      setSubject("");
      setDescription("");
      setFullName("");
      setEmail("");
      setMobile("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to submit grievance.");
    },
  });

  const handleGrievanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Please provide both subject and detailed description.");
      return;
    }
    grievanceMutation.mutate({
      category: grievanceCategory,
      subject,
      description,
      fullName: fullName.trim() || undefined,
      email: email.trim() || undefined,
      mobile: mobile.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F3EC] px-3.5 py-1.5 text-xs font-bold text-[#4A7B5B] uppercase tracking-wider mb-3">
            <Shield className="h-4 w-4" /> Swayam Admission Legal Center
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E293B] tracking-tight">
            Terms, Policies & Governance
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#64748B]">
            All official policies, admission disclaimers, data processing agreements, and consumer redressal rules governing Swayam Admission.
          </p>
        </div>

        {/* Policies Grid */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-[#1E293B] mb-6 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#4A7B5B]" /> Published Policy Documents
          </h2>

          {isLoadingPolicies ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-40 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse p-6" />
              ))}
            </div>
          ) : policies.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-[#CBD5E1] mb-2" />
              <p className="text-sm text-[#64748B]">No policies currently published.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {policies.map((p) => (
                <Link
                  key={p.id}
                  to={`/policies/${p.slug}`}
                  className="group flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm hover:border-[#4A7B5B] hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="rounded-md bg-[#E8F3EC] px-2.5 py-0.5 font-mono text-xs font-bold text-[#4A7B5B]">
                        {p.version}
                      </span>
                      <span className="text-[11px] text-[#94A3B8]">
                        Effective: {formatDateDDMMYYYY(p.effectiveDate)}
                      </span>
                    </div>

                    <h3 className="font-bold text-[#1E293B] text-base group-hover:text-[#4A7B5B] transition">
                      {p.title}
                    </h3>

                    {p.changeSummary ? (
                      <p className="mt-2 text-xs text-[#64748B] line-clamp-2">{p.changeSummary}</p>
                    ) : (
                      <p className="mt-2 text-xs text-[#94A3B8]">Official published document for Swayam Admission.</p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs font-semibold text-[#4A7B5B]">
                    <span>Read Full Policy</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Cookie Policy Section */}
        <div className="mb-16 rounded-2xl border border-[#E2E8F0] bg-white p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Cookie className="h-5 w-5 text-[#4A7B5B]" />
            <h2 className="text-xl font-bold text-[#1E293B]">Cookie & Storage Declarations</h2>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mb-6">
            Swayam Admission uses strictly necessary cookies and authenticated local storage to manage application state and sessions securely.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-[#1E293B]">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Cookie Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Provider</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {cookies.filter((c) => c.isActive).map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono font-bold text-[#1E293B]">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-[#E8F3EC] px-2 py-0.5 text-xs font-semibold text-[#4A7B5B]">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">{c.purpose}</td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">{c.duration}</td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">{c.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grievance Redressal Mechanism Section */}
        <div id="grievance" className="rounded-2xl border border-[#E2E8F0] bg-white p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-5 w-5 text-[#4A7B5B]" />
            <h2 className="text-xl font-bold text-[#1E293B]">Grievance Redressal Form</h2>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mb-6">
            In accordance with our Grievance Redressal Policy, students or stakeholders with unresolved issues regarding admissions, payments, documents, or data handling may register an official complaint directly with the Legal Officer.
          </p>

          {submittedId && (
            <div className="mb-6 rounded-xl bg-[#E8F3EC] border border-[#A7D0B3] p-4 text-[#1E293B]">
              <div className="flex items-center gap-2 font-bold text-[#4A7B5B]">
                <CheckCircle2 className="h-5 w-5" /> Grievance Registered Successfully!
              </div>
              <p className="mt-1 text-xs text-[#334155]">
                Your statutory Complaint ID is <strong>{submittedId}</strong>. A legal redressal representative will review and respond within the statutory timeframe.
              </p>
            </div>
          )}

          <form onSubmit={handleGrievanceSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Your Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@example.com"
                  className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">Grievance Category *</label>
                <select
                  value={grievanceCategory}
                  onChange={(e) => setGrievanceCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
                >
                  <option value="ADMISSION_DISPUTE">Admission / College Dispute</option>
                  <option value="REFUND_REQUEST">Refund & Cancellation Dispute</option>
                  <option value="DOCUMENT_DATA_PRIVACY">Document Processing / Data Privacy</option>
                  <option value="TECHNICAL">Technical / Payment Issue</option>
                  <option value="OTHER">Other Statutory Grievance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Subject / Summary *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">Detailed Description *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the incident, dates, application IDs, and relief sought..."
                className="w-full rounded-xl border border-[#E2E8F0] p-3 text-sm text-[#1E293B] outline-none focus:border-[#4A7B5B]"
              />
            </div>

            <button
              type="submit"
              disabled={grievanceMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4A7B5B] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#3d654a] transition"
            >
              <Send className="h-4 w-4" />
              {grievanceMutation.isPending ? "Submitting..." : "Submit Formal Grievance"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
