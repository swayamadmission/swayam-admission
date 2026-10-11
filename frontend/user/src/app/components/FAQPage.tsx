import React, { useState } from "react";
import { Link } from "react-router";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Sparkles,
  Bot,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  AlertCircle,
  RotateCcw,
  Clock,
  Send,
  X,
  MessageSquarePlus,
  ArrowLeft,
  FileQuestion,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { faqsApi, PublicFaqQueryParams } from "../../api/faqs.api";
import { useDebounce } from "../../hooks/useDebounce";
import { useAuth } from "./Navbar";
import { useAuth as useAuthContext } from "../../context/AuthContext";
import { PageBannerSlider } from "./common/PageBannerSlider";

const DEFAULT_CATEGORIES = [
  "All",
  "Admission",
  "College",
  "Course",
  "Exam",
  "Scholarship",
  "Hostel",
  "Fee",
  "General",
];

export default function FAQPage() {
  const queryClient = useQueryClient();
  const { openAuth } = useAuth();
  const { isLoggedIn, user } = useAuthContext();

  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [voted, setVoted] = useState<Record<string, "up" | "down">>({});

  // Student Ask Question & My Questions State
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [viewMyQuestions, setViewMyQuestions] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionCategory, setQuestionCategory] = useState("Admission");
  const [additionalDetails, setAdditionalDetails] = useState("");

  const debouncedSearch = useDebounce(search, 400);

  const queryParams: PublicFaqQueryParams = { limit: 40 };
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (activeCategory !== "All") queryParams.category = activeCategory;

  // 1. Dynamic Categories
  const { data: catRes } = useQuery({
    queryKey: ["faq_categories"],
    queryFn: () => faqsApi.getCategories(),
  });

  const rawCategories = Array.isArray(catRes?.data) ? catRes.data : [];
  const categoryCountMap: Record<string, number> = {};
  let totalCount = 0;

  rawCategories.forEach((item: any) => {
    if (typeof item === "string" && item.trim()) {
      categoryCountMap[item.trim()] = (categoryCountMap[item.trim()] || 0) + 1;
      totalCount += 1;
    } else if (item && typeof item === "object") {
      const name = item.category || item.name;
      const count = Number(item.count || item._count || 0);
      if (name && typeof name === "string") {
        categoryCountMap[name] = count;
        totalCount += count;
      }
    }
  });

  const categoryNames = Array.from(
    new Set([
      ...Object.keys(categoryCountMap),
      ...DEFAULT_CATEGORIES.filter((c) => c !== "All"),
    ])
  );

  const categories: { id: string; label: string; count?: number }[] = [
    {
      id: "All",
      label: "All",
      count: totalCount > 0 ? totalCount : undefined,
    },
    ...categoryNames.map((name) => ({
      id: name,
      label: name,
      count: categoryCountMap[name],
    })),
  ];

  // 2. FAQs List
  const {
    data: faqsRes,
    isLoading,
    isError,
    refetch: refetchFaqs,
    isFetching,
  } = useQuery({
    queryKey: ["public_faqs", queryParams],
    queryFn: () => faqsApi.findPublic(queryParams),
  });

  // 2. Popular FAQs Sidebar
  const { data: popularRes } = useQuery({
    queryKey: ["public_popular_faqs"],
    queryFn: () => faqsApi.getPopular(5),
  });

  const helpfulMutation = useMutation({
    mutationFn: (slug: string) => faqsApi.markHelpful(slug),
    onSuccess: (_, slug) => {
      setVoted((prev) => ({ ...prev, [slug]: "up" }));
      queryClient.invalidateQueries({ queryKey: ["public_faqs"] });
    },
  });

  const notHelpfulMutation = useMutation({
    mutationFn: (slug: string) => faqsApi.markNotHelpful(slug),
    onSuccess: (_, slug) => {
      setVoted((prev) => ({ ...prev, [slug]: "down" }));
      queryClient.invalidateQueries({ queryKey: ["public_faqs"] });
    },
  });

  const faqs = faqsRes?.data?.data || [];
  const popularFaqs = popularRes?.data || [];

  // 3. Student's Own Submitted Questions
  const {
    data: myQuestionsRes,
    isLoading: isLoadingMyQuestions,
    refetch: refetchMyQuestions,
  } = useQuery({
    queryKey: ["student_my_faqs"],
    queryFn: () => faqsApi.getMyQuestions(),
    enabled: !!isLoggedIn,
  });

  const myQuestions = myQuestionsRes?.data || [];

  // 4. Student Ask Question Mutation
  const askMutation = useMutation({
    mutationFn: (data: {
      question: string;
      category: string;
      additionalDetails?: string;
    }) => faqsApi.askQuestion(data),
    onSuccess: (res) => {
      toast.success(
        res?.data?.message ||
          "Question submitted successfully! Our counseling team will review and answer it."
      );
      setQuestionText("");
      setAdditionalDetails("");
      setIsAskModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["student_my_faqs"] });
      setViewMyQuestions(true);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          "Failed to submit question. Please check details and try again."
      );
    },
  });

  const handleOpenAskModal = () => {
    if (!isLoggedIn) {
      toast.info(
        "Please sign in as a student to submit a question to our counselors."
      );
      openAuth("login");
      return;
    }
    setIsAskModalOpen(true);
  };

  const handleToggleFaq = (faq: any) => {
    const isOpening = openFaq !== faq.id;
    setOpenFaq(isOpening ? null : faq.id);
    if (isOpening && faq.slug) {
      try {
        const viewed: string[] = JSON.parse(
          sessionStorage.getItem("swayam_viewed_faqs") || "[]"
        );
        if (!viewed.includes(faq.slug)) {
          viewed.push(faq.slug);
          sessionStorage.setItem("swayam_viewed_faqs", JSON.stringify(viewed));
          faqsApi.recordView(faq.slug).catch(() => {});
        }
      } catch {
        // ignore storage errors
      }
    }
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (questionText.trim().length < 10) {
      toast.error("Please enter a question with at least 10 characters.");
      return;
    }
    askMutation.mutate({
      question: questionText.trim(),
      category: questionCategory,
      additionalDetails: additionalDetails.trim() || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1">
            <CheckCircle2 size={12} /> Answered & Published
          </span>
        );
      case "DRAFT":
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold inline-flex items-center gap-1">
            <Clock size={12} /> Drafting Answer
          </span>
        );
      case "PENDING_REVIEW":
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold inline-flex items-center gap-1">
            <Clock size={12} /> Pending Review
          </span>
        );
    }
  };

  return (
    <div style={{ backgroundColor: "#F8FAFC" }} className="min-h-screen">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-[#4A7B5B] rounded-full text-xs font-bold mb-3">
            <HelpCircle size={14} /> Platform Knowledge Base
          </div>
          <h1
            className="mb-3"
            style={{
              fontWeight: 800,
              color: "#4A7B5B",
              fontSize: "clamp(26px, 4vw, 40px)",
            }}
          >
            Frequently Asked Questions
          </h1>
          <p style={{ fontSize: "15px", color: "#64748b" }} className="mb-6">
            Find clear, instant answers about college admissions, entrance exams, scholarships, fees, and career paths.
          </p>

          {/* Search Box */}
          <div className="relative max-w-xl mx-auto">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl shadow-lg p-2 hover:shadow-xl transition-shadow">
              <Search size={18} className="text-gray-400 ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Type your question (e.g. DTU B.Tech fees, UP Scholarship last date)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400 py-2"
              />
            </div>
          </div>

          {/* Action Row: Ask a Question & My Questions */}
          <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
            <button
              type="button"
              onClick={handleOpenAskModal}
              className="px-5 py-2.5 bg-[#4A7B5B] hover:bg-[#3d664b] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
            >
              <MessageSquarePlus size={16} />
              <span>Ask a Question</span>
            </button>

            {isLoggedIn && (
              <button
                type="button"
                onClick={() => setViewMyQuestions(!viewMyQuestions)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                  viewMyQuestions
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-700 border-gray-200 hover:border-[#4A7B5B]/50 hover:bg-slate-50"
                }`}
              >
                <span>My Questions</span>
                {myQuestions.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      viewMyQuestions
                        ? "bg-white/20 text-white"
                        : "bg-emerald-100 text-[#4A7B5B]"
                    }`}
                  >
                    {myQuestions.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Banner Slot */}
        <PageBannerSlider slot="DASHBOARD_FAQ" variant="wide" containerClassName="mb-8" />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main FAQ List or My Questions */}
          <div className="flex-1 min-w-0">
            {viewMyQuestions ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMyQuestions(false)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                      title="Back to FAQs"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        My Submitted Questions
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Track counselor review and answer status for your queries
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAskModal}
                    className="px-3.5 py-1.5 bg-[#4A7B5B] hover:bg-[#3d664b] text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <MessageSquarePlus size={14} /> Ask Another
                  </button>
                </div>

                {isLoadingMyQuestions ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
                    Loading your submitted questions...
                  </div>
                ) : myQuestions.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                    <FileQuestion className="mx-auto text-slate-300" size={40} />
                    <h3 className="text-base font-bold text-gray-900">
                      No questions submitted yet
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Have a query about admission cutoffs, fees, colleges, or exams? Ask our counseling team directly.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAskModal}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold hover:bg-[#3d664b]"
                    >
                      <MessageSquarePlus size={15} /> Ask a Question Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myQuestions.map((q: any) => (
                      <div
                        key={q.id}
                        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#4A7B5B]">
                              {q.category || "General"}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {q.createdAt
                                ? new Date(q.createdAt).toLocaleDateString()
                                : ""}
                            </span>
                          </div>
                          <div>{getStatusBadge(q.status)}</div>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          {q.question}
                        </h3>

                        {q.status === "PUBLISHED" && q.answer ? (
                          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
                            <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                              <CheckCircle2 size={14} className="text-emerald-600" /> Counselor Verified Answer:
                            </div>
                            <div className="text-xs text-slate-700 leading-relaxed">
                              {q.answer}
                            </div>
                            <div className="pt-1">
                              <Link
                                to={`/faq/${q.slug}`}
                                className="text-xs font-bold text-[#4A7B5B] hover:underline inline-flex items-center gap-1"
                              >
                                View Full Article & Related Insights <ArrowRight size={12} />
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
                            <Clock size={16} className="text-amber-600 shrink-0" />
                            <span>
                              Our counselor team has received your query and is preparing an answer. You will be able to see the response here once approved.
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Category Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
                  {categories.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
                          isActive
                            ? "bg-[#4A7B5B] text-white shadow-sm"
                            : "bg-white border border-gray-200 text-gray-600 hover:border-[#4A7B5B]/40"
                        }`}
                      >
                        <span>{cat.label}</span>
                        {typeof cat.count === "number" && cat.count > 0 && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {cat.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Accordion list */}
                {isLoading ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
                    Loading Knowledge Base answers...
                  </div>
                ) : isError ? (
                  <div className="text-center py-14 bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                    <AlertCircle className="mx-auto text-amber-500" size={36} />
                    <h3 className="text-base font-bold text-gray-900">
                      Unable to load FAQs
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      We're having trouble retrieving the knowledge base right now. Please try again.
                    </p>
                    <button
                      type="button"
                      onClick={() => refetchFaqs()}
                      disabled={isFetching}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold hover:bg-[#3d664b] disabled:opacity-50"
                    >
                      <RotateCcw size={14} className={isFetching ? "animate-spin" : ""} /> Retry
                    </button>
                  </div>
                ) : faqs.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 space-y-3">
                    <HelpCircle className="mx-auto text-gray-300" size={40} />
                    <h3 className="text-base font-bold text-gray-900">
                      No matching FAQs found
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Try searching with different keywords or ask our AI Counselor directly.
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleOpenAskModal}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold hover:bg-[#3d664b]"
                      >
                        <MessageSquarePlus size={16} /> Ask This Question
                      </button>
                      <Link
                        to="/ai-counselor"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
                      >
                        <Bot size={16} /> Ask AI Counselor
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {faqs.map((faq: any) => {
                      const isOpen = openFaq === faq.id;
                      const voteState = voted[faq.slug];

                      return (
                        <div
                          key={faq.id}
                          className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:border-gray-200 transition-all"
                        >
                          <button
                            onClick={() => handleToggleFaq(faq)}
                            className="w-full p-5 text-left flex justify-between items-center font-bold text-slate-900 text-sm sm:text-base hover:bg-slate-50/50 transition-colors gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#4A7B5B] shrink-0">
                                {typeof faq.category === "object"
                                  ? faq.category?.name ||
                                    faq.category?.category ||
                                    "General"
                                  : faq.category || "General"}
                              </span>
                              <span>{faq.question}</span>
                            </div>
                            {isOpen ? (
                              <ChevronUp size={20} className="text-[#4A7B5B] shrink-0" />
                            ) : (
                              <ChevronDown size={20} className="text-slate-400 shrink-0" />
                            )}
                          </button>

                          {isOpen && (
                            <div className="p-5 pt-0 text-xs sm:text-sm text-slate-700 leading-relaxed border-t border-slate-100 bg-slate-50/40 space-y-4">
                              <div className="pt-4">{faq.answer}</div>

                              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200/60 text-xs">
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-500 font-medium">Was this helpful?</span>
                                  <button
                                    onClick={() => !voteState && helpfulMutation.mutate(faq.slug)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                      voteState === "up"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <ThumbsUp size={13} /> Yes ({faq.helpfulCount || 0})
                                  </button>
                                  <button
                                    onClick={() => !voteState && notHelpfulMutation.mutate(faq.slug)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                      voteState === "down"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <ThumbsDown size={13} /> No
                                  </button>
                                </div>

                                <Link
                                  to={`/faq/${faq.slug}`}
                                  className="text-[#4A7B5B] font-semibold flex items-center gap-1 hover:underline text-xs"
                                >
                                  Full Article View <ArrowRight size={12} />
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-6 shrink-0">
            {/* AI Counselor Banner */}
            <div className="bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] rounded-2xl p-6 text-white shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-[#F0AE1A]" />
                <h3 className="font-bold text-base">Have a specific question?</h3>
              </div>
              <p className="text-white/80 text-xs leading-relaxed">
                Chat with Swayam AI Counselor for personalized admission answers based on your marks, location, and budget.
              </p>
              <Link
                to="/ai-counselor"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-white text-[#4A7B5B] rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Ask AI Counselor <ArrowRight size={14} />
              </Link>
            </div>

            {/* Popular Questions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-[#F0AE1A]" /> Most Viewed Questions
              </h3>
              <div className="space-y-2.5 divide-y divide-slate-100">
                {popularFaqs.map((p: any, i: number) => (
                  <Link
                    key={p.id || i}
                    to={`/faq/${p.slug}`}
                    className="pt-2.5 first:pt-0 block group"
                  >
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#4A7B5B] transition-colors leading-snug">
                      {p.question}
                    </h4>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {typeof p.category === "object" ? (p.category?.name || p.category?.category || "General") : (p.category || "General")} • {p.views || 0} views
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ask a Question Modal */}
      {isAskModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-[#4A7B5B] rounded-xl">
                  <MessageSquarePlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Ask a Question
                  </h3>
                  <p className="text-xs text-gray-500">
                    Get verified answers from Swayam Admission counselors
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAskModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleQuestionSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Your Question <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g., What are the eligibility criteria and cutoff for DTU Computer Science in 2026?"
                  maxLength={500}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-[#4A7B5B] focus:bg-white transition-all resize-none"
                  required
                />
                <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
                  <span>Minimum 10 characters</span>
                  <span>{questionText.length} / 500</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={questionCategory}
                  onChange={(e) => setQuestionCategory(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-[#4A7B5B]"
                >
                  <option value="Admission">Admission</option>
                  <option value="College">College</option>
                  <option value="Course">Course</option>
                  <option value="Exam">Exam</option>
                  <option value="Scholarship">Scholarship</option>
                  <option value="Hostel">Hostel</option>
                  <option value="Fee">Fee</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  placeholder="Mention your 12th percentage, entrance exam rank, category/quota, or state of domicile for more accurate guidance..."
                  maxLength={2000}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 outline-none focus:border-[#4A7B5B] focus:bg-white transition-all resize-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Private student details will only be visible to verified counselors.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAskModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={askMutation.isPending || questionText.trim().length < 10}
                  className="px-5 py-2.5 bg-[#4A7B5B] hover:bg-[#3d664b] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {askMutation.isPending ? (
                    <>
                      <RotateCcw size={14} className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Submit Question
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

