import { ReactNode, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Zap, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ExamTrack, getExamTrackFromPlan } from "@/hooks/useExamAccess";

interface CrossSellGateProps {
  hasAccess: boolean;
  children: ReactNode;
  requiredTrack: ExamTrack;
  featureName: string;
}

/**
 * A subscription gate that shows targeted cross-sell messages for users
 * who have the OTHER exam subscription. For users with no subscription,
 * it shows the generic upgrade prompt.
 *
 * MULTI-SUBSCRIPTION FIX (July 2026):
 * Now uses the subscriptions array to determine which tracks the user has,
 * instead of a single plan string.
 */
export function CrossSellGate({
  hasAccess,
  children,
  requiredTrack,
  featureName,
}: CrossSellGateProps) {
  const [, navigate] = useLocation();
  const { isPremium, subscriptions } = useSubscription();
  const { isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();

  // If user has access, show children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Determine if user has ANY other active subscription (for cross-sell)
  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === "active" || sub.status === "trialing"
  );
  const userTracks = activeSubscriptions
    .map((sub) => getExamTrackFromPlan(sub.plan))
    .filter((track): track is ExamTrack => track !== null);

  const hasOtherSubscription = isPremium && userTracks.length > 0 && !userTracks.includes(requiredTrack);

  const handleCheckout = async (planKey: string) => {
    if (!isAuthenticated) {
      navigate("/pricing");
      return;
    }
    setLoadingPlan(planKey);
    try {
      const result = await createCheckout.mutateAsync({ planKey });
      if (result.url) {
        toast.info("Redirecting to checkout...");
        window.location.href = result.url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error?.message || "Failed to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  // Cross-sell: user has the other subscription
  if (hasOtherSubscription) {
    const otherTrackNames = userTracks.join(" & ");
    const targetTrackName = requiredTrack === "AKT" ? "MRCGP AKT" : requiredTrack === "SCA" ? "SCA Simulator" : requiredTrack === "PLAB1" ? "PLAB 1" : "MSRA";
    const plan3mo = requiredTrack === "SCA" ? "SCA_3MONTH" : requiredTrack === "AKT" ? "AKT_3MONTH" : requiredTrack === "PLAB1" ? "PLAB1_3MONTH" : "MSRA_3MONTH";
    const plan6mo = requiredTrack === "SCA" ? "SCA_6MONTH" : requiredTrack === "AKT" ? "AKT_6MONTH" : requiredTrack === "PLAB1" ? "PLAB1_6MONTH" : "MSRA_6MONTH";

    return (
      <Card className="p-12 border-slate-200 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
          <Zap className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Add {targetTrackName}</h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          You have an active {otherTrackNames} subscription. Add {targetTrackName} for{" "}
          <span className="font-semibold">£20 for 3 months</span> or{" "}
          <span className="font-semibold">£35 for 6 months</span>.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => handleCheckout(plan3mo)}
            disabled={!!loadingPlan}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {loadingPlan === plan3mo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Subscribe to {requiredTrack} — £20 / 3 months
          </Button>
          <Button
            onClick={() => handleCheckout(plan6mo)}
            disabled={!!loadingPlan}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-2"
          >
            {loadingPlan === plan6mo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Subscribe to {requiredTrack} — £35 / 6 months
          </Button>
        </div>
      </Card>
    );
  }

  // Generic gate: no subscription at all
  return (
    <Card className="p-12 border-slate-200 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
        <Lock className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Premium Feature</h3>
      <p className="text-slate-600 mb-6 max-w-sm mx-auto">
        {featureName} is available with a premium subscription. Upgrade now to unlock unlimited access.
      </p>
      <Button
        onClick={() => navigate("/pricing")}
        className="bg-green-600 hover:bg-green-700 text-white gap-2"
      >
        <Zap className="w-4 h-4" />
        View Plans & Subscribe
      </Button>
    </Card>
  );
}
