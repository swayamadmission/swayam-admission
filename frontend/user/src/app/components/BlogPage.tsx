import React, { useState } from "react";
import { Link } from "react-router";
import { Search, Clock, ArrowRight, TrendingUp, BookOpen, Award, GraduationCap, Newspaper, Eye, ThumbsUp } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useQuery } from "@tanstack/react-query";
import { blogsApi, PublicBlogQueryParams } from "../../api/blogs.api";
import { useDebounce } from "../../hooks/useDebounce";
import { formatIndianDate } from "../../utils/date.utils";

const CATEGORIES = [
  { id: "all", label: "All Articles", icon: Newspaper },
  { id: "engineering", label: "Engineering", icon: BookOpen },
  { id: "mba", label: "MBA", icon: TrendingUp },
  { id: "scholarships", label: "Scholarships", icon: Award },
  { id: "admission tips", label: "Admission Tips", icon: GraduationCap },
  { id: "Research & Rankings", label: "Research & Rankings", icon: Award },
];

const getCategoryColor = (category: string) => {
  switch (category?.toLowerCase()) {
    case "engineering": return "#3B82F6";
    case "mba": return "#8B5CF6";
    case "scholarships":
    case "scholarship": return "#10B981";
    case "admission tips":
    case "admission": return "#F97316";
    case "research & rankings":
    case "rankings":
    case "research": return "#4A7B5B";
    default: return "#3B82F6";
  }
};

