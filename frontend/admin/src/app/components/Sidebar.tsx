import { useState } from "react";
import {
  LayoutDashboard, Users, UserCheck, GraduationCap, Building2, BookOpen,
  FileText, FolderOpen, Trophy, Library, Rss, Brain, Bell, BarChart3,
  Megaphone, CreditCard, Settings, Shield, Activity, ChevronLeft, ChevronRight,
  X, LogOut, ChevronDown, Star, HelpCircle, Award, CheckCircle2, Gift, Tag, MapPin
} from "lucide-react";
import saLogo from "../../assets/SA_logo-removebg-preview.png";

import { usePermissions } from "../../hooks/usePermissions";

export type Page =
  | "dashboard" | "leads" | "tasks" | "students" | "counselors" | "staff-onboarding" | "colleges" | "college-portal" | "courses"
  | "applications" | "reporting" | "review-moderation" | "college-rankings" | "documents" | "states" | "exams" | "scholarships" | "materials"
  | "blogs" | "faqs" | "ai" | "notifications" | "analytics" | "marketing" | "payments" | "referrals" | "coupons" | "fee-catalog"
  | "settings" | "rbac" | "organization" | "logs" | "support" | "help-support" | "profile";

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  user: { name: string; role: string; email: string };
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const itemPermissions: Record<string, string> = {
  dashboard: "dashboard.view",
  leads: "lead.view",
  tasks: "lead.view",
  students: "student.view",
  referrals: "lead.view",
  counselors: "counselor.view",
  "staff-onboarding": "staff.onboard.view",
  applications: "application.view",
  reporting: "application.view",
  "review-moderation": "roles.view",
  "college-rankings": "college.view",
  colleges: "college.view",
  "college-portal": "college.view",
  courses: "course.view",
  states: "organization.view",
  exams: "exam.view",
  scholarships: "scholarship.view",
  materials: "material.view",
  blogs: "blog.view",
  faqs: "blog.view",
  documents: "document.view",
  ai: "ai.view",
  analytics: "analytics.view",
  marketing: "marketing.view",
  notifications: "notification.view",
  payments: "payment.view",
  coupons: "payment.view",
  rbac: "roles.view",
  organization: "organization.view",
  settings: "settings.view",
  logs: "logs.view",
  support: "dashboard.view",
  profile: "dashboard.view",
};

