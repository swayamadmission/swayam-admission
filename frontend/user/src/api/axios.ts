import axios, { AxiosError } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
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
    } else if (!error.response && error.request) {
      errorType = "NETWORK_ERROR";
      userMessage = "Unable to connect to Swayam server. Please check your internet connection and try again.";
    } else if (error.response) {
      const status = error.response.status;
      const serverMsg = error.response.data?.message;

      switch (status) {
        case 401:
          errorType = "AUTH_ERROR";
          userMessage = "Your session has expired. Please log in again.";
          localStorage.removeItem("swayam_token");
          if (!window.location.pathname.includes("login") && window.location.pathname !== "/") {
            // Avoid disruptive full reload if user is already browsing public pages
            window.dispatchEvent(new CustomEvent("swayam:unauthorized"));
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
        case 500:
        case 502:
        case 503:
        case 504:
          errorType = "SERVER_ERROR";
          userMessage = "Our admission services are currently experiencing high load. Please try again.";
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

