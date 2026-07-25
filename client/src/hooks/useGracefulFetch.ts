import { useEffect } from "react";
import { toast } from "sonner";
import { hasActiveStudySession } from "@/contexts/StudySessionContext";

/**
 * Global fetch interceptor that prevents page reloads on network errors
 * during active study sessions. Instead shows a toast and retries silently.
 */
export function useGracefulFetch() {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      try {
        const response = await originalFetch.apply(this, args);

        // If we get a 502/503/504 during a study session, it's likely a cold start
        if (
          hasActiveStudySession() &&
          (response.status === 502 || response.status === 503 || response.status === 504)
        ) {
          console.warn("[GracefulFetch] Server cold start detected, retrying...");
          // Wait 2 seconds and retry once
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const retryResponse = await originalFetch.apply(this, args);
          if (retryResponse.ok) {
            return retryResponse;
          }
          // If retry also fails, show toast but don't reload
          toast.error("Connection issue. Your progress is saved locally.", {
            duration: 5000,
          });
          return retryResponse;
        }

        return response;
      } catch (error) {
        // Network error (offline, DNS failure, etc.)
        if (hasActiveStudySession()) {
          console.warn("[GracefulFetch] Network error during study session:", error);
          toast.error("Network issue detected. Your progress is saved. Will retry automatically.", {
            duration: 5000,
          });
          // Don't throw - return a fake failed response to prevent crashes
          return new Response(JSON.stringify({ error: "Network error" }), {
            status: 0,
            statusText: "Network Error",
          });
        }
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);
}
