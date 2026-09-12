import { useState, useEffect, useRef } from "react";
import {
  Search, Bell, Plus, Menu, ChevronDown, Settings, LogOut,
  User, HelpCircle, MessageSquare, Loader2, GraduationCap,
  Users, FileText, Building2, BookOpen, X
} from "lucide-react";
import { Badge } from "./ui/badge";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../../api/notifications.api";
import { searchApi } from "../../api/search.api";

interface HeaderProps {
  currentPage: string;
  user: { name: string; role: string; email: string };
  onLogout: () => void;
  onMenuOpen: () => void;
  onPageChange: (page: string) => void;
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Welcome back, overview of your CRM" },
  leads: { title: "Leads", subtitle: "Manage and track all your leads" },
  students: { title: "Students", subtitle: "Student profiles and admission records" },
  counselors: { title: "Counselors", subtitle: "Team performance and assignments" },
  colleges: { title: "Colleges", subtitle: "College database and management" },
  courses: { title: "Courses", subtitle: "Course catalog and management" },
  applications: { title: "Applications", subtitle: "Track student application status" },
  documents: { title: "Documents", subtitle: "Document verification and storage" },
  exams: { title: "Exams", subtitle: "Entrance exam information" },
  scholarships: { title: "Scholarships", subtitle: "Scholarship opportunities" },
  materials: { title: "Study Materials", subtitle: "Study resources and materials" },
  blogs: { title: "Blogs & SEO", subtitle: "Content management" },
  ai: { title: "AI Counselor", subtitle: "Intelligent recommendation system" },
  notifications: { title: "Notifications", subtitle: "Manage alerts and campaigns" },
  analytics: { title: "Reports & Analytics", subtitle: "Insights and performance data" },
  marketing: { title: "Marketing", subtitle: "Campaign tracking and analytics" },
  payments: { title: "Payments", subtitle: "Financial transactions and receipts" },
  settings: { title: "Settings", subtitle: "System configuration and preferences" },
  rbac: { title: "Roles & Permissions", subtitle: "Access control management" },
  logs: { title: "Activity Logs", subtitle: "System activity and audit trail" },
};

