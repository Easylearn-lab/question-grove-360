import { useState } from "react";
import { trpc } from "../lib/trpc";

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function JAMBPaywall({ children }: { children: React.ReactNode }) {
  const { data: auth } = trpc.auth.me.useQuery();
  const { data: subscription, isLoading: isLoadingSubscription } = trpc.jamb.checkSubscription.useQuery(undefined, { enabled: !!auth });
  const { data: paymentContext, isLoading: isLoadingPaymentContext } = trpc.jamb.getPaymentContext.useQuery();
  const checkout = trpc.jamb.initializeCheckout.useMutation();
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "quarterly" | null>(null);

  const handleCheckout = async (plan: "monthly" | "quarterly") => {
    setLoadingPlan(plan);
    try {
      const result = await checkout.mutateAsync({ plan });
      window.open(result.authorizationUrl, "_blank", "noopener,noreferrer");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Payment initialisation failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  if (!auth) return <PaywallUI onCheckout={handleCheckout} loadingPlan={loadingPlan} requiresLogin paymentContext={paymentContext} isLoading={isLoadingPaymentContext} />;
  if (isLoadingSubscription || isLoadingPaymentContext) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500" /></div>;
  if (subscription?.hasAccess) return <>{children}</>;
  return <PaywallUI onCheckout={handleCheckout} loadingPlan={loadingPlan} paymentContext={paymentContext} isLoading={false} />;
}

function PaywallUI({ onCheckout, loadingPlan, requiresLogin, paymentContext, isLoading }: { onCheckout: (plan: "monthly" | "quarterly") => void; loadingPlan: string | null; requiresLogin?: boolean; paymentContext?: { currency: string | null; paymentProvider: string | null; plans: { monthly: { displayAmount: number; label: string; intervalLabel: string }; quarterly: { displayAmount: number; label: string; intervalLabel: string; savingsLabel?: string } }; }; isLoading: boolean }) {
  const currency = paymentContext?.currency || "NGN";
  const monthly = paymentContext?.plans.monthly;
  const quarterly = paymentContext?.plans.quarterly;
  return <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4"><div className="max-w-lg w-full"><div className="text-center mb-8"><span className="text-4xl mb-3 block">🎓</span><h1 className="text-2xl font-bold text-slate-900 mb-2">JAMB UTME Practice</h1><p className="text-slate-600">Get unlimited access to all 12 available JAMB subjects with one subscription.</p></div>
    {requiresLogin && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-center"><p className="text-sm text-amber-800">Please <a href="/pricing" className="font-bold underline">sign in</a> to subscribe and access JAMB questions.</p></div>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 text-center hover:border-green-400 transition-colors"><p className="text-sm text-slate-500 font-medium mb-1">{monthly?.label || "Monthly"}</p><p className="text-3xl font-bold text-slate-900 mb-1">{isLoading || !monthly ? "…" : formatAmount(monthly.displayAmount, currency)}</p><p className="text-xs text-slate-400 mb-4">{monthly?.intervalLabel || "per month"}</p><button onClick={() => onCheckout("monthly")} disabled={!!loadingPlan || requiresLogin || isLoading} className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg disabled:opacity-50">{loadingPlan === "monthly" ? "Loading…" : "Subscribe"}</button></div>
      <div className="bg-white rounded-xl border-2 border-green-400 p-6 text-center relative"><span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">{quarterly?.savingsLabel || "Best value"}</span><p className="text-sm text-slate-500 font-medium mb-1">{quarterly?.label || "Quarterly"}</p><p className="text-3xl font-bold text-slate-900 mb-1">{isLoading || !quarterly ? "…" : formatAmount(quarterly.displayAmount, currency)}</p><p className="text-xs text-slate-400 mb-4">{quarterly?.intervalLabel || "every 3 months"}</p><button onClick={() => onCheckout("quarterly")} disabled={!!loadingPlan || requiresLogin || isLoading} className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50">{loadingPlan === "quarterly" ? "Loading…" : "Subscribe & save"}</button></div>
    </div>
    <div className="bg-green-50 border border-green-100 rounded-xl p-5"><p className="text-sm font-bold text-green-800 mb-3">What you get:</p><ul className="space-y-2 text-sm text-green-700"><li>✓ All 12 JAMB subjects in one subscription</li><li>✓ CBT-style timed practice with answers and explanations</li><li>✓ Question navigators and subject-level review</li><li>✓ New questions added regularly</li></ul></div>
    <p className="text-xs text-slate-400 text-center mt-4">Secure payment via {paymentContext?.paymentProvider === "paystack" ? "Paystack" : "the configured payment provider"}. Cancel anytime.</p>
  </div></div>;
}
