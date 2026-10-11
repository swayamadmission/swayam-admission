import { createBrowserRouter, Navigate } from "react-router";
import Root from "./components/Root";
import HomePage from "./components/HomePage";
import CoursesPage from "./components/CoursesPage";
import CollegesPage from "./components/CollegesPage";
import CollegeDetailPage from "./components/CollegeDetailPage";
import AICounselorPage from "./components/AICounselorPage";
import ApplyNowPage from "./components/ApplyNowPage";
import StudentDashboard from "./components/StudentDashboard";
import BlogPage from "./components/BlogPage";
import BlogDetailPage from "./components/BlogDetailPage";
import FAQPage from "./components/FAQPage";
import FAQDetailPage from "./components/FAQDetailPage";
import ExamsPage from "./components/ExamsPage";
import ExamDetailPage from "./components/ExamDetailPage";
import StatesPage from "./components/StatesPage";
import StateDetailPage from "./components/StateDetailPage";
import ScholarshipsPage from "./components/ScholarshipsPage";
import ScholarshipDetailPage from "./components/ScholarshipDetailPage";
import CompareCollegesPage from "./components/CompareCollegesPage";
import { CollegeRankingsPage } from "./components/CollegeRankingsPage";
import ReferralDashboard from "./components/ReferralDashboard";
import CareersPage from "./components/CareersPage";
import CareerDetailPage from "./components/CareerDetailPage";
import CandidateOfferViewPage from "./components/CandidateOfferViewPage";

import StudyMaterialsPage from "./components/StudyMaterialsPage";
import { SearchResultsPage } from "./components/SearchResultsPage";
import ContactUsPage from "./components/ContactUsPage";
import PublicLegalPage from "./components/PublicLegalPage";
import PublicLegalDetailPage from "./components/PublicLegalDetailPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: "search", Component: SearchResultsPage },
      { path: "courses", Component: CoursesPage },
      { path: "colleges", Component: CollegesPage },
      { path: "colleges/compare", Component: CompareCollegesPage },
      { path: "colleges/:id", Component: CollegeDetailPage },
      { path: "rankings", Component: CollegeRankingsPage },
      { path: "exams", Component: ExamsPage },
      { path: "exams/:slug", Component: ExamDetailPage },
      { path: "states", Component: StatesPage },
      { path: "states/:slug", Component: StateDetailPage },
      { path: "scholarships", Component: ScholarshipsPage },
      { path: "scholarships/:slug", Component: ScholarshipDetailPage },
      { path: "study-materials", Component: StudyMaterialsPage },
      { path: "ai-counselor", Component: AICounselorPage },
      { path: "apply-now", Component: ApplyNowPage },
      { path: "dashboard", Component: StudentDashboard },
      { path: "refer", Component: ReferralDashboard },
      { path: "referrals", Component: ReferralDashboard },
      { path: "blogs", Component: BlogPage },
      { path: "blog/:slug", Component: BlogDetailPage },
      { path: "faq", Component: FAQPage },
      { path: "faq/:slug", Component: FAQDetailPage },
      { path: "careers", Component: CareersPage },
      { path: "careers/:code", Component: CareerDetailPage },
      { path: "careers/offers/:identifier", Component: CandidateOfferViewPage },
      { path: "offer/:identifier", Component: CandidateOfferViewPage },
      { path: "contact", Component: ContactUsPage },
      { path: "policies", Component: PublicLegalPage },
      { path: "policies/:slug", Component: PublicLegalDetailPage },
      { path: "terms", element: <Navigate to="/policies/terms-and-conditions" replace /> },
      { path: "privacy", element: <Navigate to="/policies/privacy-policy" replace /> },
      { path: "refund", element: <Navigate to="/policies/refund-cancellation" replace /> },
      { path: "contact-us", element: <Navigate to="/contact" replace /> },
      { path: "ai-recommendations", element: <Navigate to="/ai-counselor" replace /> },
      { path: "recommendations", element: <Navigate to="/ai-counselor" replace /> },
      { path: "saved-colleges", element: <Navigate to="/dashboard?tab=saved" replace /> },
      { path: "saved", element: <Navigate to="/dashboard?tab=saved" replace /> },
    ],
  },
]);
