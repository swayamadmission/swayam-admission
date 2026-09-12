import { useState } from "react";
import { AuthProvider, useAdminAuth } from "../context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import LoginPage from "./components/LoginPage";
import AppLayout from "./components/AppLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AppContent() {
  const { user, isAuthenticated, isLoading, login, logout, error, clearError } = useAdminAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");

  // Loading state while checking for existing session
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#4A7B5B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#64748B]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <LoginPage
        onLogin={login}
        authError={error}
        authLoading={isLoading}
        clearError={clearError}
      />
    );
  }

  const handleLogout = () => {
    logout();
    setCurrentPage("dashboard");
  };

  return (
    <AppLayout
      user={{ name: user.fullName, role: user.role, email: user.email }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      onLogout={handleLogout}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
