import { useState, useEffect, useRef } from "react";
import { Wifi, WifiOff } from "lucide-react";

/**
 * A small, non-intrusive banner that appears at the top of study pages
 * when the server connection is lost (cold start, network issue).
 * Disappears automatically when the connection is restored.
 */
export function ReconnectingBanner() {
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Listen for online/offline events
    const handleOffline = () => {
      setIsDisconnected(true);
      setIsRestoring(false);
    };

    const handleOnline = () => {
      setIsRestoring(true);
      // Give a brief moment to confirm connection, then hide
      hideTimeoutRef.current = setTimeout(() => {
        setIsDisconnected(false);
        setIsRestoring(false);
      }, 1500);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Also intercept fetch errors to detect cold starts
    const originalFetch = window.fetch;
    let consecutiveFailures = 0;

    const patchedFetch: typeof window.fetch = async function (this: typeof globalThis, ...args) {
      try {
        const response = await originalFetch.apply(this, args);
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          consecutiveFailures++;
          if (consecutiveFailures >= 1) {
            setIsDisconnected(true);
            setIsRestoring(false);
          }
        } else {
          if (consecutiveFailures > 0 && isDisconnected) {
            // Connection restored
            setIsRestoring(true);
            hideTimeoutRef.current = setTimeout(() => {
              setIsDisconnected(false);
              setIsRestoring(false);
            }, 1500);
          }
          consecutiveFailures = 0;
        }
        return response;
      } catch (error) {
        consecutiveFailures++;
        if (consecutiveFailures >= 1) {
          setIsDisconnected(true);
          setIsRestoring(false);
        }
        throw error;
      }
    };

    window.fetch = patchedFetch;

    // Periodic health ping every 30s to detect recovery
    pingIntervalRef.current = setInterval(async () => {
      if (!isDisconnected) return;
      try {
        const res = await originalFetch("/api/trpc/auth.me", {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok || res.status === 401) {
          // Server is responding (even 401 means it's alive)
          consecutiveFailures = 0;
          setIsRestoring(true);
          hideTimeoutRef.current = setTimeout(() => {
            setIsDisconnected(false);
            setIsRestoring(false);
          }, 1500);
        }
      } catch {
        // Still disconnected, keep banner visible
      }
    }, 10000);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.fetch = originalFetch;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isDisconnected]);

  if (!isDisconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ease-out ${
        isRestoring ? "translate-y-0 opacity-100" : "translate-y-0 opacity-100"
      }`}
    >
      <div
        className={`px-4 py-2 text-center text-sm font-medium transition-colors duration-300 ${
          isRestoring
            ? "bg-green-100 text-green-800 border-b border-green-200"
            : "bg-amber-50 text-amber-800 border-b border-amber-200"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {isRestoring ? (
            <>
              <Wifi className="w-4 h-4 text-green-600" />
              <span>Connection restored. You're all set.</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Reconnecting... Your progress is saved. This is normal and will resolve in a few seconds.</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