interface NavItem {
  id: Page;
  label: string;
  icon: any;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [

  {
    label: "Overview",
    items: [
      { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    label: "CRM & Staff",
    items: [
      { id: "leads" as Page, label: "Leads", icon: Users },
      { id: "tasks" as Page, label: "Tasks & Follow-ups", icon: CheckCircle2 },
      { id: "students" as Page, label: "Students", icon: GraduationCap },
      { id: "referrals" as Page, label: "Student Referrals & Rewards", icon: Gift },
      { id: "counselors" as Page, label: "Counselors", icon: UserCheck },
      { id: "staff-onboarding" as Page, label: "Staff Onboarding & KYC", icon: Shield },
      { id: "applications" as Page, label: "Applications", icon: FileText },
      { id: "reporting" as Page, label: "Reporting & Enrollment", icon: Award },
      { id: "review-moderation" as Page, label: "Reviews & Moderation", icon: Shield },
    ]
  },
  {
    label: "Academic & Partner Portal",
    items: [
      { id: "college-portal" as Page, label: "College Partner Portal", icon: Building2 },
      { id: "college-rankings" as Page, label: "College Rankings Engine", icon: Trophy },
      { id: "colleges" as Page, label: "Colleges Directory", icon: Building2 },
      { id: "courses" as Page, label: "Course Catalog", icon: BookOpen },
      { id: "states" as Page, label: "State Management", icon: MapPin },
      { id: "exams" as Page, label: "Exams", icon: Trophy },
      { id: "scholarships" as Page, label: "Scholarships", icon: Star },
      { id: "materials" as Page, label: "Study Materials", icon: Library },
    ]
  },
  {
    label: "Content",
    items: [
      { id: "blogs" as Page, label: "Career & Admission Guides / CMS", icon: Rss },
      { id: "faqs" as Page, label: "FAQs", icon: FileText },
      { id: "documents" as Page, label: "Documents", icon: FolderOpen },
    ]
  },
  {
    label: "Intelligence",
    items: [
      { id: "ai" as Page, label: "AI Counselor", icon: Brain },
      { id: "analytics" as Page, label: "Reports & Analytics", icon: BarChart3 },
      { id: "marketing" as Page, label: "Marketing", icon: Megaphone },
    ]
  },
  {
    label: "Operations",
    items: [
      { id: "notifications" as Page, label: "Notifications", icon: Bell },
      { id: "payments" as Page, label: "Payments", icon: CreditCard },
      { id: "fee-catalog" as Page, label: "Fee Catalog", icon: CreditCard },
      { id: "coupons" as Page, label: "Coupons & Discounts", icon: Tag },
      { id: "support" as Page, label: "Help & Support", icon: HelpCircle },
    ]
  },
  {
    label: "System",
    items: [
      { id: "organization" as Page, label: "Organization Structure", icon: Building2 },
      { id: "rbac" as Page, label: "Roles & Permissions", icon: Shield },
      { id: "settings" as Page, label: "Settings", icon: Settings },
      { id: "logs" as Page, label: "Activity Logs", icon: Activity },
    ]
  },
];

export default function Sidebar({ currentPage, onPageChange, user, onLogout, mobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const { hasPermission } = usePermissions();

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const roleColors: Record<string, string> = {
    "Super Admin": "#4A7B5B",
    "Director": "#7C3AED",
    "CFO": "#D97706",
    "State Manager": "#0EA5E9",
    "Senior Counselor": "#F0AE1A",
    "Counselor": "#64748B",
    "Finance": "#F0AE1A",
    "Support": "#64748B",
  };

  const roleColor = roleColors[user.role] || "#4A7B5B";

  const sidebarContent = (
    <div
      className="flex flex-col h-full"
      style={{ background: "#FFFFFF", borderRight: "1px solid #F1F5F9" }}
    >
      {/* Logo area */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#F1F5F9]" style={{ minHeight: "64px" }}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: "#E8F3EC" }}>
              <img src={saLogo} alt="SA" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <div className="text-[#4A7B5B] font-semibold text-sm leading-tight">Swayam</div>
              <div className="text-[#94A3B8] text-xs leading-tight">Admission CRM</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg overflow-hidden mx-auto" style={{ background: "#E8F3EC" }}>
            <img src={saLogo} alt="SA" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="flex items-center gap-1">
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] transition-colors text-[#94A3B8]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-[#F8FAFC] transition-colors text-[#94A3B8]"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        {navGroups.map(group => {
          const visibleItems = group.items.filter(item => {
            const requiredPerm = itemPermissions[item.id];
            return !requiredPerm || hasPermission(requiredPerm);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="mb-1">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-2 py-1 mb-0.5"
                >
                  <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest">
                    {group.label}
                  </span>
                  <ChevronDown
                    className="w-3 h-3 text-[#CBD5E1] transition-transform"
                    style={{ transform: collapsedGroups.has(group.label) ? "rotate(-90deg)" : "rotate(0deg)" }}
                  />
                </button>
              )}

              {!collapsedGroups.has(group.label) && visibleItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onPageChange(item.id);
                      onMobileClose?.();
                    }}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg mb-0.5 transition-all group"
                    style={{
                      background: isActive ? "#E8F3EC" : "transparent",
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className="w-4 h-4 shrink-0 transition-colors"
                      style={{ color: isActive ? "#4A7B5B" : "#94A3B8" }}
                    />
                    {!collapsed && (
                      <>
                        <span
                          className="flex-1 text-left text-sm transition-colors"
                          style={{
                            color: isActive ? "#4A7B5B" : "#475569",
                            fontWeight: isActive ? 500 : 400
                          }}
                        >
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: "#FEF3C7", color: "#D97706" }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && item.badge && (
                      <div className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-[#F0AE1A]" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User profile */}
      <div className="border-t border-[#F1F5F9] px-3 py-3">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
              style={{ background: roleColor }}
            >
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[#4A7B5B] text-sm font-medium truncate">{user.name}</div>
              <div className="text-[#94A3B8] text-xs truncate">{user.role}</div>
            </div>
            <button
              onClick={onLogout}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#FEE2E2] transition-colors"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5 text-[#94A3B8] hover:text-[#EF4444]" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: roleColor }}
            >
              {user.name.charAt(0)}
            </div>
            <button
              onClick={onLogout}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#FEE2E2] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className="hidden lg:flex flex-col h-full transition-all duration-300"
        style={{ width: collapsed ? "64px" : "240px", minWidth: collapsed ? "64px" : "240px" }}
      >
        {sidebarContent}
      </div>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div className="relative z-10 w-64 h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
