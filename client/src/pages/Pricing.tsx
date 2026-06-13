import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, Sparkles, Star } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";

const plans = [
  {
    key: "QUARTERLY",
    name: "3-Month",
    price: 20,
    fullPrice: 23.97,
    savings: 3.97,
    perMonth: "£6.67",
    interval: "3 months",
    description: "Great for focused exam prep sprints",
    badge: null,
    featured: false,
  },
  {
    key: "BIANNUAL",
    name: "6-Month",
    price: 35,
    fullPrice: 47.94,
    savings: 12.94,
    perMonth: "£5.83",
    interval: "6 months",
    description: "Most popular — ideal study timeline",
    badge: "Most Popular",
    featured: true,
  },
  {
    key: "ANNUAL",
    name: "Annual",
    price: 60,
    fullPrice: 95.88,
    savings: 35.88,
    perMonth: "£5.00",
    interval: "12 months",
    description: "Best value — full year of preparation",
    badge: "Best Value",
    featured: false,
  },
];

const features = [
  "Full question bank access",
  "Unlimited mock exams",
  "Note360 study notes",
  "Pattern recognition flashcards",
  "SCA consultation simulator",
  "AI Coach360 assistant",
  "Priority support",
];

export default function Pricing() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();

  const handleCheckout = async (planKey: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setLoadingPlan(planKey);
    try {
      const result = await createCheckout.mutateAsync({
        planKey,
      });

      if (result.url) {
        window.open(result.url, "_blank");
        toast.success("Redirecting to checkout...");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error?.message || "Failed to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Choose the plan that fits your exam preparation timeline. All plans include full access to every feature.
          </p>
          <p className="text-sm text-slate-500 mt-3">
            Reference rate: £7.99/month — all plans save you money vs monthly billing.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => (
            <Card
              key={plan.key}
              className={`relative p-6 sm:p-8 rounded-2xl transition-all ${
                plan.featured
                  ? "ring-2 ring-teal-500 shadow-2xl scale-[1.02]"
                  : "border border-slate-200 shadow-lg hover:shadow-xl"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1.5 bg-teal-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                    {plan.key === "ANNUAL" ? <Star className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                    {plan.badge}
                  </div>
                </div>
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
                  <span className="line-through">Usually £{plan.fullPrice.toFixed(2)}</span>
                  <span className="ml-2 text-teal-600 font-semibold">
                    Save £{plan.savings.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  That's just {plan.perMonth}/month
                </div>
              </div>

              <Button
                onClick={() => handleCheckout(plan.key)}
                disabled={loadingPlan !== null}
                className={`w-full py-3 rounded-lg font-semibold text-base transition-all ${
                  plan.featured
                    ? "bg-teal-600 hover:bg-teal-700 text-white"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                {loadingPlan === plan.key ? "Processing..." : "Get Started"}
              </Button>
            </Card>
          ))}
        </div>

        {/* Features List */}
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-sm mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
            Everything Included
          </h2>
          <p className="text-slate-500 text-center mb-8">
            Every plan gives you full, unrestricted access to all features.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
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
              <h3 className="font-semibold text-slate-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-600">
                Yes, cancel your subscription at any time. You'll retain access until the end of your current billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-600">
                We accept all major credit and debit cards through Stripe, including Visa, Mastercard, and American Express.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                How are the savings calculated?
              </h3>
              <p className="text-slate-600">
                All savings are compared to the standard monthly rate of £7.99/month. The longer your commitment, the more you save — up to 37% off with the annual plan.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                Can I switch plans?
              </h3>
              <p className="text-slate-600">
                Yes, you can upgrade or downgrade at any time. Contact support and we'll help you transition to a different plan.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm">
            3-day access coupons available from admin on request
          </p>
        </div>
      </div>
    </div>
  );
}
