import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { INACTIVITY_TIMEOUT_MS } from "@shared/const";

const ACTIVITY_REFRESH_INTERVAL = 1000 * 60 * 15; // Refresh session every 15 minutes of activity
const LOCAL_STORAGE_KEY = "qg360_last_activity";

export function ActivityTracker() {
  const lastRefreshRef = useRef(Date.now());
  const refreshMutation = trpc.auth.refreshActivity.useMutation();

  useEffect(() => {
    // Check if session has expired on mount
    const lastActivity = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > INACTIVITY_TIMEOUT_MS) {
        // Session expired due to inactivity — redirect to home with message
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        window.location.href = "/?session_expired=1";
        return;
      }
    }

    // Update local activity timestamp
    const updateActivity = () => {
      const now = Date.now();
      localStorage.setItem(LOCAL_STORAGE_KEY, now.toString());

      // Refresh server-side session token every 15 minutes of activity
      if (now - lastRefreshRef.current > ACTIVITY_REFRESH_INTERVAL) {
        lastRefreshRef.current = now;
        refreshMutation.mutate();
      }
    };

    // Track user activity events
    const events = ["mousedown", "keydown", "scroll", "touchstart", "pointermove"];
    events.forEach((event) => window.addEventListener(event, updateActivity, { passive: true }));

    // Set initial activity
    updateActivity();

    // Periodic check for inactivity (every 60 seconds)
    const intervalId = setInterval(() => {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const elapsed = Date.now() - parseInt(stored, 10);
        if (elapsed > INACTIVITY_TIMEOUT_MS) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          window.location.href = "/?session_expired=1";
        }
      }
    }, 60_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, updateActivity));
      clearInterval(intervalId);
    };
  }, []);

  return null; // Invisible component
}
