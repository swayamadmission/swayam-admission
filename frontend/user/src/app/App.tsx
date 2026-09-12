import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { router } from "./routes";
import { AuthProvider } from "../context/AuthContext";
import { PublicSettingsProvider } from "../context/PublicSettingsContext";
import ErrorBoundary from "./components/ui/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Do NOT retry for permanent client errors (400, 401, 403, 404, 422)
        const status = error?.response?.status || error?.apiError?.statusCode;
        if (status && status >= 400 && status < 500) {
          return false;
        }
        // Retry at most 1 time for transient network/server errors
        return failureCount < 1;
      },
      staleTime: 3 * 60 * 1000, // 3 minutes
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PublicSettingsProvider>
            <RouterProvider router={router} />
          </PublicSettingsProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

