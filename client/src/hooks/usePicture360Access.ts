import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export function usePicture360Access() {
  const { isAuthenticated } = useAuth();

  const accessQuery = trpc.stripe.getPicture360Access.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // Cache for 30 seconds (shorter for purchase flow responsiveness)
    retry: 1,
  });

  return {
    hasAccess: accessQuery.data?.hasAccess ?? false,
    status: accessQuery.data?.status ?? "no_purchase",
    expiresAt: accessQuery.data?.expiresAt ?? null,
    isLoading: accessQuery.isLoading,
    refetch: accessQuery.refetch,
  };
}