export default function Header({ currentPage, user, onLogout, onMenuOpen, onPageChange }: HeaderProps) {
  const queryClient = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["admin_global_search", debouncedQuery],
    queryFn: () => searchApi.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const handleSelectResult = (targetPage: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    onPageChange(targetPage);
  };

  const { data: unreadRes } = useQuery({
    queryKey: ["notification_unread_count"],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 15000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification_unread_count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification_stats"] });
    },
  });

  const pageInfo = PAGE_TITLES[currentPage] || { title: "Dashboard", subtitle: "" };
  const unreadData = unreadRes?.data?.data || unreadRes?.data || {};
  const unreadCount = Number(unreadData?.count ?? 0);
  const recentNotifications = Array.isArray(unreadData?.recent) ? unreadData.recent : [];

  return (
    <header className="h-16 px-6 bg-white border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 z-30">
      {/* Left: Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuOpen}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F8FAFC] transition-colors"
        >
          <Menu className="w-5 h-5 text-[#475569]" />
        </button>

        <div className="hidden sm:block">
          <h1 className="text-[#0F172A] leading-tight text-lg font-semibold">{pageInfo.title}</h1>
          <p className="text-[#94A3B8] text-xs mt-0">{pageInfo.subtitle}</p>
        </div>
        <div className="sm:hidden font-medium text-[#0F172A] text-sm">{pageInfo.title}</div>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-8" ref={searchRef}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={e => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onKeyDown={e => {
              if (e.key === "Escape") setIsSearchOpen(false);
            }}
            placeholder="Search leads, students, colleges, courses..."
            className="w-full h-9 pl-9 pr-8 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4A7B5B] focus:bg-white transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setIsSearchOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Search Dropdown */}
          {isSearchOpen && debouncedQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50 max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-6 text-gray-400 gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-[#4A7B5B]" />
                  Searching database...
                </div>
              ) : (
                <div className="space-y-3 px-2">
                  {/* Students */}
                  {searchResults?.students && searchResults.students.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="w-3 h-3 text-[#4A7B5B]" />
                        Students ({searchResults.students.length})
                      </div>
                      {searchResults.students.map((student: any) => (
                        <div
                          key={student.id}
                          onClick={() => handleSelectResult("students")}
                          className="px-2.5 py-1.5 rounded-lg hover:bg-[#F8FAFC] cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-gray-800">{student.fullName}</span>
                            <span className="text-gray-400 ml-2">{student.email || student.mobile}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            Student
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Leads */}
                  {searchResults?.leads && searchResults.leads.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-blue-600" />
                        Leads ({searchResults.leads.length})
                      </div>
                      {searchResults.leads.map((lead: any) => (
                        <div
                          key={lead.id}
                          onClick={() => handleSelectResult("leads")}
                          className="px-2.5 py-1.5 rounded-lg hover:bg-[#F8FAFC] cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-gray-800">{lead.fullName}</span>
                            <span className="text-gray-400 ml-2">{lead.mobile}</span>
                            {lead.preferredCourse && (
                              <span className="text-slate-400 ml-2 font-light">· {lead.preferredCourse}</span>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                            Lead ({lead.status})
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Applications */}
                  {searchResults?.applications && searchResults.applications.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-purple-600" />
                        Applications ({searchResults.applications.length})
                      </div>
                      {searchResults.applications.map((app: any) => (
                        <div
                          key={app.id}
                          onClick={() => handleSelectResult("applications")}
                          className="px-2.5 py-1.5 rounded-lg hover:bg-[#F8FAFC] cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-gray-800">{app.applicationNumber || app.applicationId}</span>
                            <span className="text-gray-400 ml-2">{app.user?.fullName}</span>
                            {app.course?.name && (
                              <span className="text-slate-400 ml-2">· {app.course.name}</span>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                            {app.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Counselors */}
                  {searchResults?.counselors && searchResults.counselors.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3 h-3 text-amber-600" />
                        Counselors ({searchResults.counselors.length})
                      </div>
                      {searchResults.counselors.map((counselor: any) => (
                        <div
                          key={counselor.id}
                          onClick={() => handleSelectResult("counselors")}
                          className="px-2.5 py-1.5 rounded-lg hover:bg-[#F8FAFC] cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-gray-800">{counselor.fullName}</span>
                            <span className="text-gray-400 ml-2">{counselor.department || counselor.email}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            Counselor
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Colleges */}
                  {searchResults?.colleges && searchResults.colleges.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-emerald-600" />
                        Colleges ({searchResults.colleges.length})
                      </div>
                      {searchResults.colleges.map((college: any) => (
                        <div
                          key={college.id}
                          onClick={() => handleSelectResult("colleges")}
                          className="px-2.5 py-1.5 rounded-lg hover:bg-[#F8FAFC] cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-gray-800">{college.name}</span>
                            <span className="text-gray-400 ml-2">{college.city}, {college.state}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">
                            College
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Courses */}
                  {searchResults?.courses && searchResults.courses.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-cyan-600" />
                        Courses ({searchResults.courses.length})
                      </div>
                      {searchResults.courses.map((course: any) => (
                        <div
                          key={course.id}
                          onClick={() => handleSelectResult("courses")}
                          className="px-2.5 py-1.5 rounded-lg hover:bg-[#F8FAFC] cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-gray-800">{course.name}</span>
                            {course.college?.name && (
                              <span className="text-gray-400 ml-2">({course.college.name})</span>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-cyan-50 text-cyan-700 border-cyan-200">
                            Course
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty search results */}
                  {(!searchResults || Object.values(searchResults).every(arr => !Array.isArray(arr) || arr.length === 0)) && (
                    <div className="py-6 text-center text-xs text-gray-400">
                      No results found for &ldquo;{debouncedQuery}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange("leads")}
          className="hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "#4A7B5B" }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Add Lead</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F8FAFC] transition-colors relative"
          >
            <Bell className="w-4.5 h-4.5 text-[#475569]" style={{ width: "18px", height: "18px" }} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                style={{ background: "#F0AE1A" }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-[#F1F5F9] z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9]">
                <span className="font-medium text-[#0F172A] text-sm">Notifications</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#D97706" }}>
                  {unreadCount} new
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400">No unread notifications</div>
                ) : (
                  recentNotifications.map((notif: any) => (
                    <div
                      key={notif.id}
                      onClick={() => onPageChange("notifications")}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#F8FAFC] cursor-pointer border-b border-[#F1F5F9] last:border-0"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `#3B82F620` }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: "#3B82F6" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A] leading-snug">{notif.title}</p>
                        <p className="text-xs text-[#64748B] truncate mt-0.5">{notif.shortMessage || notif.message}</p>
                        <p className="text-[10px] text-[#94A3B8] mt-1">
                          {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                        </p>
                      </div>
                      {!notif.isRead && <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-600" />}
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-[#F1F5F9] flex items-center justify-between">
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Mark all as read
                </button>
                <button
                  onClick={() => { onPageChange("notifications"); setShowNotifications(false); }}
                  className="text-xs font-bold"
                  style={{ color: "#4A7B5B" }}
                >
                  View all →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
            className="flex items-center gap-2 h-9 px-2 rounded-xl hover:bg-[#F8FAFC] transition-colors"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: "#4A7B5B" }}
            >
              {user.name.charAt(0)}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-[#0F172A] text-xs font-medium leading-tight">{user.name.split(" ")[0]}</div>
              <div className="text-[#94A3B8] text-[10px] leading-tight">{user.role}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-[#94A3B8] hidden lg:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-[#F1F5F9] z-50 overflow-hidden py-1">
              <div className="px-4 py-3 border-b border-[#F1F5F9]">
                <div className="font-medium text-[#0F172A] text-sm">{user.name}</div>
                <div className="text-xs text-[#94A3B8]">{user.email}</div>
                <div className="mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#E8F3EC", color: "#4A7B5B" }}>
                    {user.role}
                  </span>
                </div>
              </div>
              {[
                { icon: User, label: "My Profile", action: () => { onPageChange("profile"); setShowProfile(false); } },
                { icon: Settings, label: "Settings", action: () => { onPageChange("settings"); setShowProfile(false); } },
                { icon: HelpCircle, label: "Help & Support", action: () => { onPageChange("support"); setShowProfile(false); } },
                { icon: MessageSquare, label: "Send Feedback", action: () => { onPageChange("support"); setShowProfile(false); } },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <item.icon className="w-4 h-4 text-[#94A3B8]" />
                  <span className="text-sm text-[#475569]">{item.label}</span>
                </button>
              ))}
              <div className="border-t border-[#F1F5F9] mt-1">
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-[#FEE2E2] transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-sm text-[#EF4444]">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
