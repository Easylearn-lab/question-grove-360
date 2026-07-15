import { useSubscription } from "./useSubscription";

export type ExamTrack = "AKT" | "SCA";

/**
 * Hook that checks whether the current user has access to a specific exam track.
 * Each exam product (AKT, SCA) requires its own subscription — paying for one
 * does NOT grant access to any other.
 *
 * Plan key → ExamTrack mapping:
 * - AKT_3MONTH, AKT_6MONTH → "AKT"
 * - SCA_3MONTH, SCA_6MONTH → "SCA"
 */
export function useExamAccess(requiredTrack: ExamTrack) {
  const { isPremium, isLoading, status, plan } = useSubscription();

  // Derive the exam track from the plan key
  const userExamTrack = getExamTrackFromPlan(plan);

  // Access is granted only if:
  // 1. The subscription is active/trialing (isPremium)
  // 2. The subscription plan matches the required exam track
  const hasAccess = isPremium && userExamTrack === requiredTrack;

  return {
    hasAccess,
    isLoading,
    status,
    plan,
    userExamTrack,
  };
}

/**
 * Extract the exam track from a plan key string.
 * Returns null if the plan is not recognized.
 */
function getExamTrackFromPlan(plan: string | null): ExamTrack | null {
  if (!plan) return null;
  const upperPlan = plan.toUpperCase();
  if (upperPlan.startsWith("AKT")) return "AKT";
  if (upperPlan.startsWith("SCA")) return "SCA";
  return null;
}
