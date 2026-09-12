import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { authApi, type AuthUser, type LoginPayload, type SignupPayload } from "../api/auth.api";

interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginPayload) => Promise<boolean>;
  signup: (data: SignupPayload) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  error: null,
  login: async () => false,
  signup: async () => false,
  logout: () => {},
  clearError: () => {},
});

function formatAuthError(err: any, defaultMsg: string): string {
  if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
    return "Authentication request timed out. Please try again.";
  }
  if (!err.response && (err.request || err.code === "ERR_NETWORK")) {
    return "Unable to connect to Swayam server. Please check your internet connection.";
  }
  if (err.response?.status === 404) {
    return "Authentication service is temporarily unavailable. Please try again later.";
  }
  if (err.response?.status === 401) {
    return "Invalid email/mobile or password.";
  }
  if (err.response?.status === 403) {
    return "Your account is not authorized or is pending verification.";
  }
  const serverMsg = err.response?.data?.message || err.response?.data?.error;
  if (typeof serverMsg === "string" && !serverMsg.includes("Cannot POST") && !serverMsg.startsWith("<!DOCTYPE")) {
    return serverMsg;
  }
  if (Array.isArray(serverMsg)) {
    return serverMsg.join(", ");
  }
  return defaultMsg;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hydrate user from token on mount
  useEffect(() => {
    const token = localStorage.getItem("swayam_token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi
      .getMe()
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        // Token is invalid or expired
        localStorage.removeItem("swayam_token");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (data: LoginPayload): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      localStorage.setItem("swayam_token", res.data.access_token);
      setUser(res.data.user);
      return true;
    } catch (err: any) {
      console.error("[User Auth Error]", err);
      const friendlyMsg = formatAuthError(err, "Login failed. Please check your credentials.");
      setError(friendlyMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (data: SignupPayload): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      await authApi.signup(data);
      return true;
    } catch (err: any) {
      console.error("[User Signup Error]", err);
      const friendlyMsg = formatAuthError(err, "Signup failed. Please try again.");
      setError(friendlyMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("swayam_token");
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        error,
        login,
        signup,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
