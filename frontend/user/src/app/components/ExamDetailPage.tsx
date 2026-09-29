import React, { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ChevronRight, Calendar, Clock, Users, FileText, CheckCircle2,
  AlertCircle, BookOpen, ChevronDown, ChevronUp, ArrowRight, Phone, Bot, GraduationCap, Download
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { examsApi } from "../../api/exams.api";
import { studyMaterialsApi, StudyMaterial } from "../../api/study-materials.api";

import { Cpu, Stethoscope, TrendingUp, Scale } from "lucide-react";

const getDefaultExamData = (category: string) => {
  let icon = FileText;
  let color = "#3B82F6";
  let bg = "#EFF6FF";

  switch (category?.toLowerCase()) {
    case "engineering": icon = Cpu; color = "#3B82F6"; bg = "#EFF6FF"; break;
    case "medical": icon = Stethoscope; color = "#EF4444"; bg = "#FEF2F2"; break;
    case "mba": icon = TrendingUp; color = "#F59E0B"; bg = "#FFFBEB"; break;
    case "law": icon = Scale; color = "#6366F1"; bg = "#EEF2FF"; break;
    case "central-university": icon = GraduationCap; color = "#8B5CF6"; bg = "#F5F3FF"; break;
    case "architecture": icon = BookOpen; color = "#14B8A6"; bg = "#F0FDFA"; break;
  }

  return { icon, color, bg };
};

const DEFAULT_DETAIL = {
  pattern: [
    { section: "Section A", questions: 40, marks: 160, type: "MCQ" },
    { section: "Section B", questions: 20, marks: 80, type: "Descriptive" },
  ],
  totalMarks: 240,
  duration: "2.5 Hours",
  marking: "+4 for correct, -1 for wrong",
  syllabus: [
    { subject: "Core Subject 1", topics: ["Topic A", "Topic B", "Topic C", "Topic D"] },
    { subject: "Core Subject 2", topics: ["Topic E", "Topic F", "Topic G", "Topic H"] },
    { subject: "General Aptitude", topics: ["Reasoning", "Quantitative", "English", "GK"] },
  ],
  importantDates: [
    { event: "Registration Opens", date: "Nov 1, 2024" },
    { event: "Registration Closes", date: "Dec 15, 2024" },
    { event: "Admit Card Release", date: "Jan 10, 2025" },
    { event: "Exam Date", date: "Feb 2025" },
    { event: "Result", date: "Mar 2025" },
  ],
  applicationSteps: [
    "Visit official website and register with email",
    "Fill application form with personal and academic details",
    "Upload documents (photo, signature)",
    "Choose exam centre",
    "Pay application fee",
    "Download confirmation",
  ],
  counseling: [
    "Check cutoffs after results",
    "Register on counseling portal",
    "Fill college preferences",
    "Accept seat allotment",
    "Report to college",
  ],
  faqs: [
    { q: "Is there negative marking?", a: "Yes, there is negative marking for wrong answers in MCQ sections. No negative marking for numerical/essay type questions." },
    { q: "How many attempts are allowed?", a: "Please check the official exam notification for attempt limits as they vary by exam and category." },
  ],
};

export default function ExamDetailPage() {
  const { slug } = useParams();
  
  const { data: examRes, isLoading } = useQuery({
    queryKey: ["exam", slug],
    queryFn: () => examsApi.findById(slug as string),
    enabled: !!slug,
  });

  const apiExam = examRes?.data;

  const { data: materialsRes } = useQuery({
    queryKey: ["exam_materials", apiExam?.id],
    queryFn: () => studyMaterialsApi.getByExam(apiExam!.id, 12),
    enabled: !!apiExam?.id,
  });
  const { icon: Icon, color, bg } = getDefaultExamData(apiExam?.category || "");

  const exam = apiExam ? {
    name: apiExam.examName,
    fullName: apiExam.examName,
    category: apiExam.category,
    conducting: apiExam.conductedBy || "TBA",
    mode: apiExam.examMode || "TBA",
    frequency: "TBA", // Fallback
    nextDate: apiExam.examDate ? new Date(apiExam.examDate).toLocaleDateString() : "TBA",
    registrationEnd: apiExam.applicationEnd ? new Date(apiExam.applicationEnd).toLocaleDateString() : "TBA",
    totalApplicants: "N/A",
    difficulty: "Moderate",
    description: "Entrance examination.",
    eligibility: apiExam.eligibility || "Check official website",
    topColleges: ["Top College 1", "Top College 2", "Top College 3"],
  } : null;

  let patternRaw: any = null;
  try {
    if (typeof apiExam?.pattern === 'string') {
      patternRaw = JSON.parse(apiExam.pattern);
    } else {
      patternRaw = apiExam?.pattern;
    }
  } catch(e) {}

  let faqsRaw: any = [];
  try {
    if (typeof apiExam?.faqs === 'string') {
      faqsRaw = JSON.parse(apiExam.faqs);
    } else {
      faqsRaw = apiExam?.faqs || [];
    }
  } catch(e) {}

  const detail = apiExam ? {
    pattern: patternRaw || DEFAULT_DETAIL.pattern,
    totalMarks: apiExam.totalMarks || DEFAULT_DETAIL.totalMarks,
    duration: apiExam.duration || DEFAULT_DETAIL.duration,
    marking: "+4 for correct, -1 for wrong",
    syllabus: apiExam.syllabus ? [{ subject: "General", topics: apiExam.syllabus }] : DEFAULT_DETAIL.syllabus,
    importantDates: [
      { event: "Registration Opens", date: apiExam.applicationStart ? new Date(apiExam.applicationStart).toLocaleDateString() : "TBA" },
      { event: "Registration Closes", date: apiExam.applicationEnd ? new Date(apiExam.applicationEnd).toLocaleDateString() : "TBA" },
      { event: "Exam Date", date: apiExam.examDate ? new Date(apiExam.examDate).toLocaleDateString() : "TBA" },
      { event: "Result", date: apiExam.resultDate ? new Date(apiExam.resultDate).toLocaleDateString() : "TBA" },
    ],
    applicationSteps: DEFAULT_DETAIL.applicationSteps,
    counseling: DEFAULT_DETAIL.counseling,
    faqs: faqsRaw.length ? faqsRaw : DEFAULT_DETAIL.faqs,
  } : DEFAULT_DETAIL;
  const [activeTab, setActiveTab] = useState("Overview");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openSyllabus, setOpenSyllabus] = useState<string | null>(null);

  const TABS = ["Overview", "Pattern", "Syllabus", "Dates", "Study Resources", "Apply", "FAQs"];

  return (
    <div style={{ backgroundColor: "#F8FAFC" }}>
      {/* Breadcrumb + Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <nav className="flex items-center gap-2 mb-5" style={{ fontSize: "12px", color: "#94a3b8" }}>
            <Link to="/" className="hover:text-[#4A7B5B] transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link to="/exams" className="hover:text-[#4A7B5B] transition-colors">Exams</Link>
            <ChevronRight size={12} />
            <span style={{ color: "#4A7B5B", fontWeight: 600 }}>{exam?.name}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
              <Icon size={28} style={{ color: color }} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 style={{ fontWeight: 800, color: "#4A7B5B", fontSize: "clamp(20px,4vw,30px)" }}>{exam?.name}</h1>
                {(exam as any)?.badge && (
                  <span className="px-2.5 py-1 rounded-xl text-white" style={{ fontSize: "11px", fontWeight: 600, backgroundColor: color }}>{(exam as any).badge}</span>
                )}
              </div>
              <p style={{ fontSize: "13px", color: "#64748b" }} className="mb-3">{exam?.fullName} · Conducted by {exam?.conducting}</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { Icon: Calendar, label: exam?.nextDate },
                  { Icon: Users, label: exam?.totalApplicants + " Applicants" },
                  { Icon: Clock, label: exam?.frequency },
                  { Icon: FileText, label: exam?.mode },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5" style={{ fontSize: "12px", color: "#64748b" }}>
                    <Icon size={13} className="text-[#4A7B5B]" />{label}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to="/apply-now" className="px-5 py-2.5 bg-[#4A7B5B] text-white rounded-xl hover:bg-[#3d6b4d] transition-colors" style={{ fontWeight: 600, fontSize: "14px" }}>
                Apply Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-6 no-scrollbar border-b border-gray-100">
              {TABS.map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-2.5 text-sm whitespace-nowrap shrink-0 transition-colors ${activeTab === t ? "text-[#4A7B5B] border-b-2 border-[#4A7B5B] -mb-px" : "text-gray-500 hover:text-gray-700"}`}
                  style={{ fontWeight: activeTab === t ? 600 : 400 }}>
                  {t}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}
            {activeTab === "Overview" && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-3" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>About {exam?.name}</h3>
                  <p style={{ fontSize: "14px", color: "#4B5563", lineHeight: 1.7 }}>{exam?.description}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Marks", value: detail.totalMarks },
                    { label: "Duration", value: detail.duration },
                    { label: "Total Applicants", value: exam?.totalApplicants },
                    { label: "Mode", value: exam?.mode },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                      <div style={{ fontSize: "20px", fontWeight: 800, color: "#4A7B5B" }}>{s.value}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }} className="mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-3" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>Eligibility Criteria</h3>
                  <div className="flex items-start gap-3 p-4 bg-[#E8F3EC] rounded-xl">
                    <CheckCircle2 size={18} className="text-[#4A7B5B] shrink-0 mt-0.5" />
                    <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>{exam?.eligibility}</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-3" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>Top Colleges Accepting {exam?.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {exam?.topColleges.map(c => (
                      <Link key={c} to="/colleges" className="flex items-center gap-2 px-3 py-2 bg-[#F8FAFC] border border-gray-100 rounded-xl hover:border-[#4A7B5B]/30 hover:bg-[#E8F3EC] transition-all">
                        <GraduationCap size={13} className="text-[#4A7B5B]" />
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{c}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* EXAM PATTERN */}
            {activeTab === "Pattern" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>Exam Pattern</h3>
                    <span className="px-3 py-1.5 bg-[#E8F3EC] text-[#4A7B5B] rounded-xl" style={{ fontSize: "12px", fontWeight: 600 }}>
                      Total: {detail.totalMarks} Marks
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {detail.pattern.map((p: any) => (
                      <div key={p.section} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#E8F3EC] rounded-xl flex items-center justify-center">
                            <BookOpen size={14} className="text-[#4A7B5B]" />
                          </div>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: 600, color: "#4A7B5B" }}>{p.section}</div>
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>{p.type}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div style={{ fontSize: "16px", fontWeight: 800, color: "#4A7B5B" }}>{p.marks}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>{p.questions} Qs</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
                  <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#92400E" }}>Marking Scheme</div>
                    <p style={{ fontSize: "12px", color: "#78350F", lineHeight: 1.5 }} className="mt-0.5">{detail.marking}</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock size={16} className="text-[#4A7B5B]" />
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#4A7B5B" }}>Duration: {detail.duration}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#64748b" }}>Time management is critical. Practice with timed mock tests.</p>
                </div>
              </div>
            )}

            {/* SYLLABUS */}
            {activeTab === "Syllabus" && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
                  <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>
                    The syllabus is based on NCERT Class 11 & 12 curriculum. Click on each subject to expand topics.
                  </p>
                </div>
                {detail.syllabus.map((s: any) => (
                  <div key={s.subject} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <button onClick={() => setOpenSyllabus(openSyllabus === s.subject ? null : s.subject)}
                      className="w-full flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#E8F3EC] rounded-xl flex items-center justify-center">
                          <BookOpen size={15} className="text-[#4A7B5B]" />
                        </div>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "#4A7B5B" }}>{s.subject}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full" style={{ fontSize: "10px" }}>{s.topics.length} Topics</span>
                      </div>
                      {openSyllabus === s.subject ? <ChevronUp size={16} className="text-[#4A7B5B]" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>
                    {openSyllabus === s.subject && (
                      <div className="px-4 pb-4">
                        <div className="flex flex-wrap gap-2">
                          {s.topics.map((t: string) => (
                            <span key={t} className="px-3 py-1.5 bg-[#F8FAFC] border border-gray-100 rounded-xl" style={{ fontSize: "12px", color: "#374151" }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* IMPORTANT DATES */}
            {activeTab === "Dates" && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>Important Dates</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {detail.importantDates.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#E8F3EC] rounded-xl flex items-center justify-center shrink-0">
                          <Calendar size={14} className="text-[#4A7B5B]" />
                        </div>
                        <span style={{ fontSize: "14px", color: "#4A7B5B" }}>{d.event}</span>
                      </div>
                      <span className="px-3 py-1.5 bg-[#F8FAFC] rounded-xl" style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>{d.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STUDY RESOURCES */}
            {activeTab === "Study Resources" && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-4 flex items-center gap-2" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>
                    <BookOpen size={16} className="text-[#4A7B5B]" />
                    Exam Study Resources
                  </h3>
                  {!materialsRes?.data?.data?.length ? (
                    <div className="text-center py-8 text-[#94A3B8]">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No study materials linked to this exam yet.</p>
                      <Link to="/study-materials" className="text-sm text-[#4A7B5B] font-semibold hover:underline mt-1 inline-block">
                        Browse All Materials →
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(materialsRes?.data?.data ?? []).map((m: StudyMaterial) => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl hover:bg-[#EFF6F1] transition-colors border border-[#E2E8F0]">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#E8F3EC" }}>
                              <FileText size={15} className="text-[#4A7B5B]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#4A7B5B] truncate">{m.title}</p>
                              <p className="text-xs text-[#94A3B8]">
                                {m.materialType} · {m.subject || m.category}
                                {m.fileSize ? ` · ${m.fileSize}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs text-[#94A3B8] flex items-center gap-0.5">
                              <Download size={10} />{m.downloadCount}
                            </span>
                            {m.fileUrl ? (
                              <a
                                href={m.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => studyMaterialsApi.trackDownload(m.id)}
                                className="px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors"
                                style={{ backgroundColor: "#4A7B5B" }}
                              >
                                {m.premium ? "Unlock" : "Get"}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link
                    to={`/study-materials?q=${encodeURIComponent(exam?.name || "")}`}
                    className="flex items-center justify-center gap-1 text-sm text-[#4A7B5B] font-semibold py-3 mt-3 hover:underline"
                  >
                    View All {exam?.name} Materials →
                  </Link>
                </div>
              </div>
            )}

            {/* APPLICATION PROCESS */}
            {activeTab === "Apply" && (

              <div className="space-y-5">
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-4" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>How to Apply</h3>
                  <div className="space-y-3">
                    {detail.applicationSteps.map((step: string, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#4A7B5B] flex items-center justify-center shrink-0 mt-0.5">
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "white" }}>{i + 1}</span>
                        </div>
                        <p style={{ fontSize: "13px", color: "#4B5563", lineHeight: 1.6 }}>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="mb-4" style={{ fontSize: "16px", fontWeight: 700, color: "#4A7B5B" }}>Counseling Process</h3>
                  <div className="space-y-3">
                    {detail.counseling.map((step: string, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#F0AE1A] flex items-center justify-center shrink-0 mt-0.5">
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "white" }}>{i + 1}</span>
                        </div>
                        <p style={{ fontSize: "13px", color: "#4B5563", lineHeight: 1.6 }}>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* FAQs */}
            {activeTab === "FAQs" && (
              <div className="space-y-3">
                {detail.faqs.map((f: any, i: number) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between p-5 text-left">
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#4A7B5B" }} className="pr-4">{f.q}</span>
                      {openFaq === i ? <ChevronUp size={16} className="text-[#4A7B5B] shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-5">
                        <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.7 }}>{f.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-64 space-y-4 shrink-0">
            {/* Quick Apply */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-20">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
                  <Icon size={18} style={{ color: color }} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#4A7B5B" }}>{exam?.name}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Next: {exam?.nextDate}</div>
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle size={13} className="text-red-400 shrink-0" />
                <span style={{ fontSize: "11px", color: "#DC2626" }}>Reg. closes: <strong>{exam?.registrationEnd}</strong></span>
              </div>
              <Link to="/apply-now" className="w-full flex items-center justify-center gap-2 py-3 bg-[#4A7B5B] text-white rounded-xl hover:bg-[#3d6b4d] transition-colors mb-3" style={{ fontWeight: 600, fontSize: "14px" }}>
                Apply Now <ArrowRight size={14} />
              </Link>
              <a href="tel:+919000000000" className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors" style={{ fontSize: "13px" }}>
                <Phone size={13} /> Free Counseling
              </a>
            </div>

            {/* AI Counselor */}
            <div className="bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bot size={16} className="text-[#F0AE1A]" />
                <span className="text-white" style={{ fontSize: "13px", fontWeight: 700 }}>Ask AI Counselor</span>
              </div>
              <p className="text-white/80 mb-4" style={{ fontSize: "12px", lineHeight: 1.6 }}>
                Get personalized guidance on {exam?.name} preparation and college selection.
              </p>
              <Link to="/ai-counselor" className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-[#4A7B5B] rounded-xl" style={{ fontWeight: 600, fontSize: "13px" }}>
                Chat with AI
              </Link>
            </div>

            {/* Related exams */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#4A7B5B" }} className="mb-3">Related Exams</h4>
              <div className="space-y-2">
                <Link to="/exams" className="flex items-center gap-1.5 text-[#4A7B5B] pt-1" style={{ fontSize: "12px", fontWeight: 600 }}>
                  View all exams <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
