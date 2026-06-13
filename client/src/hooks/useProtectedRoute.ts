import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

/**
 * Hook for protected pages that ensures auth is fully resolved before redirecting.
 * Prevents race conditions where pages redirect to / before the session cookie is checked.
 */
export function useProtectedRoute() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Wait for auth query to complete before checking authentication
    if (loading) return;
    
    // Only redirect after we know for sure the user is not authenticated
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  return {
    user,
    isAuthenticated,
    loading,
    isReady: !loading, // True when auth check is complete
  };
}
