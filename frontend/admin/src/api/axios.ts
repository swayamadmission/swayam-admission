import axios, { AxiosError } from "axios";

const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname.includes("vercel.app") ||
    (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"))
    ? "https://swayam-admission.onrender.com"
    : "http://localhost:3000");
const BASE_URL = API_URL.endsWith("/v1") ? API_URL : `${API_URL}/v1`;

export interface ApiErrorPayload {
  errorType: "TIMEOUT" | "NETWORK_ERROR" | "AUTH_ERROR" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR" | "UNKNOWN";
  userMessage: string;
  statusCode?: number;
}

export function clearAuthSession() {
  localStorage.removeItem("swayam_token");
  localStorage.removeItem("swayam_refresh_token");
  localStorage.removeItem("user");
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15s timeout to prevent infinite pending states
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("swayam_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Concurrency queue for handling multiple requests during token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Handle responses and errors with safe refresh token rotation & concurrency handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    let errorType: ApiErrorPayload["errorType"] = "UNKNOWN";
    let userMessage = "An unexpected error occurred. Please try again.";

    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      errorType = "TIMEOUT";
      userMessage = "Authentication request timed out. Please try again.";
    } else if (!error.response && (error.request || error.code === "ERR_NETWORK")) {
      errorType = "NETWORK_ERROR";
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        userMessage = "You appear to be offline. Please check your internet connection.";
      } else {
        userMessage = "Unable to connect to the authentication service. Please ensure the backend server is running.";
      }
    } else if (error.response) {
      const status = error.response.status;
      const serverMsg = error.response.data?.message;

      switch (status) {
        case 401: {
          errorType = "AUTH_ERROR";
          userMessage = typeof serverMsg === "string" ? serverMsg : "Session expired or invalid credentials.";

          const originalRequest = error.config as any;
          const requestUrl = originalRequest?.url || "";

          const isAuthOrPublicRequest =
            requestUrl.includes("/auth/login") ||
            requestUrl.includes("/auth/refresh") ||
            requestUrl.includes("/auth/signup") ||
            requestUrl.includes("/auth/forgot-password") ||
            requestUrl.includes("/auth/mobile/") ||
            requestUrl.includes("/auth/google") ||
            requestUrl.includes("/geography") ||
            requestUrl.includes("/staff-onboarding/allowed-roles") ||
            requestUrl.includes("/staff-onboarding/register") ||
            requestUrl.includes("/health");

          // If the failed request is the refresh endpoint itself, or a second 401 after retry:
          if (requestUrl.includes("/auth/refresh") || originalRequest?._retry) {
            clearAuthSession();
            window.dispatchEvent(new CustomEvent("swayam:auth-logout"));
            break;
          }

          // If it's another public/auth endpoint (e.g. invalid login password), don't attempt refresh
          if (isAuthOrPublicRequest) {
            break;
          }

          const refreshToken = localStorage.getItem("swayam_refresh_token");
          if (!refreshToken) {
            clearAuthSession();
            window.dispatchEvent(new CustomEvent("swayam:auth-logout"));
            break;
          }

          // Concurrency handling: If already refreshing, queue this request
          if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          isRefreshing = true;
          originalRequest._retry = true;

          return new Promise((resolve, reject) => {
            axios
              .post(
                `${BASE_URL}/auth/refresh`,
                {
                  refreshToken,
                  refresh_token: refreshToken,
                },
                {
                  headers: { "Content-Type": "application/json" },
                  timeout: 10000,
                }
              )
              .then((res) => {
                const newAccessToken = res.data?.access_token || res.data?.accessToken;
                const newRefreshToken = res.data?.refresh_token || res.data?.refreshToken;

                if (!newAccessToken) {
                  throw new Error("No access token returned from refresh service");
                }

                localStorage.setItem("swayam_token", newAccessToken);
                if (newRefreshToken) {
                  localStorage.setItem("swayam_refresh_token", newRefreshToken);
                }
                if (res.data?.user) {
                  localStorage.setItem("user", JSON.stringify(res.data.user));
                }

                api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);
                resolve(api(originalRequest));
              })
              .catch((refreshErr) => {
                processQueue(refreshErr, null);
                clearAuthSession();
                window.dispatchEvent(new CustomEvent("swayam:auth-logout"));
                reject(refreshErr);
              })
              .finally(() => {
                isRefreshing = false;
              });
          });
        }

        case 403:
          errorType = "FORBIDDEN";
          userMessage = typeof serverMsg === "string" ? serverMsg : "Your account is not authorized or is awaiting approval.";
          break;

        case 404:
          errorType = "NOT_FOUND";
          userMessage = typeof serverMsg === "string" ? serverMsg : "Requested service endpoint is unavailable.";
          break;

        case 422:
        case 400:
          errorType = "VALIDATION_ERROR";
          userMessage = Array.isArray(serverMsg) ? serverMsg.join(", ") : (typeof serverMsg === "string" ? serverMsg : "Invalid request parameters.");
          break;

        case 423:
          errorType = "AUTH_ERROR";
          userMessage = typeof serverMsg === "string" ? serverMsg : "Account is temporarily locked. Please contact administrator.";
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          errorType = "SERVER_ERROR";
          userMessage = "Authentication service encountered an internal error. Please retry shortly.";
          break;

        default:
          userMessage = typeof serverMsg === "string" ? serverMsg : userMessage;
          break;
      }
    }

    (error as any).apiError = {
      errorType,
      userMessage,
      statusCode: error.response?.status,
    };

    return Promise.reject(error);
  }
);

export default api;
