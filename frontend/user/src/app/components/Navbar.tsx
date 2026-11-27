import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, X, UserCircle, BookOpen, GraduationCap, MapPin, FileText, Award, Newspaper, Bell, ChevronRight, Sparkles, ArrowRight, LogOut } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import logoImg from "../../assets/SA_logo-removebg-preview.png";
import { notificationsApi } from "../../api/notifications.api";
import { useAuth as useUserAuth } from "../../context/AuthContext";
import { useUserLiveSync } from "../../hooks/useUserLiveSync";
import { usePublicSettings } from "../../context/PublicSettingsContext";
import AnnouncementBar from "./AnnouncementBar";
import { ZiafAiLogo } from "./common/ZiafAiBrand";

function formatDDMMYYYY(dateInput: any): string {
  if (!dateInput) return "N/A";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "N/A";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${day}/${month}/${year} ${time}`;
  } catch {
    return "N/A";
  }
}

function renderSafeNotificationText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\{\{\s*studentName\s*\}\}/g, "Student")
    .replace(/\{\{\s*(officialStudentId|studentId)\s*\}\}/g, "")
    .replace(/\{\{\s*(applicationNumber|applicationId)\s*\}\}/g, "your application")
    .replace(/\{\{\s*collegeName\s*\}\}/g, "your selected college")
    .replace(/\{\{\s*courseName\s*\}\}/g, "your course")
    .replace(/\{\{\s*branchName\s*\}\}/g, "")
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, "")
    .replace(/\s+for\s+at\s+/g, " at ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export const AuthContext = createContext<{
  isLoggedIn: boolean;
  openAuth: () => void;
  logout: () => void;
}>({ isLoggedIn: false, openAuth: () => {}, logout: () => {} });

export const useAuth = () => useContext(AuthContext);

const NAV_LINKS = [
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Colleges", href: "/colleges", icon: GraduationCap },
  { label: "Study Materials", href: "/study-materials", icon: BookOpen },
  { label: "States", href: "/states", icon: MapPin },
  { label: "Exams", href: "/exams", icon: FileText },
  { label: "Scholarships", href: "/scholarships", icon: Award },
  { label: "Blogs", href: "/blogs", icon: Newspaper },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { isLoggedIn, openAuth, logout } = useAuth();
  const { user } = useUserAuth();
  const { settings } = usePublicSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Enable live synchronization for real-time notifications
  useUserLiveSync(user?.id);

  const { data: unreadRes } = useQuery({
    queryKey: ["notifications_unread"],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isLoggedIn,
    refetchInterval: 30000,
  });

  const unreadCount = Number(unreadRes?.data?.count ?? 0);
  const recentNotifications = Array.isArray(unreadRes?.data?.recent) ? unreadRes.data.recent : [];

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications_unread"] });
      queryClient.invalidateQueries({ queryKey: ["my_notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications_unread"] });
      queryClient.invalidateQueries({ queryKey: ["my_notifications"] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
    <header className="sticky top-0 left-0 right-0 z-50">
      <AnnouncementBar />
      <nav className={`transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-100" : "bg-white/95 backdrop-blur-sm border-b border-gray-100/60"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={settings.logo || logoImg} alt={settings.brandName || settings.platformName || "Swayam Admission"} className="h-9 w-auto" />
            <div className="hidden sm:block leading-tight">
              <div style={{ fontSize: "14px", fontWeight: 700, color: settings.primaryColor || "#4A7B5B" }}>
                {settings.brandName || settings.platformName || "Swayam Admission"}
              </div>
              <div style={{ fontSize: "9px", color: "#64748b", fontWeight: 500 }}>
                {settings.mainTagline || settings.tagline || "India Ka Mission Swayam Admission"}
              </div>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map(link => (
              <Link
                key={link.label}
                to={link.href}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${isActive(link.href) ? "bg-[#E8F3EC] text-[#4A7B5B]" : "text-gray-600 hover:bg-[#E8F3EC] hover:text-[#4A7B5B]"}`}
                style={{ fontWeight: isActive(link.href) ? 600 : 400 }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifications(prev => !prev)}
                    className="relative p-2 text-gray-600 hover:text-[#4A7B5B] hover:bg-[#E8F3EC] rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                    title="Notifications"
                    aria-label="Notifications"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#4A7B5B] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                        {unreadCount > 20 ? "20+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="font-bold text-[#4A7B5B] text-sm">Notifications</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-[#E8F3EC] text-[#4A7B5B]">
                          {unreadCount > 20 ? "20+" : unreadCount} new
                        </span>
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {recentNotifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-gray-400">
                            No notifications yet
                          </div>
                        ) : (
                          recentNotifications.map((notif: any) => (
                            <div
                              key={notif.id}
                              onClick={() => {
                                if (!notif.isRead) {
                                  markReadMutation.mutate(notif.id);
                                }
                                setShowNotifications(false);
                                navigate(notif.actionUrl || "/dashboard?section=notifications");
                              }}
                              className="px-4 py-3 hover:bg-[#F8FAFC] transition-colors flex items-start gap-3 cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-[#E8F3EC]">
                                <div className="w-2 h-2 rounded-full bg-[#4A7B5B]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-[#4A7B5B] leading-snug line-clamp-1">
                                  {renderSafeNotificationText(notif.title)}
                                </p>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                  {renderSafeNotificationText(notif.message)}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {formatDDMMYYYY(notif.createdAt)}
                                </p>
                              </div>
                              {!notif.isRead && (
                                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#4A7B5B]" />
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <button
                          onClick={() => markAllReadMutation.mutate()}
                          disabled={markAllReadMutation.isPending || unreadCount === 0}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          Mark all as read
                        </button>
                        <Link
                          to="/dashboard?section=notifications"
                          onClick={() => setShowNotifications(false)}
                          className="text-xs font-bold text-[#4A7B5B] hover:underline"
                        >
                          View all →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                <Link to="/dashboard" className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                  <UserCircle size={14} /> Dashboard
                </Link>
                <button onClick={logout} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Logout</button>
              </>
            ) : (
              <button onClick={openAuth} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <UserCircle size={14} /> Login
              </button>
            )}
            <Link to="/apply-now" className="px-4 py-2 bg-[#4A7B5B] text-white text-sm rounded-xl hover:bg-[#3d6b4d] transition-colors shadow-sm" style={{ fontWeight: 600 }}>
              Apply Now
            </Link>
          </div>

          {/* Mobile actions: Notification Bell + hamburger */}
          <div className="flex items-center gap-1.5 lg:hidden">
            {isLoggedIn && (
              <Link
                to="/dashboard?section=notifications"
                className="relative p-2 text-gray-600 hover:text-[#4A7B5B] hover:bg-[#E8F3EC] rounded-xl transition-colors flex items-center justify-center"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#4A7B5B] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {unreadCount > 20 ? "20+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="p-2 rounded-lg text-gray-700 hover:bg-[#E8F3EC] hover:text-[#4A7B5B] transition-colors cursor-pointer"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>
      </nav>
    </header>

    {/* Full-Screen Mobile Menu Drawer */}
    {mobileOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
        className="fixed inset-0 z-[100] bg-white flex flex-col lg:hidden animate-[fadeIn_0.18s_ease-out]"
      >
        {/* Top Drawer Header */}
        <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close mobile menu"
              className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-[#E8F3EC] hover:text-[#4A7B5B] transition-colors cursor-pointer"
            >
              <X size={22} />
            </button>
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2"
            >
              <img
                src={settings.logo || logoImg}
                alt={settings.brandName || settings.platformName || "Swayam Admission"}
                className="h-8 w-auto"
              />
              <span
                className="font-extrabold text-sm tracking-tight"
                style={{ color: settings.primaryColor || "#4A7B5B" }}
              >
                {settings.brandName || settings.platformName || "Swayam Admission"}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            {isLoggedIn && (
              <Link
                to="/dashboard?section=notifications"
                onClick={() => setMobileOpen(false)}
                className="relative p-2 text-slate-600 hover:text-[#4A7B5B] hover:bg-[#E8F3EC] rounded-xl transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 bg-[#4A7B5B] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 20 ? "20+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                if (isLoggedIn) {
                  navigate("/dashboard");
                } else {
                  openAuth();
                }
              }}
              aria-label={isLoggedIn ? "Student Dashboard" : "Login or Signup"}
              className="w-9 h-9 rounded-full bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center hover:bg-[#4A7B5B] hover:text-white transition-colors cursor-pointer"
            >
              <UserCircle size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Top Welcome / Auth Banner Card */}
          <div
            className="relative overflow-hidden rounded-2xl p-4 sm:p-5 border border-[#4A7B5B]/20 shadow-xs"
            style={{
              background:
                "linear-gradient(135deg, #E8F3EC 0%, #F4FAF6 58%, #FEF7E4 100%)",
            }}
          >
            {/* Branded Decorative Graphic Corner */}
            <div
              aria-hidden="true"
              className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full bg-[#4A7B5B]/10 flex items-center justify-center pointer-events-none"
            >
              <div className="w-20 h-20 rounded-full bg-[#F0AE1A]/20 flex items-center justify-center">
                <GraduationCap size={34} className="text-[#4A7B5B]/75" />
              </div>
            </div>

            {!isLoggedIn ? (
              <div className="relative z-10 pr-20">
                <h2 className="text-[15px] font-extrabold text-[#2f563d] leading-snug">
                  Welcome to {settings.brandName || "Swayam Admission"}
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Get personalized college guidance, scholarship alerts &amp; admission support.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    openAuth();
                  }}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <span>Login / Signup</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="relative z-10 pr-16">
                <h2 className="text-[15px] font-extrabold text-[#2f563d] leading-snug">
                  Welcome back, {user?.fullName?.split(" ")[0] || "Student"}
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Manage your applications, saved colleges &amp; counseling progress.
                </p>
                <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <span>Dashboard</span>
                    <ArrowRight size={13} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white border border-[#4A7B5B]/30 text-[#4A7B5B] hover:bg-[#E8F3EC] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Full-Width Navigation Links List */}
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white overflow-hidden">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3.5 transition-colors ${
                    active ? "bg-[#E8F3EC]/60" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        active
                          ? "bg-[#4A7B5B] text-white"
                          : "bg-[#E8F3EC] text-[#4A7B5B]"
                      }`}
                    >
                      <link.icon size={17} />
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        active ? "text-[#4A7B5B]" : "text-slate-800"
                      }`}
                    >
                      {link.label}
                    </span>
                  </div>
                  <ChevronRight
                    size={17}
                    className={active ? "text-[#4A7B5B]" : "text-slate-400"}
                  />
                </Link>
              );
            })}

            <Link
              to="/ai-counselor"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-3.5 transition-colors ${
                isActive("/ai-counselor") ? "bg-sky-50/70" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <ZiafAiLogo size="md" />
                <span className="text-sm font-bold text-slate-900">
                  Ziaf AI
                </span>
              </div>
              <ChevronRight size={17} className="text-slate-400" />
            </Link>

            {isLoggedIn && (
              <Link
                to="/dashboard?section=notifications"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between px-3.5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F3EC] text-[#4A7B5B] flex items-center justify-center shrink-0">
                    <Bell size={17} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    Notifications
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#4A7B5B] text-white text-[10px] font-bold">
                      {unreadCount > 20 ? "20+" : unreadCount}
                    </span>
                  )}
                  <ChevronRight size={17} className="text-slate-400" />
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Bottom Primary Action (No bottom Login button) */}
        <div className="px-4 py-3.5 border-t border-slate-100 bg-white shrink-0">
          <Link
            to="/apply-now"
            onClick={() => setMobileOpen(false)}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
          >
            <span>Apply Now</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )}
    </>
  );
}
