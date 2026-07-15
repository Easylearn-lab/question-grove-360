import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { getLoginUrl } from "@/const";

// AKT-specific features
const AKT_FEATURES = [
  "Full AKT question bank access",
  "Note360 study notes (AKT)",
  "Pattern recognition flashcards",
  "AI Coach360 assistant",
  "Unlimited mock AKT exams",
  "Priority support",
];

// SCA-specific features
const SCA_FEATURES = [
  "Full SCA case bank access",
  "Note360 study notes (SCA)",
  "SCA consultation simulator",
  "AI Coach360 assistant",
  "Unlimited mock SCA consultations",
  "Priority support",
];

// Plan data — only 3-month and 6-month
const AKT_PLANS = [
  {
    key: "AKT_3MONTH",
    name: "3-Month",
    price: 20,
    fullPrice: "23.97",
    savings: "3.97",
    perMonth: "£6.67",
    interval: "3 months",
    description: "Great for focused exam sprints",
    popular: false,
  },
  {
    key: "AKT_6MONTH",
    name: "6-Month",
    price: 35,
    fullPrice: "47.94",
    savings: "12.94",
    perMonth: "£5.83",
    interval: "6 months",
    description: "Ideal study timeline",
    popular: true,
  },
];

const SCA_PLANS = [
  {
    key: "SCA_3MONTH",
    name: "3-Month",
    price: 20,
    fullPrice: "23.97",
    savings: "3.97",
    perMonth: "£6.67",
    interval: "3 months",
    description: "Great for focused exam sprints",
    popular: false,
  },
  {
    key: "SCA_6MONTH",
    name: "6-Month",
    price: 35,
    fullPrice: "47.94",
    savings: "12.94",
    perMonth: "£5.83",
    interval: "6 months",
    description: "Ideal study timeline",
    popular: true,
  },
];

export default function Pricing() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [activeTrack, setActiveTrack] = useState<"AKT" | "SCA">("AKT");
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();

  const handleCheckout = async (planKey: string) => {
    if (!isAuthenticated) {
      // Store the pending purchase intent so we can resume after login
      if (planKey.startsWith("SCA")) {
        localStorage.setItem("sca_pending_purchase", planKey);
        window.location.href = getLoginUrl("/sca");
      } else {
        localStorage.setItem("akt_pending_purchase", planKey);
        window.location.href = getLoginUrl("/pricing");
      }
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

  const plans = activeTrack === "AKT" ? AKT_PLANS : SCA_PLANS;
  const features = activeTrack === "AKT" ? AKT_FEATURES : SCA_FEATURES;
  const isTrackDisabled = false; // SCA payments now enabled

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          {isAuthenticated && (
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4">
            Choose Your Exam Track
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Get full access to all features for your chosen exam. Cancel anytime.
          </p>
          <p className="text-sm text-slate-500 mt-3">
            Reference rate: £7.99/month — all plans save you money vs monthly billing.
          </p>
        </div>

        {/* Track Selector */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-slate-100 rounded-xl p-1.5">
            <button
              onClick={() => setActiveTrack("AKT")}
              className={`px-6 sm:px-8 py-3 rounded-lg font-semibold text-sm transition-all ${
                activeTrack === "AKT"
                  ? "bg-green-600 text-gray-900 shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              AKT (Applied Knowledge Test)
            </button>
            <button
              onClick={() => setActiveTrack("SCA")}
              className={`px-6 sm:px-8 py-3 rounded-lg font-semibold text-sm transition-all ${
                activeTrack === "SCA"
                  ? "bg-green-600 text-gray-900 shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              SCA (Clinical Assessment)
            </button>
          </div>
        </div>

        {/* Coming Soon Banner for SCA */}
        {isTrackDisabled && (
          <div className="mb-10 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center max-w-2xl mx-auto">
            <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">SCA Track — Coming Soon</h3>
            <p className="text-sm text-slate-600">
              SCA content is being prepared. Pricing is shown for reference. Payment will be enabled once content is ready.
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-16">
          {plans.map((plan) => (
            <Card
              key={plan.key}
              className={`relative p-6 sm:p-8 rounded-2xl transition-all ${
                plan.popular
                  ? "ring-2 ring-green-500 shadow-2xl scale-[1.02]"
                  : "border border-slate-200 shadow-lg hover:shadow-xl"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-gray-900 px-4 py-1.5 text-xs font-bold">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Best Value
                </Badge>
              )}

              <div className="text-center mb-6 pt-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                  {plan.name}
                </h2>
                <p className="text-sm text-slate-500">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="mb-1">
                  <span className="text-4xl sm:text-5xl font-bold text-slate-900">
                    £{plan.price}
                  </span>
                </div>
                <div className="text-slate-600 text-sm mb-2">
                  for {plan.interval}
                </div>
                <div className="text-xs text-slate-500">
                  <span className="line-through">Usually £{plan.fullPrice}</span>
                  <span className="ml-2 text-green-600 font-semibold">
                    Save £{plan.savings}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  That's just {plan.perMonth}/month
                </div>
              </div>

              {/* Button */}
              {isTrackDisabled ? (
                <Button
                  disabled
                  className="w-full py-3 rounded-lg font-semibold text-base opacity-50 cursor-not-allowed"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              ) : (
                <Button
                  onClick={() => handleCheckout(plan.key)}
                  disabled={loadingPlan !== null}
                  className={`w-full py-3 rounded-lg font-semibold text-base transition-all ${
                    plan.popular
                      ? "bg-green-600 hover:bg-green-700 text-gray-900"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {loadingPlan === plan.key ? "Processing..." : "Get Started"}
                </Button>
              )}
            </Card>
          ))}
        </div>

        {/* Everything Included */}
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-sm mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
            Everything Included
          </h2>
          <p className="text-slate-500 text-center mb-8">
            Every plan gives you full access to all {activeTrack} features.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8 max-w-2xl mx-auto">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-slate-600">
                Yes, cancel your subscription at any time. You'll retain access until the end of your current billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-slate-600">
                We accept all major credit and debit cards through Stripe, including Visa, Mastercard, and American Express.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">How are the savings calculated?</h3>
              <p className="text-slate-600">
                All savings are compared to the standard monthly rate of £7.99/month. The longer your commitment, the more you save.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Can I switch plans?</h3>
              <p className="text-slate-600">
                Yes, you can upgrade or downgrade at any time. Contact support and we'll help you transition to a different plan.
              </p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm">
            Payments are processed securely by Stripe. Cancel anytime from your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
