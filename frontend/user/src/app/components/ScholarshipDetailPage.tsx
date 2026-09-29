import React, { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ChevronRight, Award, Calendar, Users, CheckCircle, FileText, Clock,
  ExternalLink, ChevronDown, ChevronUp, Bot, ArrowRight, IndianRupee
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { scholarshipsApi } from "../../api/scholarships.api";

const getCategoryColor = (category: string) => {
  switch (category?.toLowerCase()) {
    case "government": return { color: "#4A7B5B", bg: "#E8F3EC" };
    case "merit-based": return { color: "#3B82F6", bg: "#DBEAFE" };
    case "state-specific": return { color: "#F59E0B", bg: "#FEF3C7" };
    case "private/ngo": return { color: "#EC4899", bg: "#FCE7F3" };
    default: return { color: "#3B82F6", bg: "#DBEAFE" };
  }
};

interface ScholarshipDetail {
  overview: string;
  highlights: string[];
  eligibilityCriteria: string[];
  benefits: { label: string; value: string }[];
  documents: string[];
  steps: { step: number; title: string; desc: string }[];
  dates: { event: string; date: string }[];
  faqs: { q: string; a: string }[];
  applyUrl: string;
}

const SCHOLARSHIP_DETAILS: Record<string, ScholarshipDetail> = {
  "nsp-post-matric": {
    overview: "The National Scholarship Portal (NSP) Post-Matric Scholarship is India's flagship scholarship program administered by the Ministry of Education. It covers students from SC, ST, OBC, and minority communities studying in Class 11 and above. The scholarship is disbursed directly to the student's bank account via DBT.",
    highlights: ["Direct Bank Transfer (DBT)", "Covers 50+ categories of students", "Renewable every year", "No repayment required"],
    eligibilityCriteria: [
      "Student must be enrolled in Class 11, 12, or any undergraduate/postgraduate program",
      "Annual family income must be less than ₹2.5 Lakh for SC/ST, ₹1 Lakh for minorities",
      "Must have scored at least 50% in the last qualifying exam",
      "Student must be an Indian citizen",
      "Only one scholarship per student (no duplication)",
      "Must have valid Aadhaar-linked bank account",
    ],
    benefits: [
      { label: "Maintenance Allowance", value: "₹230 – ₹570/month (hostellers get more)" },
      { label: "Tuition Fee Reimbursement", value: "Up to ₹2,000/year" },
      { label: "Study Tours / Field Work", value: "Actual cost or ₹500, whichever is less" },
      { label: "Thesis Typing / Printing", value: "₹1,600 for PG students" },
    ],
    documents: [
      "Aadhaar Card (mandatory)",
      "Income Certificate issued by District Authority",
      "Caste Certificate (SC/ST/OBC)",
      "Previous year marksheet / academic record",
      "Bank passbook (linked to Aadhaar)",
      "Bonafide certificate from current institution",
      "Passport-size photograph",
      "Fee receipt from college",
    ],
    steps: [
      { step: 1, title: "Register on NSP Portal", desc: "Create a new account on scholarships.gov.in using your mobile number and Aadhaar." },
      { step: 2, title: "Fill Application Form", desc: "Choose your scholarship category (SC/ST/OBC/Minority) and fill the online form with personal and academic details." },
      { step: 3, title: "Upload Documents", desc: "Upload all required documents in the specified format and size (JPG/PDF, max 200KB each)." },
      { step: 4, title: "Submit & Get Reference Number", desc: "After submitting, note your application reference number for future tracking." },
      { step: 5, title: "Institute Verification", desc: "Your institute will verify and forward your application online. Follow up with your college if pending." },
      { step: 6, title: "State Approval & Disbursement", desc: "Once state-approved, the amount is credited directly to your Aadhaar-linked bank account." },
    ],
    dates: [
      { event: "Application Opens", date: "August 1, 2025" },
      { event: "Last Date to Apply (Fresh)", date: "October 31, 2025" },
      { event: "Last Date to Apply (Renewal)", date: "November 15, 2025" },
      { event: "Institute Verification Deadline", date: "November 30, 2025" },
      { event: "State/UT Verification Deadline", date: "December 15, 2025" },
      { event: "Disbursement (Expected)", date: "January–February 2026" },
    ],
    faqs: [
      { q: "Can I apply for NSP if I'm already receiving a state scholarship?", a: "No, NSP has a 'One Student One Scholarship' policy. You cannot receive two scholarships simultaneously from the same portal." },
      { q: "Is renewal automatic or do I need to re-apply?", a: "Renewal is NOT automatic. You must apply fresh each year before the renewal deadline with updated academic records." },
      { q: "My Aadhaar is not linked to my bank account. What should I do?", a: "Visit your nearest bank branch or Aadhaar Seva Kendra to link your Aadhaar to your bank account before applying." },
      { q: "What if my institute is not listed on NSP?", a: "Contact your institute's scholarship cell or principal. The institute must be registered on NSP. If not, ask them to register." },
      { q: "How long does it take to receive the money after approval?", a: "Typically 2–4 weeks after state-level approval. The amount is transferred directly to your bank via DBT." },
    ],
    applyUrl: "https://scholarships.gov.in",
  },
  "bihar-student-credit-card": {
    overview: "The Bihar Student Credit Card (BSCC) scheme is a 0% interest education loan of up to ₹4 lakh provided by the Government of Bihar. It is aimed at students who have cleared their Class 12 examination and want to pursue higher education but lack funds. The loan is repaid only after the student secures employment.",
    highlights: ["0% interest rate", "Up to ₹4 lakh loan", "Repay only after getting a job", "Covers 42 courses"],
    eligibilityCriteria: [
      "Student must be a domicile of Bihar",
      "Must have passed Class 12 from a recognized board",
      "Age must be 25 years or below at the time of application",
      "Must have secured admission in a recognized college/university",
      "Enrollment must be in one of the 42 approved courses",
      "No previous default on government loans",
    ],
    benefits: [
      { label: "Loan Amount", value: "Up to ₹4,00,000" },
      { label: "Interest Rate", value: "0% (Zero interest)" },
      { label: "Repayment Start", value: "After getting employment or 1 year after course completion" },
      { label: "Coverage", value: "Tuition, hostel, food, books, laptop, transport" },
    ],
    documents: [
      "Bihar domicile certificate",
      "Class 10 and 12 marksheets",
      "Admission letter from institute",
      "Aadhaar Card of student and guarantor",
      "Bank account details (student + guarantor)",
      "2 passport photos",
      "Guarantor identity and address proof",
    ],
    steps: [
      { step: 1, title: "Register on 7NISCHAY Portal", desc: "Visit www.7nishchay-yuvaupmission.bihar.gov.in and register with your Aadhaar." },
      { step: 2, title: "Fill BSCC Application", desc: "Select Bihar Student Credit Card and fill out the form with course and institute details." },
      { step: 3, title: "Book a DRCC Appointment", desc: "Choose a date to visit your District Registration and Counselling Centre (DRCC)." },
      { step: 4, title: "Document Verification at DRCC", desc: "Visit DRCC with original documents. Officials will verify and process your application." },
      { step: 5, title: "Bank Approval", desc: "Application is forwarded to empanelled bank. Bank reviews and sanctions the loan." },
      { step: 6, title: "Loan Disbursement", desc: "Funds are transferred directly to the college's account in installments each semester." },
    ],
    dates: [
      { event: "Applications Open (Year-round)", date: "Rolling basis" },
      { event: "DRCC Appointment Available", date: "Monday to Friday (10am–5pm)" },
      { event: "Processing Time", date: "15–30 working days after DRCC visit" },
      { event: "Academic Deadline (Autumn)", date: "September 30, 2025" },
      { event: "Academic Deadline (Spring)", date: "February 28, 2026" },
    ],
    faqs: [
      { q: "What is the repayment process after getting a job?", a: "The loan is repaid in EMIs starting 1 year after getting employment, or 1 year after course completion, whichever is earlier. EMI amount depends on your salary." },
      { q: "Can I use the loan for private colleges outside Bihar?", a: "Yes, the loan covers approved courses in recognized colleges anywhere in India. The institute must be NAAC/NBA accredited." },
      { q: "What courses are covered under BSCC?", a: "42 courses including B.Tech, MBBS, BDS, BAMS, LLB, B.Ed, B.A., B.Sc, B.Com, MBA, Polytechnic, Nursing, Hotel Management, and more." },
      { q: "Do I need a guarantor?", a: "For loans up to ₹4 lakh, a parent or guardian as guarantor is required. The guarantor must be a Bihar resident." },
    ],
    applyUrl: "https://www.7nishchay-yuvaupmission.bihar.gov.in",
  },
};

const DEFAULT_DETAIL: ScholarshipDetail = {
  overview: "This scholarship provides financial assistance to eligible students pursuing higher education in India. It aims to support meritorious students from economically weaker backgrounds to achieve their academic goals without financial constraints.",
  highlights: ["Direct bank transfer", "Renewable annually", "Covers tuition fees", "No repayment required"],
  eligibilityCriteria: [
    "Must be an Indian citizen enrolled in a recognized institution",
    "Must meet income and academic eligibility criteria as specified",
    "Valid Aadhaar and bank account required",
    "Must not be availing any other central/state scholarship simultaneously",
  ],
  benefits: [
    { label: "Scholarship Amount", value: "As per official notification" },
    { label: "Coverage", value: "Tuition fees and maintenance allowance" },
    { label: "Duration", value: "Duration of the course" },
  ],
  documents: [
    "Aadhaar Card",
    "Income Certificate",
    "Caste / Category Certificate (if applicable)",
    "Previous year marksheet",
    "Bank passbook",
    "College Bonafide Certificate",
    "Passport-size photo",
  ],
  steps: [
    { step: 1, title: "Register Online", desc: "Visit the official scholarship portal and register with your Aadhaar and mobile number." },
    { step: 2, title: "Fill Application Form", desc: "Complete the online application form with your personal, academic, and bank details." },
    { step: 3, title: "Upload Documents", desc: "Upload scanned copies of all required documents." },
    { step: 4, title: "Submit Application", desc: "Review and submit. Note your application reference number." },
    { step: 5, title: "Institute Verification", desc: "Your college verifies your application online." },
    { step: 6, title: "Receive Scholarship", desc: "Amount is credited to your bank account post approval." },
  ],
  dates: [
    { event: "Application Opens", date: "August 2025" },
    { event: "Last Date to Apply", date: "As per official notice" },
    { event: "Disbursement", date: "After verification" },
  ],
  faqs: [
    { q: "When will I receive the scholarship amount?", a: "Scholarship is disbursed directly to your bank account after verification by your institute and state authorities." },
    { q: "Can I apply next year if I miss this cycle?", a: "Yes, most scholarships open annually. Check the official portal for next cycle dates." },
    { q: "What if I change my course or college mid-year?", a: "You must inform the scholarship authority of any changes. Re-verification may be required." },
  ],
  applyUrl: "https://scholarships.gov.in",
};

export default function ScholarshipDetailPage() {
  const { slug } = useParams();
  
  const { data: scholarshipRes, isLoading } = useQuery({
    queryKey: ["scholarship", slug],
    queryFn: () => scholarshipsApi.findById(slug as string),
    enabled: !!slug,
  });

  const { data: relatedRes } = useQuery({
    queryKey: ["scholarships", "related", scholarshipRes?.data?.category],
    queryFn: () => scholarshipsApi.findAll({ category: scholarshipRes?.data?.category, limit: 3 }),
    enabled: !!scholarshipRes?.data?.category,
  });

  const apiScholarship = scholarshipRes?.data;
  const related = (relatedRes?.data?.data || []).filter((s: any) => s.slug !== slug);

  let faqsRaw: any = [];
  try {
    if (typeof apiScholarship?.faqs === 'string') {
      faqsRaw = JSON.parse(apiScholarship.faqs);
    } else {
      faqsRaw = apiScholarship?.faqs || [];
    }
  } catch(e) {}

  const scholarship = apiScholarship ? {
    name: apiScholarship.scholarshipName,
    shortName: apiScholarship.scholarshipName,
    slug: apiScholarship.slug,
    category: apiScholarship.category || "General",
    amount: apiScholarship.amount ? `₹${apiScholarship.amount}` : "Varies",
    deadline: apiScholarship.applicationEnd ? new Date(apiScholarship.applicationEnd).toLocaleDateString() : 'N/A',
    provider: apiScholarship.provider || "N/A",
    eligibility: apiScholarship.eligibility || "See official website for eligibility criteria.",
    students: "N/A",
    badge: (apiScholarship as any).badge || "",
    ...getCategoryColor(apiScholarship.category || ""),
    eligibleCategories: []
  } : null;

  const detail = apiScholarship ? {
    overview: "This scholarship provides financial assistance to eligible students pursuing higher education.",
    highlights: ["Direct bank transfer", "No repayment required"],
    eligibilityCriteria: [
      apiScholarship.eligibility || "Must be an Indian citizen enrolled in a recognized institution"
    ],
    benefits: [
      { label: "Scholarship Amount", value: scholarship?.amount || "Varies" },
      { label: "Duration", value: "Duration of the course" },
    ],
    documents: apiScholarship.requiredDocuments?.length ? apiScholarship.requiredDocuments : DEFAULT_DETAIL.documents,
    steps: DEFAULT_DETAIL.steps,
    dates: [
      { event: "Application Opens", date: apiScholarship.applicationStart ? new Date(apiScholarship.applicationStart).toLocaleDateString() : 'TBA' },
      { event: "Last Date to Apply", date: apiScholarship.applicationEnd ? new Date(apiScholarship.applicationEnd).toLocaleDateString() : 'TBA' },
    ],
    faqs: faqsRaw.length ? faqsRaw : DEFAULT_DETAIL.faqs,
    applyUrl: apiScholarship.officialWebsite || DEFAULT_DETAIL.applyUrl,
  } : DEFAULT_DETAIL;

  const [activeTab, setActiveTab] = useState<"overview" | "eligibility" | "documents" | "apply" | "dates" | "faqs">("overview");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "eligibility", label: "Eligibility" },
    { key: "documents", label: "Documents" },
    { key: "apply", label: "How to Apply" },
    { key: "dates", label: "Important Dates" },
    { key: "faqs", label: "FAQs" },
  ];

  return (
    <div style={{ backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <nav className="flex items-center gap-2 mb-4" style={{ fontSize: "12px", color: "#94a3b8" }}>
            <Link to="/" className="hover:text-[#4A7B5B]">Home</Link>
            <ChevronRight size={12} />
            <Link to="/scholarships" className="hover:text-[#4A7B5B]">Scholarships</Link>
            <ChevronRight size={12} />
            <span style={{ color: "#4A7B5B", fontWeight: 600 }}>{scholarship?.shortName}</span>
          </nav>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: scholarship?.bg }}>
              <Award size={28} style={{ color: scholarship?.color }} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-full" style={{ fontSize: "11px", fontWeight: 600, backgroundColor: scholarship?.bg, color: scholarship?.color }}>
                  {scholarship?.category}
                </span>
                {scholarship?.badge && (
                  <span className="px-2.5 py-1 rounded-full bg-[#E8F3EC]" style={{ fontSize: "11px", fontWeight: 600, color: "#4A7B5B" }}>
                    {scholarship?.badge}
                  </span>
                )}
              </div>
              <h1 className="mb-1" style={{ fontWeight: 800, color: "#4A7B5B", fontSize: "clamp(18px,3vw,26px)" }}>{scholarship?.name}</h1>
              <p style={{ fontSize: "13px", color: "#64748b" }}>By {scholarship?.provider} • {scholarship?.students} beneficiaries</p>
            </div>
          </div>

          {/* Key info bar */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
            {[
              { Icon: IndianRupee, label: "Amount", value: scholarship?.amount },
              { Icon: Calendar, label: "Last Date", value: scholarship?.deadline },
              { Icon: Users, label: "Beneficiaries", value: scholarship?.students },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: scholarship?.bg }}>
                  <Icon size={15} style={{ color: scholarship?.color }} />
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>{label}</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#4A7B5B" }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="px-4 py-3 shrink-0 border-b-2 transition-all"
                style={{
                  fontSize: "13px",
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  color: activeTab === tab.key ? "#4A7B5B" : "#64748b",
                  borderBottomColor: activeTab === tab.key ? "#4A7B5B" : "transparent",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">

            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h2 className="mb-3" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>About this Scholarship</h2>
                  <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.7 }}>{detail.overview}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h2 className="mb-4" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>Key Highlights</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {detail.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: scholarship?.bg }}>
                        <CheckCircle size={16} style={{ color: scholarship?.color }} />
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#4A7B5B" }}>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h2 className="mb-4" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>Benefits Breakdown</h2>
                  <div className="space-y-3">
                    {detail.benefits.map((b, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <span style={{ fontSize: "13px", color: "#64748b" }}>{b.label}</span>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#4A7B5B" }}>{b.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "eligibility" && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h2 className="mb-4" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>Eligibility Criteria</h2>
                <div className="space-y-3">
                  {detail.eligibilityCriteria.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: scholarship?.color }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#fff" }}>{i + 1}</span>
                      </div>
                      <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>{c}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl border" style={{ backgroundColor: scholarship?.bg, borderColor: (scholarship?.color || "") + "30" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: scholarship?.color }} className="mb-1">Eligible Categories</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {scholarship?.eligibleCategories?.map((c: string) => (
                      <span key={c} className="px-3 py-1 rounded-full bg-white border" style={{ fontSize: "12px", fontWeight: 600, color: scholarship?.color, borderColor: scholarship?.color + "40" }}>{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h2 className="mb-4" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>Required Documents</h2>
                <p className="mb-4" style={{ fontSize: "13px", color: "#64748b" }}>Keep these documents ready before starting your application. Upload scanned copies in JPG/PDF format (max 200KB each).</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {detail.documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="w-8 h-8 bg-[#E8F3EC] rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={15} className="text-[#4A7B5B]" />
                      </div>
                      <span style={{ fontSize: "13px", color: "#475569" }}>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "apply" && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h2 className="mb-2" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>How to Apply</h2>
                <p className="mb-6" style={{ fontSize: "13px", color: "#64748b" }}>Follow these steps to successfully apply for this scholarship.</p>
                <div className="space-y-4">
                  {detail.steps.map((s) => (
                    <div key={s.step} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: scholarship?.color }}>
                          <span style={{ fontSize: "13px", fontWeight: 800, color: "#fff" }}>{s.step}</span>
                        </div>
                        {s.step < detail.steps.length && <div className="w-0.5 flex-1 mt-2" style={{ backgroundColor: (scholarship?.color || "") + "30" }} />}
                      </div>
                      <div className="pb-5">
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#4A7B5B" }}>{s.title}</p>
                        <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <a href={detail.applyUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex items-center gap-2 px-5 py-3 rounded-xl text-white transition-all hover:opacity-90 w-fit"
                  style={{ backgroundColor: scholarship?.color, fontSize: "13px", fontWeight: 700 }}>
                  Apply on Official Portal <ExternalLink size={14} />
                </a>
              </div>
            )}

            {activeTab === "dates" && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h2 className="mb-4" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>Important Dates</h2>
                <div className="space-y-0">
                  {detail.dates.map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: scholarship?.bg }}>
                          <Clock size={15} style={{ color: scholarship?.color }} />
                        </div>
                        <span style={{ fontSize: "13px", color: "#475569" }}>{d.event}</span>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl" style={{ fontSize: "12px", fontWeight: 700, backgroundColor: scholarship?.bg, color: scholarship?.color }}>
                        {d.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "faqs" && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h2 className="mb-4" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>Frequently Asked Questions</h2>
                <div className="space-y-3">
                  {detail.faqs.map((faq: any, i: number) => (
                    <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#4A7B5B" }}>{faq.q}</span>
                        {openFaq === i ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                      </button>
                      {openFaq === i && (
                        <div className="px-4 pb-4">
                          <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.7 }}>{faq.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-72 space-y-4 shrink-0">
            {/* Apply CTA */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="text-center mb-4">
                <div style={{ fontSize: "22px", fontWeight: 800, color: scholarship?.color }}>{scholarship?.amount}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>per year</div>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                <span style={{ fontSize: "12px", color: "#64748b" }}>Deadline</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#F97316" }}>{scholarship?.deadline}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                <span style={{ fontSize: "12px", color: "#64748b" }}>Provider</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#4A7B5B" }}>{scholarship?.provider}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 mb-4">
                <span style={{ fontSize: "12px", color: "#64748b" }}>Beneficiaries</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#4A7B5B" }}>{scholarship?.students}</span>
              </div>
              <a href={detail.applyUrl} target="_blank" rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-xl text-white transition-all hover:opacity-90 mb-2"
                style={{ backgroundColor: scholarship?.color, fontSize: "13px", fontWeight: 700 }}>
                Apply Now
              </a>
              <Link to="/apply-now"
                className="block w-full text-center py-3 rounded-xl border transition-all hover:bg-gray-50"
                style={{ borderColor: scholarship?.color, fontSize: "13px", fontWeight: 600, color: scholarship?.color }}>
                Get Counseling Help
              </Link>
            </div>

            {/* AI Counselor */}
            <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, #4A7B5B 0%, #2d5a3f 100%)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Bot size={20} />
                <span style={{ fontSize: "14px", fontWeight: 700 }}>Ask AI Counselor</span>
              </div>
              <p style={{ fontSize: "12px", opacity: 0.85, lineHeight: 1.5 }} className="mb-4">
                Not sure if you qualify? Ask our AI about this scholarship and get personalised guidance.
              </p>
              <Link to="/ai-counselor" className="flex items-center gap-1.5 px-4 py-2.5 bg-white rounded-xl hover:bg-[#E8F3EC] transition-colors"
                style={{ fontSize: "12px", fontWeight: 700, color: "#4A7B5B" }}>
                Chat Now <ArrowRight size={13} />
              </Link>
            </div>

            {/* Related Scholarships */}
            {related.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h3 className="mb-4" style={{ fontSize: "13px", fontWeight: 700, color: "#4A7B5B" }}>More Scholarships</h3>
                <div className="space-y-3">
                  {related.map((s: any) => {
                    const style = getCategoryColor(s.category);
                    return (
                    <Link key={s.slug} to={`/scholarships/${s.slug}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: style.bg }}>
                        <Award size={15} style={{ color: style.color }} />
                      </div>
                      <div>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }}>{s.scholarshipName}</p>
                        <p style={{ fontSize: "11px", color: style.color, fontWeight: 600 }}>{s.amount ? `₹${s.amount}` : "Varies"}</p>
                      </div>
                    </Link>
                  )})}
                  <Link to="/scholarships" className="flex items-center gap-1 pt-1" style={{ fontSize: "12px", color: "#4A7B5B", fontWeight: 600 }}>
                    View all scholarships <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
