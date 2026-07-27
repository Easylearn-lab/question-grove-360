import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export interface SubscriptionEntry {
  plan: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
}

export function useSubscription() {
  const { isAuthenticated } = useAuth();

  const subscriptionQuery = trpc.stripe.getSubscriptionStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  const subscriptions: SubscriptionEntry[] = subscriptionQuery.data?.subscriptions || [];

  // A user is "premium" if they have ANY active or trialing subscription
  const isPremium = subscriptions.some(
    (sub) => sub.status === "active" || sub.status === "trialing"
  );

  // Legacy single-plan fields for backward compatibility
  const status = subscriptionQuery.data?.status || "inactive";
  const plan = subscriptionQuery.data?.plan || null;

  return {
    isPremium,
    isLoading: subscriptionQuery.isLoading,
    status,
    plan,
    subscriptions,
  };
}
