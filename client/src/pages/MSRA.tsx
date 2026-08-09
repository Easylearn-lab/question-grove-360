import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Brain, CheckCircle2, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const MSRA_HIGHLIGHTS = [
  "Clinical Problem Solving (SBA + EMQ)",
  "Professional Dilemmas (Ranking + Pick 3)",
  "MSRA Flashcards with spaced repetition",
  "AI Coach360 study assistant",
  "Full mock MSRA exams",
  "Detailed performance analytics",
];

const MSRA_PLANS = [
  {
    key: "MSRA_3MONTH",
    name: "3-Month",
    price: 25,
    fullPrice: "23.97",
    savings: "Save vs monthly",
    perMonth: "£8.33",
    interval: "3 months",
    description: "Great for focused exam sprints",
    popular: false,
  },
  {
    key: "MSRA_6MONTH",
    name: "6-Month",
    price: 40,
    fullPrice: "47.94",
    savings: "Best value",
    perMonth: "£6.67",
    interval: "6 months",
    description: "Ideal study timeline",
    popular: true,
  },
];

export default function MSRA() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();

  const handleCheckout = async (planKey: string) => {
    if (!isAuthenticated) {
      localStorage.setItem("msra_pending_purchase", planKey);
      window.location.href = getLoginUrl("/msra");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">MSRA Question Bank</h1>
              <p className="text-sm text-slate-500">Multi-Specialty Recruitment Assessment</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Banner */}
        <Card className="p-8 sm:p-12 text-center mb-10 border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <CheckCircle2 className="w-4 h-4" />
            Now Available
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            MSRA Preparation
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Comprehensive Clinical Problem Solving and Professional Dilemmas question bank.
            Start preparing for your MSRA today.
          </p>
        </Card>

        {/* What's Included */}
        <Card className="p-8 sm:p-10 mb-10">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-600" />
            What's Included
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {MSRA_HIGHLIGHTS.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">{feature}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {MSRA_PLANS.map((plan) => (
            <Card
              key={plan.key}
              className={`relative p-6 sm:p-8 rounded-2xl transition-all ${
                plan.popular
                  ? "ring-2 ring-green-500 shadow-2xl scale-[1.02]"
                  : "border border-slate-200 shadow-lg hover:shadow-xl"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-1.5 text-xs font-bold rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Best Value
                </div>
              )}

              <div className="text-center mb-6 pt-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                  {plan.name}
                </h2>
                <p className="text-sm text-slate-500">{plan.description}</p>
              </div>

              <div className="text-center mb-6">
                <div className="mb-1">
                  <span className="text-4xl sm:text-5xl font-bold text-slate-900">
                    £{plan.price}
                  </span>
                </div>
                <div className="text-slate-600 text-sm mb-2">
                  for {plan.interval}
                </div>
                <div className="text-xs text-green-600 font-semibold">
                  {plan.savings}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  That's just {plan.perMonth}/month
                </div>
              </div>

              <Button
                onClick={() => handleCheckout(plan.key)}
                disabled={loadingPlan !== null}
                className={`w-full py-3 rounded-lg font-semibold text-base transition-all ${
                  plan.popular
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                {loadingPlan === plan.key ? "Processing..." : "Get Started"}
              </Button>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
