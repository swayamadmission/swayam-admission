import React from "react";
import { Outlet, Link, useNavigate } from "react-router";
import { MessageCircle, Phone, CheckCircle2 } from "lucide-react";
import Navbar, { AuthContext as NavAuthContext } from "./Navbar";
import Footer from "./Footer";
import AuthModal from "./AuthModal";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";

export default function Root() {
  const [authOpen, setAuthOpen] = useState(false);
  const { user, isLoggedIn, logout, login, signup, error, isLoading, clearError } = useAuth();
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    setAuthOpen(false);
    navigate("/dashboard");
  };

  return (
    <NavAuthContext.Provider value={{ isLoggedIn, openAuth: () => setAuthOpen(true), logout }}>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8FAFC" }}>
        <Navbar />
        <main className="flex-1 pt-16">
          <Outlet />
        </main>
        <Footer />

        {/* Floating WhatsApp button */}
        <a href="https://wa.me/919000000000" target="_blank" rel="noopener noreferrer"
          className="fixed bottom-24 right-4 sm:bottom-8 sm:right-6 z-40 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
          <MessageCircle size={26} className="text-white" />
        </a>

        {/* Mobile sticky CTA bar */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-xl">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <a href="tel:+919000000000" className="flex flex-col items-center gap-1 py-3 text-gray-600 active:bg-gray-50">
              <Phone size={18} /><span style={{ fontSize: "9px" }}>Call Now</span>
            </a>
            <a href="https://wa.me/919000000000" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 py-3 text-[#25D366] active:bg-gray-50">
              <MessageCircle size={18} /><span style={{ fontSize: "9px" }}>WhatsApp</span>
            </a>
            <Link to="/apply-now" className="flex flex-col items-center gap-1 py-3 bg-[#4A7B5B] text-white">
              <CheckCircle2 size={18} /><span style={{ fontSize: "9px", fontWeight: 600 }}>Apply Now</span>
            </Link>
          </div>
        </div>

        <AuthModal
          open={authOpen}
          onClose={() => { setAuthOpen(false); clearError(); }}
          onLogin={handleLoginSuccess}
          authLogin={login}
          authSignup={signup}
          authError={error}
          authLoading={isLoading}
          clearError={clearError}
        />
      </div>
    </NavAuthContext.Provider>
  );
}
