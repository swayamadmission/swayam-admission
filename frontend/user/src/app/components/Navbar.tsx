import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, X, UserCircle, BookOpen, GraduationCap, MapPin, FileText, Award, Newspaper, Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import logoImg from "../../assets/SA_logo-removebg-preview.png";
import { notificationsApi } from "../../api/notifications.api";
import { useAuth as useUserAuth } from "../../context/AuthContext";
import { useUserLiveSync } from "../../hooks/useUserLiveSync";
import { usePublicSettings } from "../../context/PublicSettingsContext";

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

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-100" : "bg-white/90 backdrop-blur-sm"}`}>
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
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(link => (
              <Link key={link.label} to={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${isActive(link.href) ? "bg-[#E8F3EC] text-[#4A7B5B]" : "text-gray-700 hover:bg-gray-50"}`}>
                <link.icon size={16} className="text-gray-400" /> {link.label}
              </Link>
            ))}
            {isLoggedIn && (
              <Link
                to="/dashboard?section=notifications"
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-gray-700 hover:bg-[#E8F3EC] hover:text-[#4A7B5B] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bell size={16} className="text-[#4A7B5B]" /> Notifications
                </div>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#4A7B5B] text-white text-[10px] font-bold">
                    {unreadCount > 20 ? "20+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {isLoggedIn
                ? <Link to="/dashboard" className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm text-gray-700"><UserCircle size={14} /> Dashboard</Link>
                : <button onClick={openAuth} className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm text-gray-700"><UserCircle size={14} /> Login</button>
              }
              <Link to="/apply-now" className="flex items-center justify-center gap-2 py-3 bg-[#4A7B5B] text-white rounded-xl text-sm" style={{ fontWeight: 600 }}>Apply Now</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
