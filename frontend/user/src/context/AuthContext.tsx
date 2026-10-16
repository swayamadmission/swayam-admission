import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  authApi,
  type AuthUser,
  type LoginPayload,
  type SignupPayload,
  type VerifyMobileOtpPayload,
  type GoogleAuthPayload,
} from "../api/auth.api";

interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginPayload) => Promise<boolean>;
  loginWithMobileOtp: (data: VerifyMobileOtpPayload) => Promise<boolean>;
  sendMobileOtp: (mobile: string) => Promise<{
    success: boolean;
    message: string;
    resendCooldownSeconds: number;
    expiresInSeconds: number;
    devOtp?: string;
  }>;
  loginWithGoogle: (data: GoogleAuthPayload) => Promise<boolean>;
  signup: (data: SignupPayload) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  error: null,
  login: async () => false,
  loginWithMobileOtp: async () => false,
  sendMobileOtp: async () => ({ success: false, message: "", resendCooldownSeconds: 30, expiresInSeconds: 300 }),
  loginWithGoogle: async () => false,
  signup: async () => false,
  logout: () => {},
  refreshUser: async () => {},
  clearError: () => {},
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
    return "Unable to connect to the Swayam Admission server. Please try again in a moment.";
  }
  if (err.response?.status === 404) {
    return "Authentication service is temporarily unavailable. Please try again later.";
  }
  if (err.response?.status === 401) {
    const serverMsg = err.response?.data?.message;
    return typeof serverMsg === "string" && !serverMsg.includes("Cannot POST")
      ? serverMsg
      : "Invalid email/mobile or password.";
  }
  if (err.response?.status === 403) {
    return "Your account is not authorized or is pending verification.";
  }
  if (err.response?.status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (err.response?.status >= 500) {
    return "Login service is temporarily unavailable. Please try again in a moment.";
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

  // Refresh current user data from server
  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      setUser(res.data);
    } catch {
      // Ignore background refresh errors
    }
  }, []);

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
        localStorage.removeItem("swayam_refresh_token");
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
      if (res.data.refresh_token) {
        localStorage.setItem("swayam_refresh_token", res.data.refresh_token);
      }
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

  const sendMobileOtp = useCallback(async (mobile: string) => {
    setError(null);
    try {
      const res = await authApi.sendMobileOtp({ mobile });
      return res.data;
    } catch (err: any) {
      const friendlyMsg = formatAuthError(err, "Failed to send OTP. Please check the mobile number.");
      setError(friendlyMsg);
      throw err;
    }
  }, []);

  const loginWithMobileOtp = useCallback(async (data: VerifyMobileOtpPayload): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await authApi.verifyMobileOtp(data);
      localStorage.setItem("swayam_token", res.data.access_token);
      if (res.data.refresh_token) {
        localStorage.setItem("swayam_refresh_token", res.data.refresh_token);
      }
      setUser(res.data.user);
      return true;
    } catch (err: any) {
      console.error("[Mobile OTP Verification Error]", err);
      const friendlyMsg = formatAuthError(err, "Invalid OTP. Please check and try again.");
      setError(friendlyMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (data: GoogleAuthPayload): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await authApi.googleAuth(data);
      const token = res.data.access_token || (res.data as any).accessToken;
      const refreshToken = res.data.refresh_token || (res.data as any).refreshToken;
      if (token) {
        localStorage.setItem("swayam_token", token);
      }
      if (refreshToken) {
        localStorage.setItem("swayam_refresh_token", refreshToken);
      }
      if (res.data.user) {
        setUser(res.data.user);
      }
      return true;
    } catch (err: any) {
      console.error("[Google Auth Error]", err);
      const friendlyMsg = formatAuthError(err, "Google sign in failed. Please try again.");
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
      const res = await authApi.signup(data);
      if (res.data.access_token) {
        localStorage.setItem("swayam_token", res.data.access_token);
      }
      if (res.data.refresh_token) {
        localStorage.setItem("swayam_refresh_token", res.data.refresh_token);
      }
      if (res.data.user) {
        setUser(res.data.user);
      }
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
    const refreshToken = localStorage.getItem("swayam_refresh_token") || undefined;
    authApi.logout(refreshToken).catch(() => {});
    localStorage.removeItem("swayam_token");
    localStorage.removeItem("swayam_refresh_token");
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
        loginWithMobileOtp,
        sendMobileOtp,
        loginWithGoogle,
        signup,
        logout,
        refreshUser,
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

