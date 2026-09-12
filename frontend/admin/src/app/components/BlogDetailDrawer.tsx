import { useState } from "react";
import { X, Eye, ThumbsUp, Share2, Clock, Globe, FileText, Calendar, CheckCircle2, AlertCircle, Copy, Code, History, RotateCcw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { blogsApi } from "../../api/blogs.api";

interface BlogDetailDrawerProps {
  blogId: string | null;
  onClose: () => void;
  onEdit: (blog: any) => void;
}

export default function BlogDetailDrawer({ blogId, onClose, onEdit }: BlogDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "content" | "seo" | "schema" | "revisions">("overview");
  const [copiedSchema, setCopiedSchema] = useState(false);

  const { data: blogRes, isLoading } = useQuery({
    queryKey: ["admin_blog_detail", blogId],
    queryFn: () => (blogId ? blogsApi.findById(blogId) : null),
    enabled: !!blogId,
  });

  const { data: revisionsRes } = useQuery({
    queryKey: ["admin_blog_revisions", blogId],
    queryFn: () => (blogId ? blogsApi.getRevisions(blogId) : null),
    enabled: !!blogId,
  });

  const rollbackMutation = useMutation({
    mutationFn: (revisionId: string) => (blogId ? blogsApi.rollbackRevision(blogId, revisionId) : Promise.reject()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_blog_detail", blogId] });
      queryClient.invalidateQueries({ queryKey: ["admin_blogs"] });
      alert("Successfully rolled back to selected revision!");
    },
  });

  if (!blogId) return null;
  const blog = blogRes?.data;
  const revisions = revisionsRes?.data || [];

  const schemaOrgJson = blog
    ? JSON.stringify(
        [
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: blog.seoTitle || blog.title,
            description: blog.seoDescription || blog.excerpt,
            url: `https://swayamadmission.org/blog/${blog.slug}`,
            datePublished: blog.publishedAt || blog.createdAt,
            author: { "@type": "Person", name: blog.author?.fullName || "Editorial Team" },
          },
          ...(Array.isArray(blog.faqs) && blog.faqs.length > 0
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: blog.faqs.map((f: any) => ({
                    "@type": "Question",
                    name: f.question,
                    acceptedAnswer: { "@type": "Answer", text: f.answer },
                  })),
                },
              ]
            : []),
        ],
        null,
        2
      )
    : "";

  const copySchemaToClipboard = () => {
    navigator.clipboard.writeText(schemaOrgJson);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Article Inspection & GEO Audit</span>
            <h2 className="text-lg font-bold text-gray-900 truncate max-w-md mt-0.5">{isLoading ? "Loading..." : blog?.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {isLoading || !blog ? (
          <div className="flex-1 flex items-center justify-center py-20 text-gray-400">Loading article breakdown...</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Cover Banner & Meta */}
            <div className="relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 h-44">
              <img
                src={blog.featuredImage || blog.thumbnail || "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=800&q=80"}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 flex flex-col justify-end">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">{blog.category}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      blog.status === "PUBLISHED" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                    }`}
                  >
                    {blog.status}
                  </span>
                </div>
                <div className="text-xs text-white/80 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(blog.createdAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {blog.readingTime || 5} min read</span>
                  <span>Author: {blog.author?.fullName || "Editorial Staff"}</span>
                </div>
              </div>
            </div>

            {/* Engagement Metrics */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-center">
                <Eye className="mx-auto text-blue-600 mb-1" size={16} />
                <div className="text-lg font-bold text-gray-900">{blog.views || 0}</div>
                <div className="text-[11px] text-gray-500 font-medium">Views</div>
              </div>
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                <ThumbsUp className="mx-auto text-emerald-600 mb-1" size={16} />
                <div className="text-lg font-bold text-gray-900">{blog.likes || 0}</div>
                <div className="text-[11px] text-gray-500 font-medium">Likes</div>
              </div>
              <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl text-center">
                <Share2 className="mx-auto text-purple-600 mb-1" size={16} />
                <div className="text-lg font-bold text-gray-900">{blog.shares || 0}</div>
                <div className="text-[11px] text-gray-500 font-medium">Shares</div>
              </div>
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-center">
                <Globe className="mx-auto text-amber-600 mb-1" size={16} />
                <div className="text-lg font-bold text-gray-900">{blog.geoScore || 80}/100</div>
                <div className="text-[11px] text-gray-500 font-medium">GEO Score</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Overview & Scores
              </button>
              <button
                onClick={() => setActiveTab("content")}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "content" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Content Preview
              </button>
              <button
                onClick={() => setActiveTab("seo")}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "seo" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                SEO & OpenGraph
              </button>
              <button
                onClick={() => setActiveTab("schema")}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "schema" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                JSON-LD Schema
              </button>
              <button
                onClick={() => setActiveTab("revisions")}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "revisions" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Revisions ({revisions.length})
              </button>
            </div>

            {/* TAB 1: OVERVIEW & SCORES */}
            {activeTab === "overview" && (
              <div className="space-y-5">
                {/* AI & GEO Content Scores */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Search Readiness Scores</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                        <span>Readability Score</span>
                        <span className="font-bold text-slate-900">{blog.readabilityScore || 85}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${blog.readabilityScore || 85}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                        <span>SEO Optimization</span>
                        <span className="font-bold text-slate-900">{blog.seoScore || 80}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${blog.seoScore || 80}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                        <span>Generative Engine Score</span>
                        <span className="font-bold text-slate-900">{blog.geoScore || 80}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-full rounded-full" style={{ width: `${blog.geoScore || 80}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                        <span>AI Readiness Index</span>
                        <span className="font-bold text-slate-900">{blog.aiReadinessScore || 80}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-600 h-full rounded-full" style={{ width: `${blog.aiReadinessScore || 80}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Checklist */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">GEO & SEO Compliance Checklist</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    {blog.seoTitle ? <CheckCircle2 className="text-emerald-500 shrink-0" size={16} /> : <AlertCircle className="text-amber-500 shrink-0" size={16} />}
                    <span>Meta Title & Description present</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    {Array.isArray(blog.faqs) && blog.faqs.length > 0 ? <CheckCircle2 className="text-emerald-500 shrink-0" size={16} /> : <AlertCircle className="text-amber-500 shrink-0" size={16} />}
                    <span>FAQ structured questions included ({blog.faqs?.length || 0})</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    {Array.isArray(blog.keyTakeaways) && blog.keyTakeaways.length > 0 ? <CheckCircle2 className="text-emerald-500 shrink-0" size={16} /> : <AlertCircle className="text-amber-500 shrink-0" size={16} />}
                    <span>Key Takeaways bullet points included</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    {blog.aiSummary || blog.tldr ? <CheckCircle2 className="text-emerald-500 shrink-0" size={16} /> : <AlertCircle className="text-amber-500 shrink-0" size={16} />}
                    <span>AI TL;DR Summary block generated</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CONTENT PREVIEW */}
            {activeTab === "content" && (
              <div className="space-y-4">
                {blog.tldr && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                    <div className="font-bold mb-1">TL;DR Summary</div>
                    <div>{blog.tldr}</div>
                  </div>
                )}
                {Array.isArray(blog.keyTakeaways) && blog.keyTakeaways.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                    <div className="text-xs font-bold text-blue-900 mb-2">Key Takeaways</div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-blue-950">
                      {blog.keyTakeaways.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="prose prose-sm max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: blog.content }} />
              </div>
            )}

            {/* TAB 3: SEO */}
            {activeTab === "seo" && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-gray-400 font-medium mb-1">SEO Title</div>
                  <div className="font-semibold text-gray-900">{blog.seoTitle || blog.title}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-gray-400 font-medium mb-1">Meta Description</div>
                  <div className="text-gray-800">{blog.seoDescription || blog.excerpt || "N/A"}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-gray-400 font-medium mb-1">Canonical URL</div>
                  <div className="text-blue-600 truncate">{blog.canonicalUrl || `https://swayamadmission.org/blog/${blog.slug}`}</div>
                </div>
              </div>
            )}

            {/* TAB 4: JSON-LD SCHEMA */}
            {activeTab === "schema" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Auto-Generated Schema.org JSON-LD</span>
                  <button
                    onClick={copySchemaToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                  >
                    {copiedSchema ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copiedSchema ? "Copied!" : "Copy JSON-LD"}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-80">{schemaOrgJson}</pre>
              </div>
            )}

            {/* TAB 5: REVISIONS */}
            {activeTab === "revisions" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Version History ({revisions.length})</h4>
                {revisions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">No prior revisions recorded.</div>
                ) : (
                  <div className="space-y-2">
                    {revisions.map((rev: any) => (
                      <div key={rev.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-gray-900">Version #{rev.versionNumber}</div>
                          <div className="text-[11px] text-gray-500">{new Date(rev.createdAt).toLocaleString()}</div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Rollback to Version #${rev.versionNumber}?`)) {
                              rollbackMutation.mutate(rev.id);
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                        >
                          <RotateCcw size={12} /> Rollback
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Drawer Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
          <button onClick={() => onEdit(blog)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-colors">
            Edit Article
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-xl transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
