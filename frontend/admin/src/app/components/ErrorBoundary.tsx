import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error in component boundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-900 space-y-4 max-w-3xl mx-auto shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-rose-950">
                {this.props.fallbackTitle || "Document Module Component Error"}
              </h2>
              <p className="text-xs text-rose-700">
                A runtime exception occurred while rendering this module section.
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-4 bg-white/80 rounded-xl border border-rose-200 text-xs font-mono overflow-x-auto max-h-48">
              <div className="font-bold text-rose-800 mb-1">{this.state.error.toString()}</div>
              {this.state.errorInfo?.componentStack && (
                <div className="text-rose-600 whitespace-pre-wrap text-[11px] mt-2">
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
            >
              <RefreshCw size={14} /> Reload Page & Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
