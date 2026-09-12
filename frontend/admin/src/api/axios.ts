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
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle responses and errors without creating reload loops
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    let errorType: ApiErrorPayload["errorType"] = "UNKNOWN";
    let userMessage = "An unexpected error occurred. Please try again.";

    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      errorType = "TIMEOUT";
      userMessage = "Authentication request timed out. Please try again.";
    } else if (!error.response && error.request) {
      errorType = "NETWORK_ERROR";
      userMessage = "Unable to connect to the authentication service. Please ensure the backend server is running.";
    } else if (error.response) {
      const status = error.response.status;
      const serverMsg = error.response.data?.message;

      switch (status) {
        case 401:
          errorType = "AUTH_ERROR";
          userMessage = typeof serverMsg === "string" ? serverMsg : "Invalid email/mobile or password.";
          
          const requestUrl = error.config?.url || "";
          const isAuthOrPublicRequest =
            requestUrl.includes("/auth/") ||
            requestUrl.includes("/geography") ||
            requestUrl.includes("/staff-onboarding/allowed-roles") ||
            requestUrl.includes("/staff-onboarding/register") ||
            requestUrl.includes("/health");

          // Only clear token if not already attempting login
          if (!isAuthOrPublicRequest) {
            localStorage.removeItem("swayam_token");
          }
          break;

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
