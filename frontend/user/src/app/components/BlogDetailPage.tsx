import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Calendar,
  User,
  ThumbsUp,
  Share2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Building2,
  GraduationCap,
  Copy,
  Check,
} from "lucide-react";
import { blogsApi } from "../../api/blogs.api";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: blogData, isLoading, isError } = useQuery({
    queryKey: ["public_blog_detail", slug],
    queryFn: () => (slug ? blogsApi.findBySlug(slug) : null),
    enabled: !!slug,
  });

  const likeMutation = useMutation({
    mutationFn: () => (slug ? blogsApi.likeBlog(slug) : Promise.reject()),
    onSuccess: () => {
      setLiked(true);
      queryClient.invalidateQueries({ queryKey: ["public_blog_detail", slug] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: () => (slug ? blogsApi.shareBlog(slug) : Promise.reject()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public_blog_detail", slug] });
    },
  });

  const blog = blogData?.data?.blog;
  const relatedBlogs = blogData?.data?.relatedBlogs || [];
  const schemaOrg = blogData?.data?.schemaOrg || [];

  const { user } = useAuth();
  const studentId = (user as any)?.id;

  const { data: savedRes } = useQuery({
    queryKey: ["saved_guides", studentId],
    queryFn: () => blogsApi.getSavedGuides(studentId),
    enabled: !!studentId,
  });

  const isSaved = useMemo(() => {
    const list = Array.isArray(savedRes?.data) ? savedRes.data : [];
    return list.some((g: any) => g.id === blog?.id || (blog?.slug && g.slug === blog.slug));
  }, [savedRes, blog?.id, blog?.slug]);

  const saveGuideMutation = useMutation({
    mutationFn: () => (blog?.id ? blogsApi.saveGuide(blog.id, studentId) : Promise.reject()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_guides"] });
      toast.success("Guide saved to bookmarks");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to save guide");
    },
  });

  const unsaveGuideMutation = useMutation({
    mutationFn: () => (blog?.id ? blogsApi.unsaveGuide(blog.id, studentId) : Promise.reject()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_guides"] });
      toast.success("Guide removed from bookmarks");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to remove saved guide");
    },
  });

  const handleToggleSave = () => {
    if (!studentId) {
      toast.error("Please log in to bookmark guides to your profile");
      return;
    }
    if (!blog?.id) return;
    if (isSaved) {
      unsaveGuideMutation.mutate();
    } else {
      saveGuideMutation.mutate();
    }
  };

  // Inject Schema.org JSON-LD dynamically into head for LLMs
  useEffect(() => {
    if (schemaOrg && schemaOrg.length > 0) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "json-ld-schema-blog";
      script.innerHTML = JSON.stringify(schemaOrg);
      document.head.appendChild(script);

      return () => {
        const existing = document.getElementById("json-ld-schema-blog");
        if (existing) existing.remove();
      };
    }
  }, [schemaOrg]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    if (slug) shareMutation.mutate();
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Loading article & Knowledge Hub details...</p>
        </div>
      </div>
    );
  }

  if (isError || !blog) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-20 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Article Not Found</h2>
          <p className="text-sm text-slate-500">The requested blog post could not be located or may have been removed.</p>
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A7B5B] text-white rounded-xl text-sm font-semibold hover:bg-[#3d664b] transition-colors"
          >
            Browse All Articles <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link to="/" className="hover:text-[#4A7B5B]">Home</Link>
          <span>/</span>
          <Link to="/blogs" className="hover:text-[#4A7B5B]">Knowledge Hub</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate max-w-xs">{blog.title}</span>
        </nav>

        {/* Article Main Card */}
        <article className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-10">
          {/* Cover Header */}
          <div className="p-6 sm:p-10 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-[#4A7B5B]/10 text-[#4A7B5B] rounded-full text-xs font-bold uppercase tracking-wider">
                {blog.category}
              </span>
              <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5"><Calendar size={13} /> {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : new Date(blog.createdAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1.5"><Clock size={13} /> {blog.readingTime || 5} min read</span>
                <span className="flex items-center gap-1.5"><User size={13} /> {blog.author?.fullName || "Editorial Staff"}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-4">{blog.title}</h1>

            {blog.excerpt && <p className="text-slate-600 text-base leading-relaxed mb-6 font-medium">{blog.excerpt}</p>}

            {/* Engagement & Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => !liked && slug && likeMutation.mutate()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    liked ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <ThumbsUp size={15} className={liked ? "fill-emerald-600" : ""} />
                  <span>{blog.likes || 0} Likes</span>
                </button>
                <button
                  onClick={copyShareLink}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  {copiedLink ? <Check size={15} className="text-emerald-600" /> : <Share2 size={15} />}
                  <span>{copiedLink ? "Link Copied!" : `${blog.shares || 0} Shares`}</span>
                </button>
                <button
                  onClick={handleToggleSave}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isSaved
                      ? "bg-[#4A7B5B] text-white shadow-xs"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                  title={isSaved ? "Remove from bookmarks" : "Save Guide"}
                >
                  {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                  <span>{isSaved ? "Saved" : "Save Guide"}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span>{blog.views || 0} views</span>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          {(blog.featuredImage || blog.thumbnail) && (
            <div className="w-full h-80 sm:h-96 overflow-hidden bg-slate-100">
              <ImageWithFallback
                src={blog.featuredImage || blog.thumbnail}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 sm:p-10 space-y-8">
            {/* TL;DR Box for GEO / AI Quick Answers */}
            {blog.tldr && (
              <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-1.5">
                  <Sparkles size={16} className="text-amber-600" /> AI TL;DR Summary
                </div>
                <p className="text-slate-800 text-xs sm:text-sm leading-relaxed font-medium">{blog.tldr}</p>
              </div>
            )}

            {/* Key Takeaways */}
            {Array.isArray(blog.keyTakeaways) && blog.keyTakeaways.length > 0 && (
              <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#4A7B5B]" /> Key Takeaways
                </h3>
                <ul className="grid sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-700">
                  {blog.keyTakeaways.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4A7B5B] mt-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Formatted HTML Article Content */}
            <div
              className="prose prose-slate max-w-none text-slate-800 text-sm sm:text-base leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />

            {/* FAQs Accordion Section */}
            {Array.isArray(blog.faqs) && blog.faqs.length > 0 && (
              <div className="pt-8 border-t border-slate-100 space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h3>
                <div className="space-y-3">
                  {blog.faqs.map((faq: any, idx: number) => (
                    <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <button
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                        className="w-full p-4 text-left flex justify-between items-center font-bold text-slate-900 text-sm hover:bg-slate-50 transition-colors"
                      >
                        <span>{faq.question}</span>
                        {openFaq === idx ? <ChevronUp size={18} className="text-[#4A7B5B]" /> : <ChevronDown size={18} className="text-slate-400" />}
                      </button>
                      {openFaq === idx && (
                        <div className="p-4 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Knowledge Graph Widget */}
            {(blog.college || blog.course || blog.exam || blog.scholarship) && (
              <div className="p-6 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Explore Related Entities</h4>
                <div className="flex flex-wrap gap-3">
                  {blog.college && (
                    <Link
                      to={`/colleges/${blog.college.id}`}
                      className="px-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 hover:shadow-xs"
                    >
                      <Building2 size={15} /> {blog.college.name}
                    </Link>
                  )}
                  {blog.course && (
                    <Link
                      to="/courses"
                      className="px-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 hover:shadow-xs"
                    >
                      <GraduationCap size={15} /> {blog.course.name}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Related Articles Section */}
        {relatedBlogs.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900">Related Articles & Guides</h2>
              <Link to="/blogs" className="text-xs font-bold text-[#4A7B5B] hover:underline flex items-center gap-1">
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedBlogs.map((rel: any) => (
                <Link
                  key={rel.id}
                  to={`/blog/${rel.slug}`}
                  className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-all flex flex-col"
                >
                  <div className="h-36 overflow-hidden bg-slate-100">
                    <ImageWithFallback
                      src={rel.featuredImage || rel.thumbnail || "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=400&q=80"}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {rel.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#4A7B5B] transition-colors line-clamp-2 mt-1.5">
                        {rel.title}
                      </h4>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100">
                      <span>{rel.readingTime || 5} min read</span>
                      <span className="text-[#4A7B5B] font-semibold flex items-center gap-0.5">Read <ArrowRight size={10} /></span>
                    </div>
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
