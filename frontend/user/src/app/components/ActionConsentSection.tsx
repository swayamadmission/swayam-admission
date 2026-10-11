import { useState, useEffect } from "react";
import { Shield, ExternalLink, Loader2 } from "lucide-react";
import { LegalUserApi, ActionPolicyRequirement } from "../../api/legal.api";
import PolicyViewerModal from "./PolicyViewerModal";

export interface AcceptedPolicyPayload {
  policyId: string;
  policyType: string;
  policyVersion: string;
}

interface ActionConsentSectionProps {
  actionType: string;
  onChange?: (isValid: boolean, acceptedPolicies: AcceptedPolicyPayload[]) => void;
  className?: string;
  // Optional pre-selected flags for backwards compatibility
  initialChecked?: boolean;
}

export default function ActionConsentSection({
  actionType,
  onChange,
  className = "",
  initialChecked = false,
}: ActionConsentSectionProps) {
  const [requirements, setRequirements] = useState<ActionPolicyRequirement[]>([]);
  const [isMandatory, setIsMandatory] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [acceptedTypes, setAcceptedTypes] = useState<Set<string>>(new Set());
  const [activeViewingPolicy, setActiveViewingPolicy] = useState<ActionPolicyRequirement | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadRequirements() {
      try {
        setLoading(true);
        const req = await LegalUserApi.getActionRequirements(actionType);
        if (isMounted) {
          setRequirements(req.policies || []);
          setIsMandatory(req.isMandatory);
          if (initialChecked && req.policies) {
            const allTypes = new Set(req.policies.map((p) => p.policyType));
            setAcceptedTypes(allTypes);
          }
        }
      } catch {
        if (isMounted) {
          setRequirements([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRequirements();

    return () => {
      isMounted = false;
    };
  }, [actionType]);

  useEffect(() => {
    if (requirements.length === 0) {
      onChange?.(true, []);
      return;
    }

    const allChecked = requirements.every((r) => acceptedTypes.has(r.policyType));
    const payload: AcceptedPolicyPayload[] = requirements
      .filter((r) => acceptedTypes.has(r.policyType))
      .map((r) => ({
        policyId: r.id,
        policyType: r.policyType,
        policyVersion: r.version,
      }));

    onChange?.(allChecked || !isMandatory, payload);
  }, [acceptedTypes, requirements, isMandatory]);

  const togglePolicy = (policyType: string) => {
    setAcceptedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(policyType)) next.delete(policyType);
      else next.add(policyType);
      return next;
    });
  };

  const toggleAll = () => {
    if (acceptedTypes.size === requirements.length) {
      setAcceptedTypes(new Set());
    } else {
      setAcceptedTypes(new Set(requirements.map((r) => r.policyType)));
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 py-2 text-xs text-[#64748B] ${className}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4A7B5B]" />
        <span>Loading terms and legal conditions...</span>
      </div>
    );
  }

  if (requirements.length === 0) {
    return null;
  }

  // If there are multiple policies (e.g. 2 or 3), render each clean checkbox with clickable policy name
  return (
    <div className={`space-y-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs text-[#334155] ${className}`}>
      <div className="flex items-center justify-between pb-1 text-[11px] font-semibold text-[#64748B]">
        <div className="flex items-center gap-1.5 text-[#4A7B5B]">
          <Shield className="h-3.5 w-3.5" />
          <span>Legal Consent & Disclaimers</span>
        </div>
        {requirements.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-[11px] text-[#4A7B5B] hover:underline font-medium"
          >
            {acceptedTypes.size === requirements.length ? "Deselect All" : "Accept All"}
          </button>
        )}
      </div>

      {requirements.map((req) => {
        const isChecked = acceptedTypes.has(req.policyType);

        return (
          <div key={req.id} className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id={`consent-${actionType}-${req.policyType}`}
              checked={isChecked}
              onChange={() => togglePolicy(req.policyType)}
              className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] text-[#4A7B5B] focus:ring-[#4A7B5B] cursor-pointer"
            />
            <label
              htmlFor={`consent-${actionType}-${req.policyType}`}
              className="flex-1 leading-snug cursor-pointer select-none"
            >
              <span>I agree to the </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveViewingPolicy(req);
                }}
                className="inline-flex items-center gap-0.5 font-semibold text-[#4A7B5B] underline hover:text-[#3d654a] transition"
              >
                <span>{req.title}</span>
                <ExternalLink className="h-2.5 w-2.5 inline" />
              </button>
              <span className="text-[#94A3B8] ml-1 font-mono text-[10px]">({req.version})</span>
            </label>
          </div>
        );
      })}

      {/* Standalone Policy Viewer Modal */}
      {activeViewingPolicy && (
        <PolicyViewerModal
          slug={activeViewingPolicy.slug}
          policyType={activeViewingPolicy.policyType}
          isOpen={!!activeViewingPolicy}
          onClose={() => setActiveViewingPolicy(null)}
        />
      )}
    </div>
  );
}
