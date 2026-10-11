import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { authApi, type AuthUser, type LoginPayload, type SignupPayload } from "../api/auth.api";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginPayload) => Promise<boolean>;
  signup: (data: SignupPayload) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => false,
  signup: async () => false,
  logout: () => {},
  clearError: () => {},
  refreshUser: async () => null,
});

function formatAuthError(err: any, defaultMsg: string): string {
  if (err?.apiError?.userMessage) {
    return err.apiError.userMessage;
  }
  if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
    return "Authentication request timed out. Please try again.";
  }
  if (!err.response && (err.request || err.code === "ERR_NETWORK")) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return "You appear to be offline. Please check your internet connection.";
    }
    return "Unable to connect to the authentication service. Please ensure the backend server is running.";
  }
  if (err.response?.status === 404) {
    return "Authentication service endpoint is temporarily unavailable. Please verify backend service.";
  }
  if (err.response?.status === 401) {
    return "Invalid email/mobile or password.";
  }
  if (err.response?.status === 403) {
    return "Your account is not authorized or is awaiting approval.";
  }
  if (err.response?.status === 423) {
    return "Account is temporarily locked. Please contact administrator.";
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

function getInitialUser(): AuthUser | null {
  try {
    const token = localStorage.getItem("swayam_token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      return JSON.parse(storedUser);
    }
  } catch (e) {
    console.error("[Admin Auth] Failed to parse initial cached user:", e);
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getInitialUser);
  const [isLoading, setIsLoading] = useState(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("swayam_token") : null;
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("swayam_refresh_token") : null;
    return !!(token || refreshToken);
  });
  const [error, setError] = useState<string | null>(null);

  // Hydrate user from token on mount
  useEffect(() => {
    const token = localStorage.getItem("swayam_token");
    const refreshToken = localStorage.getItem("swayam_refresh_token");

    if (!token && !refreshToken) {
      setIsLoading(false);
      setUser(null);
      return;
    }

    let isMounted = true;

    authApi
      .getMe()
      .then((res) => {
        if (!isMounted) return;
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      })
      .catch((err: any) => {
        if (!isMounted) return;
        const status = err?.response?.status;
        const errorType = err?.apiError?.errorType;

        // ONLY clear session if server returned a 401 unauthenticated error that could not be refreshed
        if (status === 401 || errorType === "AUTH_ERROR") {
          console.warn("[Admin Auth] Session invalid or expired. Resetting session.");
          localStorage.removeItem("swayam_token");
          localStorage.removeItem("swayam_refresh_token");
          localStorage.removeItem("user");
          setUser(null);
        } else {
          // Temporary network failure, backend restart, or timeout:
          // Preserve cached user session so admin is never logged out due to network issues
          console.warn(
            "[Admin Auth] Server unreachable or temporary error during session hydration. Retaining active session.",
            err?.message
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const res = await authApi.getMe();
      if (res?.data) {
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
        return res.data;
      }
      return null;
    } catch (err) {
      console.warn("[Admin Auth] Failed to refresh user profile:", err);
      return null;
    }
  }, []);

  // Sync state when token refresh fails globally, storage changes, or permissions refresh event fires
  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
      setError(null);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "swayam_token" && !e.newValue) {
        setUser(null);
      }
    };

    const handleRefreshPermissions = () => {
      refreshUser();
    };

    window.addEventListener("swayam:auth-logout", handleAuthLogout);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("swayam:refresh-permissions", handleRefreshPermissions);

    return () => {
      window.removeEventListener("swayam:auth-logout", handleAuthLogout);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("swayam:refresh-permissions", handleRefreshPermissions);
    };
  }, [refreshUser]);

  const login = useCallback(async (data: LoginPayload): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      const accessToken = res.data.access_token || res.data.accessToken;
      const refreshToken = res.data.refresh_token || res.data.refreshToken;

      if (accessToken) {
        localStorage.setItem("swayam_token", accessToken);
      }
      if (refreshToken) {
        localStorage.setItem("swayam_refresh_token", refreshToken);
      }
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setUser(res.data.user);
      }
      return true;
    } catch (err: any) {
      console.error("[Admin Auth Error]", err);
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
      console.error("[Admin Signup Error]", err);
      const friendlyMsg = formatAuthError(err, "Signup failed. Please try again.");
      setError(friendlyMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem("swayam_refresh_token") || undefined;
    authApi.logout(refreshToken).catch(() => {});
    localStorage.removeItem("swayam_token");
    localStorage.removeItem("swayam_refresh_token");
    localStorage.removeItem("user");
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
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        signup,
        logout,
        clearError,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
