import { createBrowserRouter } from "react-router";
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

import StudyMaterialsPage from "./components/StudyMaterialsPage";
import { SearchResultsPage } from "./components/SearchResultsPage";

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
    ],
  },
]);
