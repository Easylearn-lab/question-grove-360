import { trpc } from "../lib/trpc";
import { useState } from "react";

export default function JAMBPaywall({ children }: { children: React.ReactNode }) {
  const { data: auth } = trpc.auth.me.useQuery();
  const { data: sub, isLoading } = trpc.jamb.checkSubscription.useQuery(undefined, {
    enabled: !!auth,
  });
  const checkout = trpc.jamb.initializeCheckout.useMutation();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (plan: "monthly" | "quarterly") => {
    setLoadingPlan(plan);
    try {
      const result = await checkout.mutateAsync({ plan });
      window.open(result.authorizationUrl, "_blank");
    } catch (err: any) {
      alert(err.message || "Payment initialization failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  // Not logged in — show paywall
  if (!auth) {
    return <PaywallUI onCheckout={handleCheckout} loadingPlan={loadingPlan} requiresLogin />;
  }

  // Loading subscription status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500" />
      </div>
    );
  }

  // Has active subscription — show content
  if (sub?.hasAccess) {
    return <>{children}</>;
  }

  // No subscription — show paywall
  return <PaywallUI onCheckout={handleCheckout} loadingPlan={loadingPlan} />;
}

function PaywallUI({
  onCheckout,
  loadingPlan,
  requiresLogin,
}: {
  onCheckout: (plan: "monthly" | "quarterly") => void;
  loadingPlan: string | null;
  requiresLogin?: boolean;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl mb-3 block">🎓</span>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            JAMB UTME Practice
          </h1>
          <p className="text-gray-600">
            Get unlimited access to all JAMB subjects — Biology, English, Chemistry, and Physics — with one subscription.
          </p>
        </div>

        {requiresLogin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-amber-800">
              Please <a href="/pricing" className="font-bold underline">sign in</a> to subscribe and access JAMB questions.
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Monthly */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6 text-center hover:border-green-400 transition-colors">
            <p className="text-sm text-gray-500 font-medium mb-1">Monthly</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">₦1,500</p>
            <p className="text-xs text-gray-400 mb-4">per month</p>
            <button
              onClick={() => onCheckout("monthly")}
              disabled={!!loadingPlan || requiresLogin}
              className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPlan === "monthly" ? "Loading..." : "Subscribe"}
            </button>
          </div>

          {/* Quarterly */}
          <div className="bg-white rounded-xl border-2 border-green-400 p-6 text-center relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
              Save 11%
            </span>
            <p className="text-sm text-gray-500 font-medium mb-1">Quarterly</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">₦4,000</p>
            <p className="text-xs text-gray-400 mb-4">every 3 months</p>
            <button
              onClick={() => onCheckout("quarterly")}
              disabled={!!loadingPlan || requiresLogin}
              className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPlan === "quarterly" ? "Loading..." : "Subscribe & Save"}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="bg-green-50 border border-green-100 rounded-xl p-5">
          <p className="text-sm font-bold text-green-800 mb-3">What you get:</p>
          <ul className="space-y-2 text-sm text-green-700">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> All JAMB subjects (Biology, English, Chemistry, Physics)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> CBT-style timed practice matching real exam format
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Detailed explanations for every question
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Topic-by-topic breakdown and progress tracking
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> New questions added regularly
            </li>
          </ul>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Secure payment via Paystack. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

