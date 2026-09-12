import React from "react";
import { AlertCircle, WifiOff, ShieldAlert, FileQuestion, RotateCcw, ServerCrash } from "lucide-react";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: any;
  onRetry?: () => void;
  isRetrying?: boolean;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title,
  message,
  error,
  onRetry,
  isRetrying = false,
  compact = false,
  className = "",
}: ErrorStateProps) {
  // Extract parsed API error if available
  const apiError = error?.apiError;
  const status = error?.response?.status || apiError?.statusCode;
  const errorType = apiError?.errorType;

  // Determine user-friendly title and message based on error classification
  let displayTitle = title;
  let displayMessage = message || apiError?.userMessage;
  let IconComponent = AlertCircle;
  let iconBg = "bg-rose-50 text-rose-600";

  if (errorType === "TIMEOUT" || errorType === "NETWORK_ERROR") {
    IconComponent = WifiOff;
    iconBg = "bg-amber-50 text-amber-600";
    if (!displayTitle) displayTitle = "Connection Issue";
    if (!displayMessage) displayMessage = "Unable to connect to Swayam server. Please check your internet connection and try again.";
  } else if (errorType === "FORBIDDEN" || status === 403) {
    IconComponent = ShieldAlert;
    iconBg = "bg-purple-50 text-purple-600";
    if (!displayTitle) displayTitle = "Access Restricted";
    if (!displayMessage) displayMessage = "You do not have permission to view this section.";
  } else if (errorType === "NOT_FOUND" || status === 404) {
    IconComponent = FileQuestion;
    iconBg = "bg-slate-100 text-slate-600";
    if (!displayTitle) displayTitle = "Resource Not Found";
    if (!displayMessage) displayMessage = "The requested admission records could not be found.";
  } else if (errorType === "SERVER_ERROR" || status === 500) {
    IconComponent = ServerCrash;
    iconBg = "bg-rose-50 text-rose-600";
    if (!displayTitle) displayTitle = "Unable to Load Data";
    if (!displayMessage) displayMessage = "We encountered a temporary server issue. Please try again.";
  } else {
    if (!displayTitle) displayTitle = "Something Went Wrong";
    if (!displayMessage) displayMessage = error?.message || "Unable to load information. Please try again.";
  }

  if (compact) {
    return (
      <div className={`p-4 bg-white rounded-2xl border border-rose-100/80 shadow-xs flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <IconComponent size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#0F172A] truncate">{displayTitle}</p>
            <p className="text-[11px] text-gray-500 truncate">{displayMessage}</p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="px-3 py-1.5 bg-[#4A7B5B] hover:bg-[#3d674c] disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw size={12} className={isRetrying ? "animate-spin" : ""} />
            {isRetrying ? "Retrying..." : "Retry"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`text-center py-10 px-6 bg-white rounded-2xl border border-rose-100/80 shadow-xs max-w-lg mx-auto ${className}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${iconBg}`}>
        <IconComponent size={26} />
      </div>
      <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }} className="mb-1.5">
        {displayTitle}
      </h3>
      <p className="text-gray-500 text-xs max-w-sm mx-auto mb-5 leading-relaxed">
        {displayMessage}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4A7B5B] hover:bg-[#3d674c] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <RotateCcw size={14} className={isRetrying ? "animate-spin" : ""} />
          {isRetrying ? "Retrying..." : "Try Again"}
        </button>
      )}
    </div>
  );
}

export default ErrorState;
