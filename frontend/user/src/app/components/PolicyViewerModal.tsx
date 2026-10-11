import { useState, useEffect } from "react";
import { X, Shield, Calendar, Loader2 } from "lucide-react";
import { LegalUserApi, PublicLegalPolicy } from "../../api/legal.api";

interface PolicyViewerModalProps {
  slug?: string;
  policyType?: string;
  initialPolicy?: PublicLegalPolicy | null;
  isOpen?: boolean;
  onClose: () => void;
}

function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function PolicyViewerModal({
  slug,
  policyType,
  initialPolicy,
  isOpen = true,
  onClose,
}: PolicyViewerModalProps) {
  const [policy, setPolicy] = useState<PublicLegalPolicy | null>(initialPolicy || null);
  const [loading, setLoading] = useState<boolean>(!initialPolicy && (!!slug || !!policyType));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialPolicy) {
      setPolicy(initialPolicy);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadPolicy() {
      setLoading(true);
      setError(null);
      try {
        if (slug) {
          const fetched = await LegalUserApi.getPolicyBySlug(slug);
          if (isMounted) setPolicy(fetched);
        } else if (policyType) {
          const all = await LegalUserApi.getPublishedPolicies();
          const matched = all.find((p) => p.policyType === policyType);
          if (isMounted) {
            if (matched) setPolicy(matched);
            else setError("Policy document not currently available.");
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.response?.data?.message || "Failed to load policy.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPolicy();

    return () => {
      isMounted = false;
    };
  }, [isOpen, slug, policyType, initialPolicy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all animate-fadeIn">
      <div className="flex h-[88vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl border border-[#E2E8F0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F3EC] text-[#4A7B5B]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#4A7B5B]">
                  {policy?.version || "Current Version"}
                </span>
                <span className="rounded bg-[#E8F3EC] px-2 py-0.5 text-[10px] font-bold text-[#4A7B5B]">
                  OFFICIAL POLICY
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#1E293B]">
                {policy?.title || "Legal Policy"}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#1E293B] transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Subheader info bar */}
        {policy && (
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-2.5 text-xs text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#4A7B5B]" />
              <span>Effective Date: <strong>{formatDateDDMMYYYY(policy.effectiveDate)}</strong></span>
            </div>
            <span className="font-medium text-[#4A7B5B]">Swayam Admission Platform</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#4A7B5B] mb-3" />
              <p className="text-sm text-[#64748B]">Loading published legal document...</p>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-20">
              <div className="rounded-full bg-[#FEE2E2] p-3 text-[#DC2626] mb-3">
                <X className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-[#1E293B]">Document Unavailable</h3>
              <p className="mt-1 text-sm text-[#64748B]">{error}</p>
            </div>
          ) : policy ? (
            <div
              className="prose prose-slate max-w-none text-[#334155] leading-relaxed text-sm md:text-base prose-headings:text-[#1E293B] prose-a:text-[#4A7B5B] prose-a:font-semibold hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: policy.content }}
            />
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-3.5">
          <p className="text-xs text-[#94A3B8]">
            Reviewing this document will not reset or close your ongoing form.
          </p>
          <button
            onClick={onClose}
            className="rounded-xl bg-[#4A7B5B] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d654a] transition"
          >
            Close & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