const TRENDING = [
  "Top B.Tech Colleges in Delhi NCR 2026",
  "MBA vs PGDM: What's the Difference?",
  "UP State Scholarship 2026 Last Date",
  "How to Apply for NIT After JEE Main",
  "Chandigarh University vs LPU: Comparison",
];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search, 500);

  const queryParams: PublicBlogQueryParams = { limit: 20 };
  if (debouncedSearch) queryParams.q = debouncedSearch;
  if (activeCategory !== "all") queryParams.category = activeCategory;

  const { data: blogsRes, isLoading } = useQuery({
    queryKey: ["public_blogs", queryParams],
    queryFn: () => blogsApi.findPublic(queryParams),
  });

  const blogs = blogsRes?.data?.data || [];
  const featured = blogs.length > 0 ? blogs[0] : null;
  const rest = blogs.length > 0 ? blogs.slice(1) : [];

  return (
    <div style={{ backgroundColor: "#F8FAFC" }} className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="mb-2" style={{ fontSize: "12px", fontWeight: 600, color: "#4A7B5B" }}>
              Knowledge Hub & AI Search Engine
            </div>
            <h1 className="mb-2" style={{ fontWeight: 800, color: "#4A7B5B", fontSize: "clamp(24px,4vw,36px)" }}>
              Blogs, Articles & Admission News
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b" }}>
              Latest news, guides, and AI-optimized insights on college admissions, scholarships, and career planning
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/rankings"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs"
              style={{ backgroundColor: "#4A7B5B" }}
            >
              <Award size={15} className="text-[#F0AE1A]" /> View Official Rankings
            </Link>
            <Link
              to="/rankings"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all"
              style={{ borderColor: "#4A7B5B", color: "#4A7B5B", backgroundColor: "#E8F3EC" }}
            >
              <BookOpen size={15} /> Research Hub
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Featured Post */}
        {featured && (
          <div className="mb-8">
            <Link
              to={`/blog/${featured.slug}`}
              className="group block bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all"
            >
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/2 h-64 md:h-auto overflow-hidden bg-slate-100">
                  <ImageWithFallback
                    src={featured.featuredImage || featured.thumbnail || "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=600&q=80"}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="md:w-1/2 p-7 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="px-2.5 py-1 rounded-full text-white"
                      style={{ fontSize: "10px", fontWeight: 700, backgroundColor: getCategoryColor(featured.category || "") }}
                    >
                      {featured.category || "General"}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#F0AE1A] text-white" style={{ fontSize: "10px", fontWeight: 700 }}>
                      Featured Article
                    </span>
                  </div>
                  <h2
                    className="mb-3 group-hover:text-[#4A7B5B] transition-colors"
                    style={{ fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 800, color: "#4A7B5B", lineHeight: 1.3 }}
                  >
                    {featured.title}
                  </h2>
                  <p className="mb-4 line-clamp-3" style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.7 }}>
                    {featured.excerpt || (featured as any).tldr}
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3" style={{ fontSize: "12px", color: "#94a3b8" }}>
                      <span>{featured.publishedAt ? formatIndianDate(featured.publishedAt) : "Recent"}</span>
                      <span>·</span>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {featured.readingTime || 5} min read
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#4A7B5B]" style={{ fontSize: "13px", fontWeight: 600 }}>
                      Read Article <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-7">
          {/* Articles */}
          <div className="flex-1 min-w-0">
            {/* Search + categories */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-xs">
                <Search size={15} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search articles by title or keyword..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm whitespace-nowrap shrink-0 transition-all ${
                    activeCategory === cat.id
                      ? "bg-[#4A7B5B] text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-[#4A7B5B]/40"
                  }`}
                  style={{ fontWeight: activeCategory === cat.id ? 600 : 400 }}
                >
                  <cat.icon size={13} />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Blog grid */}
            <div className="grid sm:grid-cols-2 gap-5">
              {isLoading && <div className="col-span-2 text-center py-16 text-gray-500 text-sm">Loading articles...</div>}

              {!isLoading &&
                rest.map((blog: any) => (
                  <Link
                    key={blog.id}
                    to={`/blog/${blog.slug}`}
                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-44 overflow-hidden bg-slate-100">
                        <ImageWithFallback
                          src={blog.featuredImage || blog.thumbnail || "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=600&q=80"}
                          alt={blog.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-white"
                            style={{ fontSize: "10px", fontWeight: 600, backgroundColor: getCategoryColor(blog.category) }}
                          >
                            {blog.category || "General"}
                          </span>
                          <span className="flex items-center gap-1 text-gray-400" style={{ fontSize: "11px" }}>
                            <Clock size={10} />
                            {blog.readingTime || 5} min read
                          </span>
                        </div>
                        <h3
                          className="group-hover:text-[#4A7B5B] transition-colors leading-snug mb-2 line-clamp-2"
                          style={{ fontSize: "14px", fontWeight: 700, color: "#4A7B5B" }}
                        >
                          {blog.title}
                        </h3>
                        <p className="mb-3 line-clamp-2" style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
                          {blog.excerpt || (blog as any).tldr}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-0 flex items-center justify-between text-slate-400 text-[11px]">
                      <span>{blog.publishedAt ? formatIndianDate(blog.publishedAt) : "Recent"}</span>
                      <span className="flex items-center gap-1 text-[#4A7B5B]" style={{ fontSize: "11px", fontWeight: 600 }}>
                        Read Article <ArrowRight size={11} />
                      </span>
                    </div>
                  </Link>
                ))}

              {!isLoading && blogs.length === 0 && (
                <div className="sm:col-span-2 text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <Newspaper size={40} className="text-gray-300 mx-auto mb-3" />
                  <p style={{ fontSize: "15px", color: "#94a3b8" }}>No articles found. Try a different search term or category.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-64 space-y-5 shrink-0">
            {/* Trending */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-[#4A7B5B]" />
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#4A7B5B" }}>Trending Topics</h3>
              </div>
              <div className="space-y-3">
                {TRENDING.map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5 group cursor-pointer">
                    <span
                      className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#E8F3EC] flex items-center justify-center"
                      style={{ fontSize: "9px", fontWeight: 800, color: "#4A7B5B" }}
                    >
                      {i + 1}
                    </span>
                    <span className="group-hover:text-[#4A7B5B] transition-colors leading-snug" style={{ fontSize: "12px", color: "#374151" }}>
                      {t}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div className="bg-gradient-to-br from-[#4A7B5B] to-[#2d5e3f] rounded-2xl p-5 shadow-sm text-white">
              <h3 className="mb-2" style={{ fontSize: "15px", fontWeight: 700 }}>
                Get Admission Alerts
              </h3>
              <p className="text-white/80 mb-4" style={{ fontSize: "12px", lineHeight: 1.6 }}>
                Deadlines, scholarships, and exam news directly in your inbox.
              </p>
              <input
                type="email"
                placeholder="Your email address"
                className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-xl text-white text-xs placeholder:text-white/60 focus:outline-none mb-2.5"
              />
              <button className="w-full py-2 bg-[#F0AE1A] hover:bg-[#d99b16] text-white rounded-xl font-semibold text-xs transition-colors">
                Subscribe Free
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
