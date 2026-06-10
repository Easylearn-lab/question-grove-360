import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export function useSubscription() {
  const { isAuthenticated } = useAuth();

  const subscriptionQuery = trpc.stripe.getSubscriptionStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  // "trialing" status = admin-issued 3-day coupon access
  const isPremium =
    subscriptionQuery.data?.status === "active" ||
    subscriptionQuery.data?.status === "trialing";

  return {
    isPremium,
    isLoading: subscriptionQuery.isLoading,
    status: subscriptionQuery.data?.status || "inactive",
    plan: subscriptionQuery.data?.plan || null,
  };
}
