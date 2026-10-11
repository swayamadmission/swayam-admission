import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Sparkles,
  Building2,
  GraduationCap,
  Award,
  FileText,
  Share2,
  Check,
  Bot,
} from "lucide-react";
import { faqsApi } from "../../api/faqs.api";

export default function FAQDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: faqData, isLoading, isError } = useQuery({
    queryKey: ["public_faq_detail", slug],
    queryFn: () => (slug ? faqsApi.findBySlug(slug) : null),
    enabled: !!slug,
  });

  const helpfulMutation = useMutation({
    mutationFn: () => (slug ? faqsApi.markHelpful(slug) : Promise.reject()),
    onSuccess: () => {
      setVoted("up");
      queryClient.invalidateQueries({ queryKey: ["public_faq_detail", slug] });
    },
  });

  const notHelpfulMutation = useMutation({
    mutationFn: () => (slug ? faqsApi.markNotHelpful(slug) : Promise.reject()),
    onSuccess: () => {
      setVoted("down");
      queryClient.invalidateQueries({ queryKey: ["public_faq_detail", slug] });
    },
  });

  const faq = faqData?.data?.faq;
  const relatedFaqs = faqData?.data?.relatedFaqs || [];
  const relatedBlogs = faqData?.data?.relatedBlogs || [];
  const schemaOrg = faqData?.data?.schemaOrg || [];

  // Safe anti-duplication view tracking
  useEffect(() => {
    if (slug) {
      try {
        const viewed: string[] = JSON.parse(
          sessionStorage.getItem("swayam_viewed_faqs") || "[]"
        );
        if (!viewed.includes(slug)) {
          viewed.push(slug);
          sessionStorage.setItem("swayam_viewed_faqs", JSON.stringify(viewed));
          faqsApi.recordView(slug).catch(() => {});
        }
      } catch {
        // ignore
      }
    }
  }, [slug]);

  // Dynamic SEO Metadata (Title, Description, Canonical URL)
  useEffect(() => {
    if (faq) {
      const pageTitle = faq.seoTitle || `${faq.question} | Swayam Admission FAQs`;
      document.title = pageTitle;

      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute(
        "content",
        faq.seoDescription || faq.aiSummary || faq.answer.substring(0, 160)
      );

      if (faq.canonicalUrl) {
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
          canonical = document.createElement("link");
          canonical.setAttribute("rel", "canonical");
          document.head.appendChild(canonical);
        }
        canonical.setAttribute("href", faq.canonicalUrl);
      }
    }
  }, [faq]);

  // Inject Schema.org JSON-LD dynamically into head for LLMs
  useEffect(() => {
    if (schemaOrg && schemaOrg.length > 0) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "json-ld-schema-faq";
      script.innerHTML = JSON.stringify(schemaOrg);
      document.head.appendChild(script);

      return () => {
        const existing = document.getElementById("json-ld-schema-faq");
        if (existing) existing.remove();
      };
    }
  }, [schemaOrg]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">
            Loading Knowledge Base answer...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !faq) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-20 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900">FAQ Not Found</h2>
          <p className="text-sm text-slate-500">
            The requested FAQ answer could not be located or may have been updated.
          </p>
          <Link
            to="/faq"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A7B5B] text-white rounded-xl text-sm font-semibold hover:bg-[#3d664b]"
          >
            Browse All FAQs <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/" className="hover:text-[#4A7B5B]">Home</Link>
          <span>/</span>
          <Link to="/faq" className="hover:text-[#4A7B5B]">FAQs</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate max-w-xs">{faq.question}</span>
        </nav>

        {/* Main Card */}
        <article className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 sm:p-10 space-y-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <span className="px-3 py-1 bg-emerald-50 text-[#4A7B5B] rounded-full text-xs font-bold uppercase tracking-wider">
              {typeof faq.category === "object" ? (faq.category?.name || faq.category?.category || "General") : (faq.category || "General")}
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>{faq.views || 0} views</span>
              <button
                onClick={copyShareLink}
                className="flex items-center gap-1 hover:text-slate-600 font-semibold"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                <span>{copied ? "Link Copied" : "Share"}</span>
              </button>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
            {faq.question}
          </h1>

          {/* AI Summary Box */}
          {faq.aiSummary && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <Sparkles size={14} className="text-purple-600" /> AI Answer Summary
              </div>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                {faq.aiSummary}
              </p>
            </div>
          )}

          {/* Answer Body */}
          <div className="text-slate-800 text-sm sm:text-base leading-relaxed space-y-4 pt-2">
            {faq.answer}
          </div>

          {/* Feedback & Voting */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
              <span>Was this answer helpful?</span>
              <button
                onClick={() => !voted && helpfulMutation.mutate()}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  voted === "up"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <ThumbsUp size={14} /> Yes ({faq.helpfulCount || 0})
              </button>
              <button
                onClick={() => !voted && notHelpfulMutation.mutate()}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  voted === "down"
                    ? "bg-red-100 text-red-800"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <ThumbsDown size={14} /> No
              </button>
            </div>

            <Link
              to="/ai-counselor"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#4A7B5B] hover:underline"
            >
              <Bot size={15} /> Ask AI Counselor
            </Link>
          </div>
        </article>

        {/* Linked Entity Widgets */}
        {(faq.college || faq.course || faq.exam || faq.scholarship) && (
          <div className="p-6 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              Linked Knowledge Entities
            </h4>
            <div className="flex flex-wrap gap-3">
              {faq.college && (
                <Link
                  to={`/colleges/${faq.college.id}`}
                  className="px-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 hover:shadow-xs"
                >
                  <Building2 size={15} /> {faq.college.name}
                </Link>
              )}
              {faq.course && (
                <Link
                  to="/courses"
                  className="px-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 hover:shadow-xs"
                >
                  <GraduationCap size={15} /> {faq.course.name}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Related Blogs */}
        {relatedBlogs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Related Career & Admission Guides</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {relatedBlogs.map((b: any) => (
                <Link
                  key={b.id}
                  to={`/blog/${b.slug}`}
                  className="p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-all flex items-center gap-3 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 overflow-hidden">
                    <img
                      src={b.featuredImage || "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=200&q=80"}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#4A7B5B] transition-colors truncate">
                      {b.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {b.category} • {b.readingTime || 5} min read
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
