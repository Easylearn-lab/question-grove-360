import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const PLANS = [
  {
    name: "Starter",
    price: 29,
    period: "month",
    description: "Perfect for getting started",
    features: [
      "Access to Question Bank (5,000 questions)",
      "Basic filtering and search",
      "Tutor mode only",
      "Email support",
      "1 mock exam per month",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Professional",
    price: 79,
    period: "month",
    description: "Most popular for active learners",
    features: [
      "Full Question Bank (50,000+ questions)",
      "Tutor & Exam modes",
      "Advanced filtering by specialty, difficulty, tags",
      "Unlimited mock exams",
      "Note360 study notes",
      "Pattern Recognition flashcards with SRS",
      "SCA AI Consultation Simulator",
      "Priority email support",
      "Performance analytics",
      "Study streak tracking",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Premium",
    price: 149,
    period: "month",
    description: "For serious exam preparation",
    features: [
      "Everything in Professional",
      "AI Coach360 - unlimited AI consultation",
      "1-on-1 mentorship (2 sessions/month)",
      "Custom study plans",
      "Video explanations for all questions",
      "Live group study sessions",
      "Priority support (phone & chat)",
      "Early access to new features",
      "Unlimited PDF reports",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
];

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleSubscribe = async (planName: string) => {
    if (!isAuthenticated) {
      navigate("/");
      toast.error("Please sign in to subscribe");
      return;
    }

    toast.loading("Redirecting to payment...");
    // In production, this would call a tRPC endpoint to create a Stripe checkout session
    setTimeout(() => {
      toast.success("Subscription initiated!");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Pricing</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Transparent Pricing for Every Learner
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Choose the plan that fits your exam preparation needs. All plans include a 7-day free trial.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-4 bg-white rounded-lg p-2 border border-slate-200">
            <button className="px-6 py-2 rounded-lg bg-teal-600 text-white font-medium">
              Monthly
            </button>
            <button className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
              Annually
            </button>
            <span className="text-sm text-green-600 font-medium ml-2">Save 20%</span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={`p-8 border-slate-200 transition-all ${
                plan.highlighted
                  ? "ring-2 ring-teal-600 shadow-xl scale-105"
                  : "hover:shadow-lg"
              }`}
            >
              {plan.highlighted && (
                <div className="mb-4 inline-block px-3 py-1 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}

              <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <p className="text-sm text-slate-600 mb-6">{plan.description}</p>

              <div className="mb-6">
                <span className="text-5xl font-bold text-slate-900">${plan.price}</span>
                <span className="text-slate-600 ml-2">/{plan.period}</span>
              </div>

              <Button
                onClick={() => handleSubscribe(plan.name)}
                className={`w-full mb-8 ${
                  plan.highlighted
                    ? "bg-teal-600 hover:bg-teal-700 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                }`}
              >
                {plan.cta}
              </Button>

              <div className="space-y-4">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-lg border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes, you can cancel your subscription at any time. No questions asked.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, PayPal, and Apple Pay.",
              },
              {
                q: "Is there a free trial?",
                a: "Yes, all plans include a 7-day free trial. No credit card required to start.",
              },
              {
                q: "Can I upgrade or downgrade my plan?",
                a: "Absolutely! You can change your plan at any time, and we'll prorate the charges.",
              },
            ].map((faq, idx) => (
              <div key={idx}>
                <h3 className="font-bold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
