import { useSubscription, SubscriptionEntry } from "./useSubscription";

export type ExamTrack = "AKT" | "SCA" | "MSRA" | "PLAB1";

/**
 * Hook that checks whether the current user has access to a specific exam track.
 * Each exam product (AKT, SCA, MSRA) requires its own subscription — paying for one
 * does NOT grant access to any other.
 *
 * MULTI-SUBSCRIPTION FIX (July 2026):
 * Previously checked a SINGLE plan from the profiles table, which broke when a user
 * had multiple subscriptions (the second overwrote the first).
 * Now checks ALL subscriptions — access is granted if ANY active/trialing subscription
 * matches the required track.
 *
 * Plan key → ExamTrack mapping:
 * - AKT_3MONTH, AKT_6MONTH → "AKT"
 * - SCA_3MONTH, SCA_6MONTH → "SCA"
 * - MSRA_3MONTH, MSRA_6MONTH → "MSRA"
 * - PLAB1_3MONTH, PLAB1_6MONTH → "PLAB1"
 */
export function useExamAccess(requiredTrack: ExamTrack) {
  const { isPremium, isLoading, status, plan, subscriptions } = useSubscription();

  // Check if ANY subscription matches the required track AND is active/trialing
  const hasAccess = subscriptions.some((sub) => {
    const isActive = sub.status === "active" || sub.status === "trialing";
    const matchesTrack = getExamTrackFromPlan(sub.plan) === requiredTrack;
    return isActive && matchesTrack;
  });

  // Get the user's active tracks (for cross-sell logic)
  const userExamTracks = subscriptions
    .filter((sub) => sub.status === "active" || sub.status === "trialing")
    .map((sub) => getExamTrackFromPlan(sub.plan))
    .filter((track): track is ExamTrack => track !== null);

  // Legacy single-track field (first active track)
  const userExamTrack = userExamTracks.length > 0 ? userExamTracks[0] : getExamTrackFromPlan(plan);

  return {
    hasAccess,
    isLoading,
    status,
    plan,
    userExamTrack,
    userExamTracks,
    subscriptions,
  };
}

/**
 * Extract the exam track from a plan key string.
 * Returns null if the plan is not recognized.
 */
export function getExamTrackFromPlan(plan: string | null): ExamTrack | null {
  if (!plan) return null;
  const upperPlan = plan.toUpperCase();
  if (upperPlan.startsWith("AKT")) return "AKT";
  if (upperPlan.startsWith("SCA")) return "SCA";
  if (upperPlan.startsWith("MSRA")) return "MSRA";
  if (upperPlan.startsWith("PLAB1") || upperPlan.startsWith("PLAB")) return "PLAB1";
  return null;
}
