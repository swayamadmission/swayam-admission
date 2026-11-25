import React from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Tag,
  Megaphone,
  BookOpen,
  FileText,
  Award,
  Layers,
  ArrowRight,
  Percent,
  Plus,
} from "lucide-react";
import {
  homepageApi,
  AnnouncementTickerItem,
  TickerCategory,
} from "../../api/homepage.api";

const FALLBACK_TICKER_ITEMS: AnnouncementTickerItem[] = [
  {
    id: "fallback-college",
    category: "COLLEGE",
    badge: "College",
    text: "500+ Verified Colleges open for 2026 Admissions across India",
    buttonText: "Explore Colleges",
    href: "/colleges",
  },
  {
    id: "fallback-offer",
    category: "OFFER",
    badge: "Offer",
    text: "Free 1-on-1 Admission Counseling & Zero Platform Fee for Students",
    buttonText: "Claim Offer",
    href: "/apply-now",
  },
  {
    id: "fallback-announcement",
    category: "ANNOUNCEMENT",
    badge: "Announcement",
    text: "2026 Admission Notices, Merit Cutoff Lists & Seat Alerts Live Now",
    buttonText: "View Updates",
    href: "/blogs",
  },
  {
    id: "fallback-course",
    category: "COURSE",
    badge: "Course",
    text: "B.Tech, MBA, BCA, MBBS & Diploma 2026 Seat Intake Updated",
    buttonText: "Browse Courses",
    href: "/courses",
  },
  {
    id: "fallback-exam",
    category: "EXAM",
    badge: "Exam",
    text: "JEE Main, NEET, CUET & CAT 2026 Exam Dates & Notifications",
    buttonText: "Check Exams",
    href: "/exams",
  },
  {
    id: "fallback-scholarship",
    category: "SCHOLARSHIP",
    badge: "Scholarship",
    text: "Merit & State Government Scholarships 2026 - Up to 100% Tuition Support",
    buttonText: "Apply Now",
    href: "/scholarships",
  },
  {
    id: "fallback-material",
    category: "STUDY_MATERIAL",
    badge: "Study Material",
    text: "Free Previous Year Papers, Mock Tests & Chapter Notes Uploaded",
    buttonText: "Get Notes",
    href: "/study-materials",
  },
];

const CATEGORY_ICON: Record<TickerCategory, React.ElementType> = {
  COLLEGE: GraduationCap,
  OFFER: Tag,
  ANNOUNCEMENT: Megaphone,
  COURSE: BookOpen,
  EXAM: FileText,
  SCHOLARSHIP: Award,
  STUDY_MATERIAL: Layers,
};

function TickerEntry({ item }: { item: AnnouncementTickerItem }) {
  const Icon = CATEGORY_ICON[item.category] || Megaphone;
  const ctaContent = (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-[#D62839] group-hover:bg-[#F0AE1A] group-hover:text-slate-900 text-[11px] font-extrabold tracking-tight shadow-xs transition-colors whitespace-nowrap shrink-0">
      <span>{item.buttonText}</span>
      <ArrowRight size={11} strokeWidth={2.5} />
    </span>
  );

  const inner = (
    <div className="group inline-flex items-center gap-2.5 whitespace-nowrap px-3 py-1 rounded-full hover:bg-white/10 transition-colors">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/18 border border-white/25 text-white text-[10px] font-extrabold uppercase tracking-wider shrink-0">
        <Icon size={11} strokeWidth={2.4} />
        <span>{item.badge}</span>
      </span>

      <span className="text-white font-semibold text-xs sm:text-[13px] tracking-tight">
        {item.text}
      </span>

      {ctaContent}
    </div>
  );

  return (
    <div className="inline-flex items-center shrink-0">
      {item.isExternal ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-full"
        >
          {inner}
        </a>
      ) : (
        <Link
          to={item.href}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-full"
        >
          {inner}
        </Link>
      )}

      <span
        aria-hidden="true"
        className="mx-3 inline-flex items-center justify-center text-white/85 shrink-0"
      >
        {item.category === "OFFER" ? (
          <Percent size={13} strokeWidth={2.6} />
        ) : (
          <Plus size={13} strokeWidth={2.8} />
        )}
      </span>
    </div>
  );
}

export default function AnnouncementBar() {
  const { data: res } = useQuery({
    queryKey: ["homepage_announcements"],
    queryFn: () => homepageApi.getAnnouncements(),
    staleTime: 60_000,
    retry: 1,
  });

  const apiItems = res?.data?.data;
  const items =
    Array.isArray(apiItems) && apiItems.length > 0
      ? apiItems
      : FALLBACK_TICKER_ITEMS;

  return (
    <div
      role="region"
      aria-label="Latest Updates and Offers"
      className="w-full h-10 overflow-hidden select-none border-b border-black/10"
      style={{
        background:
          "linear-gradient(90deg, #EB3449 0%, #DF293E 50%, #EB3449 100%)",
      }}
    >
      <div className="h-full flex items-center announcement-marquee-wrapper">
        <div className="announcement-marquee-track flex items-center">
          {/* Primary pass */}
          <div className="flex items-center shrink-0">
            {items.map((item) => (
              <TickerEntry key={`a-${item.id}`} item={item} />
            ))}
          </div>
          {/* Seamless loop duplicate */}
          <div className="flex items-center shrink-0" aria-hidden="true">
            {items.map((item) => (
              <TickerEntry key={`b-${item.id}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
