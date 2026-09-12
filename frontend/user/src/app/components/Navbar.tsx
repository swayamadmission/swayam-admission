import React, { useState, useEffect, createContext, useContext } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X, UserCircle, Bot, BookOpen, GraduationCap, MapPin, FileText, Award, Newspaper } from "lucide-react";
import logoImg from "../../assets/SA_logo-removebg-preview.png";

export const AuthContext = createContext<{
  isLoggedIn: boolean;
  openAuth: () => void;
  logout: () => void;
}>({ isLoggedIn: false, openAuth: () => {}, logout: () => {} });

export const useAuth = () => useContext(AuthContext);

const NAV_LINKS = [
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Colleges", href: "/colleges", icon: GraduationCap },
  { label: "States", href: "/states", icon: MapPin },
  { label: "Exams", href: "/exams", icon: FileText },
  { label: "Scholarships", href: "/scholarships", icon: Award },
  { label: "Blogs", href: "/blogs", icon: Newspaper },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isLoggedIn, openAuth, logout } = useAuth();
  const location = useLocation();

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
            <img src={logoImg} alt="Swayam Admission" className="h-9 w-auto" />
            <div className="hidden sm:block leading-tight">
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#4A7B5B" }}>Swayam Admission</div>
              <div style={{ fontSize: "9px", color: "#94a3b8" }}>Desh ki Shiksha</div>
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
            <Link to="/ai-counselor" className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#4A7B5B] hover:bg-[#E8F3EC] rounded-lg transition-colors">
              <Bot size={14} /> AI Counselor
            </Link>
            {isLoggedIn ? (
              <>
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

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
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
            <Link to="/ai-counselor" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
              <Bot size={16} className="text-[#4A7B5B]" /> AI Counselor
            </Link>
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
