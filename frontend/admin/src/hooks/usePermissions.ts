import { useAdminAuth } from "../context/AuthContext";

const MODULE_ALIASES: Record<string, string[]> = {
  leads: ["lead", "leads"],
  tasks: ["task", "tasks", "followups", "follow-ups"],
  students: ["student", "students"],
  counselors: ["counselor", "counselors"],
  "staff-onboarding": ["staff", "staff.onboard", "staff-onboarding", "onboarding"],
  applications: ["application", "applications"],
  reporting: ["reporting", "enrollment"],
  reviews: ["review", "reviews", "moderation", "review-moderation"],
  "success-stories": ["stories", "success-stories", "testimonials"],
  "college-portal": ["college", "college-portal", "partners"],
  "college-rankings": ["ranking", "rankings", "college-rankings"],
  colleges: ["college", "colleges"],
  courses: ["course", "courses"],
  states: ["state", "states"],
  exams: ["exam", "exams"],
  scholarships: ["scholarship", "scholarships"],
  "study-materials": ["study", "materials", "study-materials"],
  guides: ["guide", "guides", "cms", "blogs"],
  faqs: ["faq", "faqs"],
  documents: ["document", "documents"],
  "ai-counselor": ["ai", "ai-counselor"],
  analytics: ["report", "reports", "analytics"],
  marketing: ["marketing", "campaigns"],
  notifications: ["notification", "notifications"],
  payments: ["payment", "payments", "fee", "fees"],
  "fee-catalog": ["fee-catalog", "fee", "fees"],
  coupons: ["coupon", "coupons", "discounts"],
  support: ["support", "help", "help-support"],
  contacts: ["contact", "contacts", "contact-management"],
  organization: ["organization", "org"],
  roles: ["roles", "rbac"],
  settings: ["settings", "config"],
  logs: ["logs", "audit"],
};

function matchesPermission(heldCode: string, targetCode: string): boolean {
  if (heldCode === targetCode) return true;
  const heldParts = heldCode.split(".");
  const targetParts = targetCode.split(".");
  if (heldParts.length < 2 || targetParts.length < 2) return false;

  const heldAct = heldParts[heldParts.length - 1];
  const targetAct = targetParts[targetParts.length - 1];
  if (heldAct !== targetAct && heldAct !== "*" && targetAct !== "*") return false;

  const heldMod = heldParts.slice(0, heldParts.length - 1).join(".");
  const targetMod = targetParts.slice(0, targetParts.length - 1).join(".");
  if (heldMod === targetMod) return true;

  for (const aliases of Object.values(MODULE_ALIASES)) {
    if (aliases.includes(heldMod) && aliases.includes(targetMod)) {
      return true;
    }
  }

  return false;
}

export function usePermissions() {
  const { user } = useAdminAuth();

  const isSuperAdmin = !!(user?.isSuperAdmin || user?.role === "SUPER_ADMIN");

  const effectivePermissions: string[] = user?.effectivePermissions || [];
  const dataScopes: string[] = user?.dataScopes || [];
  const roles = user?.roles || [];

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return effectivePermissions.some((held) => matchesPermission(held, permissionCode));
  };

  const hasAnyPermission = (permissionCodes: string[]): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissionCodes.some((code) => hasPermission(code));
  };

  const hasAllPermissions = (permissionCodes: string[]): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissionCodes.every((code) => hasPermission(code));
  };

  const hasDataScope = (scope: string): boolean => {
    if (isSuperAdmin || dataScopes.includes("GLOBAL")) return true;
    return dataScopes.includes(scope);
  };

  return {
    user,
    roles,
    isSuperAdmin,
    effectivePermissions,
    dataScopes,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasDataScope,
    role: roles[0]?.name || user?.role || "GUEST",
  };
}
