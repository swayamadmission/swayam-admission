import axios, { AxiosError } from "axios";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";
const BASE_URL = API_URL.endsWith("/v1") ? API_URL : `${API_URL}/v1`;

export interface ApiErrorPayload {
  errorType: "TIMEOUT" | "NETWORK_ERROR" | "AUTH_ERROR" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR" | "UNKNOWN";
  userMessage: string;
  statusCode?: number;
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15 seconds timeout to prevent infinite pending requests
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("swayam_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with timeout, network, and status error classification
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    let errorType: ApiErrorPayload["errorType"] = "UNKNOWN";
    let userMessage = "An unexpected error occurred. Please try again.";

    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      errorType = "TIMEOUT";
      userMessage = "Request timed out. The server is taking longer than expected. Please try again.";
    } else if (!error.response && (error.request || error.code === "ERR_NETWORK")) {
      errorType = "NETWORK_ERROR";
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        userMessage = "You appear to be offline. Please check your internet connection.";
      } else {
        userMessage = "Unable to connect to the Swayam Admission server. Please try again in a moment.";
      }
    } else if (error.response) {
      const status = error.response.status;
      const serverMsg = error.response.data?.message;
      const requestUrl = error.config?.url || "";
      const isAuthOrPublicRequest =
        requestUrl.includes("/auth/") ||
        requestUrl.includes("/geography") ||
        requestUrl.includes("/health");

      switch (status) {
        case 401:
          errorType = "AUTH_ERROR";
          if (isAuthOrPublicRequest) {
            userMessage = typeof serverMsg === "string" ? serverMsg : "Invalid email/mobile or password.";
          } else {
            const refreshToken = localStorage.getItem("swayam_refresh_token");
            const originalRequest = error.config as any;
            if (refreshToken && originalRequest && !originalRequest._retry) {
              originalRequest._retry = true;
              return axios
                .post(`${BASE_URL}/auth/refresh`, { refreshToken })
                .then((res) => {
                  if (res.data?.access_token) {
                    localStorage.setItem("swayam_token", res.data.access_token);
                    if (res.data.refresh_token) {
                      localStorage.setItem("swayam_refresh_token", res.data.refresh_token);
                    }
                    originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
                    return api(originalRequest);
                  }
                  throw new Error("No token returned");
                })
                .catch(() => {
                  localStorage.removeItem("swayam_token");
                  localStorage.removeItem("swayam_refresh_token");
                  if (!window.location.pathname.includes("login") && window.location.pathname !== "/") {
                    window.dispatchEvent(new CustomEvent("swayam:unauthorized"));
                  }
                  return Promise.reject(error);
                });
            }

            userMessage = "Your session has expired. Please log in again.";
            localStorage.removeItem("swayam_token");
            localStorage.removeItem("swayam_refresh_token");
            if (!window.location.pathname.includes("login") && window.location.pathname !== "/") {
              window.dispatchEvent(new CustomEvent("swayam:unauthorized"));
            }
          }
          break;
        case 403:
          errorType = "FORBIDDEN";
          userMessage = typeof serverMsg === "string" ? serverMsg : "You do not have permission to view this section.";
          break;
        case 404:
          errorType = "NOT_FOUND";
          userMessage = typeof serverMsg === "string" ? serverMsg : "The requested resource could not be found.";
          break;
        case 422:
        case 400:
          errorType = "VALIDATION_ERROR";
          userMessage = Array.isArray(serverMsg) ? serverMsg.join(", ") : (typeof serverMsg === "string" ? serverMsg : "Invalid request data. Please verify your input.");
          break;
        case 429:
          errorType = "SERVER_ERROR";
          userMessage = "Too many requests. Please wait a moment and try again.";
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorType = "SERVER_ERROR";
          userMessage = "Login service is temporarily unavailable. Please try again in a moment.";
          break;
        default:
          userMessage = typeof serverMsg === "string" ? serverMsg : userMessage;
          break;
      }
    }

    // Attach parsed payload to error object for clean UI consumption
    (error as any).apiError = {
      errorType,
      userMessage,
      statusCode: error.response?.status,
    };

    return Promise.reject(error);
  }
);

export default api;

