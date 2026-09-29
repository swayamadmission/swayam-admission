import { useState } from "react";
import Sidebar, { Page } from "./Sidebar";
import Header from "./Header";
import Dashboard from "./Dashboard";
import LeadsPage from "./LeadsPage";
import CrmTasksPage from "./CrmTasksPage";
import CounselorsPage from "./CounselorsPage";
import StudentsPage from "./StudentsPage";
import CollegesPage from "./CollegesPage";
import { CollegePortalPage } from "./CollegePortal/CollegePortalPage";
import AnalyticsPage from "./AnalyticsPage";
import ApplicationsPage from "./ApplicationsPage";
import SettingsPage from "./SettingsPage";
import RBACPage from "./RBACPage";
import { OrganizationPage } from "./OrganizationPage";
import StaffOnboardingPage from "./StaffOnboardingPage";
import MobileBottomNav from "./MobileBottomNav";
import BlogsPage from "./BlogsPage";
import ExamsPage from "./ExamsPage";
import ScholarshipsPage from "./ScholarshipsPage";
import FAQsPage from "./FAQsPage";
import DocumentsPage from "./DocumentsPage";
import PaymentsPage from "./PaymentsPage";
import ReportingEnrollmentPage from "./ReportingEnrollmentPage";
import { ReviewModerationPage } from "./ReviewModerationPage";
import { CollegeRankingAdminPage } from "./CollegeRankingAdminPage";
import ActivityLogsPage from "./ActivityLogsPage";
import CoursesPage from "./CoursesPage";
import StudyMaterialsPage from "./StudyMaterialsPage";
import MarketingPage from "./MarketingPage";
import AiCounselorAdminPage from "./AiCounselorAdminPage";
import NotificationsPage from "./NotificationsPage";
import SupportTicketsPage from "./SupportTicketsPage";
import ProfilePage from "./ProfilePage";
import ReferralManagementPage from "./ReferralManagementPage";
import CouponManagementPage from "./CouponManagementPage";
import FeeManagementPage from "./FeeManagementPage";
import StatesManagementPage from "./StatesManagementPage";
import ErrorBoundary from "./ErrorBoundary";
import {
  LayoutDashboard, Users, BarChart3, Building2, Settings,
  FileText, UserCheck, GraduationCap, Brain, CreditCard, Bell,
  BookOpen, Trophy, Star, Library, Rss, FolderOpen, Megaphone,
  Shield, Activity
} from "lucide-react";

interface AppLayoutProps {
  user: { name: string; role: string; email: string };
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
}

function PlaceholderPage({ title, icon: Icon, description }: { title: string; icon: any; description: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8" style={{ background: "#F8FAFC" }}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#E8F3EC" }}>
          <Icon className="w-8 h-8" style={{ color: "#4A7B5B" }} />
        </div>
        <h2 className="text-[#4A7B5B] mb-2">{title}</h2>
        <p className="text-[#64748B] text-sm">{description}</p>
        <div className="mt-4 px-4 py-2 rounded-full inline-block text-xs" style={{ background: "#E8F3EC", color: "#4A7B5B" }}>
          Module coming soon
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ user, currentPage, onPageChange, onLogout }: AppLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": return <Dashboard onPageChange={onPageChange} />;
      case "leads": return <LeadsPage />;
      case "tasks": return <CrmTasksPage />;
      case "counselors": return <CounselorsPage />;
      case "staff-onboarding": return <StaffOnboardingPage />;
      case "students": return <StudentsPage />;
      case "colleges": return <CollegesPage />;
      case "college-portal": return <CollegePortalPage />;
      case "analytics": return <AnalyticsPage />;
      case "applications": return <ApplicationsPage />;
      case "reporting":
      case "enrollment":
      case "reporting-enrollment": return <ReportingEnrollmentPage />;
      case "review-moderation":
      case "moderation": return <ReviewModerationPage />;
      case "college-rankings":
      case "rankings": return <CollegeRankingAdminPage />;
      case "settings": return <SettingsPage />;
      case "rbac": return <RBACPage />;
      case "organization": return <OrganizationPage />;
      case "blogs": return <BlogsPage />;
      case "courses": return <CoursesPage />;
      case "states":
      case "state-management": return <StatesManagementPage onPageChange={onPageChange} />;
      case "documents": return <DocumentsPage />;
      case "exams": return <ExamsPage />;
      case "scholarships": return <ScholarshipsPage />;
      case "faqs": return <FAQsPage />;
      case "materials": return <StudyMaterialsPage />;
      case "ai": return <AiCounselorAdminPage />;
      case "notifications": return <NotificationsPage />;
      case "marketing": return <MarketingPage />;
      case "payments": return <PaymentsPage />;
      case "referrals": return <ReferralManagementPage />;
      case "coupons": return <CouponManagementPage />;
      case "fee-catalog":
      case "fees": return <FeeManagementPage />;
      case "logs": return <ActivityLogsPage />;
      case "support":
      case "help-support": return <SupportTicketsPage />;
      case "profile":
      case "admin/profile": return <ProfilePage />;
      default: return <Dashboard onPageChange={onPageChange} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F8FAFC" }}>
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage as Page}
        onPageChange={onPageChange as (page: Page) => void}
        user={user}
        onLogout={onLogout}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentPage={currentPage}
          user={user}
          onLogout={onLogout}
          onMenuOpen={() => setMobileSidebarOpen(true)}
          onPageChange={onPageChange}
        />

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0" style={{ background: "#F8FAFC" }}>
          <ErrorBoundary fallbackTitle="Module Render Error">
            {renderPage()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav currentPage={currentPage} onPageChange={onPageChange} />
    </div>
  );
}
