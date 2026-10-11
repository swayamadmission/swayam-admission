import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { Shield, Calendar, ArrowLeft, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { LegalUserApi, PublicLegalPolicy } from "../../api/legal.api";

function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function PublicLegalDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<PublicLegalPolicy | null>(null);
  const [allPolicies, setAllPolicies] = useState<PublicLegalPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [fetchedPolicy, publishedList] = await Promise.all([
          slug ? LegalUserApi.getPolicyBySlug(slug) : null,
          LegalUserApi.getPublishedPolicies(),
        ]);

        if (isMounted) {
          setAllPolicies(publishedList);
          if (fetchedPolicy) {
            setPolicy(fetchedPolicy);
          } else if (publishedList.length > 0) {
            setPolicy(publishedList[0]);
          } else {
            setError("Policy document not found.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.message || "Policy document not found.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="h-8 w-8 animate-spin text-[#4A7B5B] mb-3" />
        <p className="text-sm text-[#64748B]">Loading legal document...</p>
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Shield className="mx-auto h-12 w-12 text-[#94A3B8] mb-4" />
        <h1 className="text-2xl font-bold text-[#1E293B]">Policy Not Found</h1>
        <p className="mt-2 text-sm text-[#64748B]">{error || "This document is not currently published."}</p>
        <Link
          to="/policies"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#4A7B5B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#3d654a]"
        >
          <ArrowLeft className="h-4 w-4" /> View All Policies
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2 text-xs text-[#64748B]">
          <Link to="/" className="hover:text-[#4A7B5B] transition">Home</Link>
          <span>/</span>
          <Link to="/policies" className="hover:text-[#4A7B5B] transition">Legal & Policies</Link>
          <span>/</span>
          <span className="font-semibold text-[#1E293B]">{policy.title}</span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Main Policy Content Area */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 md:p-10 shadow-sm">
              {/* Policy Header */}
              <div className="border-b border-[#E2E8F0] pb-6 mb-8">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="rounded-md bg-[#E8F3EC] px-2.5 py-1 font-mono text-xs font-bold text-[#4A7B5B]">
                    {policy.version}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F3EC] px-2.5 py-1 text-xs font-semibold text-[#4A7B5B]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Official Published Policy
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E293B] tracking-tight">
                  {policy.title}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#64748B]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#4A7B5B]" />
                    <span>Effective Date: <strong>{formatDateDDMMYYYY(policy.effectiveDate)}</strong></span>
                  </div>
                  <span>•</span>
                  <span>Brand: <strong>Swayam Admission</strong></span>
                  {policy.publishedAt && (
                    <>
                      <span>•</span>
                      <span>Published: {formatDateDDMMYYYY(policy.publishedAt)}</span>
                    </>
                  )}
                </div>

                {policy.changeSummary && (
                  <div className="mt-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-xs text-[#475569]">
                    <span className="font-semibold text-[#1E293B]">Revision Notes: </span>
                    {policy.changeSummary}
                  </div>
                )}
              </div>

              {/* Sanitize & render HTML body */}
              <div
                className="prose prose-slate max-w-none text-[#334155] leading-relaxed prose-headings:text-[#1E293B] prose-headings:font-bold prose-a:text-[#4A7B5B] prose-table:border prose-th:bg-[#F8FAFC] prose-th:p-2.5 prose-td:p-2.5"
                dangerouslySetInnerHTML={{ __html: policy.content }}
              />
            </div>
          </div>

          {/* Sticky Sidebar with all published policies */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-sm font-bold text-[#1E293B]">
                <FileText className="h-4 w-4 text-[#4A7B5B]" />
                <span>All Legal Documents</span>
              </div>

              <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
                {allPolicies.map((p) => {
                  const isActive = p.slug === slug || p.id === policy.id;
                  return (
                    <Link
                      key={p.id}
                      to={`/policies/${p.slug}`}
                      className={`block rounded-xl px-3 py-2 text-xs transition ${
                        isActive
                          ? "bg-[#E8F3EC] font-bold text-[#4A7B5B]"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
                      }`}
                    >
                      <div className="truncate">{p.title}</div>
                      <span className="font-mono text-[10px] text-[#94A3B8]">{p.version}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-[#E2E8F0] pt-4 text-xs text-[#64748B]">
                <p className="mb-2">Need legal grievance assistance?</p>
                <Link
                  to="/policies#grievance"
                  className="font-semibold text-[#4A7B5B] hover:underline"
                >
                  File a Grievance →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
