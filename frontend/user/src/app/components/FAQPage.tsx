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
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { faqsApi, PublicFaqQueryParams } from "../../api/faqs.api";
import { useDebounce } from "../../hooks/useDebounce";

const CATEGORIES = [
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
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [voted, setVoted] = useState<Record<string, "up" | "down">>({});

  const debouncedSearch = useDebounce(search, 500);

  const queryParams: PublicFaqQueryParams = { limit: 30 };
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (activeCategory !== "All") queryParams.category = activeCategory;

  // 1. FAQs List
  const { data: faqsRes, isLoading } = useQuery({
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main FAQ List */}
          <div className="flex-1 min-w-0">
            {/* Category Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    activeCategory === cat
                      ? "bg-[#4A7B5B] text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-[#4A7B5B]/40"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Accordion list */}
            {isLoading ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
                Loading Knowledge Base answers...
              </div>
            ) : faqs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 space-y-3">
                <HelpCircle className="mx-auto text-gray-300" size={40} />
                <h3 className="text-base font-bold text-gray-900">No matching FAQs found</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Try searching with different keywords or ask our AI Counselor directly.
                </p>
                <Link
                  to="/ai-counselor"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A7B5B] text-white rounded-xl text-xs font-bold hover:bg-[#3d664b]"
                >
                  <Bot size={16} /> Ask AI Counselor
                </Link>
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
                        onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                        className="w-full p-5 text-left flex justify-between items-center font-bold text-slate-900 text-sm sm:text-base hover:bg-slate-50/50 transition-colors gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#4A7B5B] shrink-0">
                            {faq.category}
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
                      {p.category} • {p.views || 0} views
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
