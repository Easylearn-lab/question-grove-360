import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";

type PlanKey = "SINGLE_EXAM_MONTHLY" | "SINGLE_EXAM_3MONTH" | "UK_ALL_ACCESS_MONTHLY" | "UK_ALL_ACCESS_3MONTH" | "INTERNATIONAL_MONTHLY" | "INTERNATIONAL_3MONTH";

interface PlanInfo {
  name: string;
  description: string;
  price: number;
  interval: string;
  planKey: PlanKey;
  features: string[];
  highlighted?: boolean;
}

const plans: PlanInfo[] = [
  {
    name: "Single Exam Monthly",
    description: "Access to a single exam preparation track",
    price: 7.99,
    interval: "/month",
    planKey: "SINGLE_EXAM_MONTHLY",
    features: [
      "Access to one exam question bank",
      "Mock exams for selected exam",
      "Basic study notes",
      "Email support",
    ],
  },
  {
    name: "Single Exam 3-Month",
    description: "Access to a single exam - save with 3-month plan",
    price: 20,
    interval: "/3 months",
    planKey: "SINGLE_EXAM_3MONTH",
    features: [
      "Access to one exam question bank",
      "Mock exams for selected exam",
      "Basic study notes",
      "Email support",
      "Save vs monthly",
    ],
  },
  {
    name: "UK All-Access Monthly",
    description: "Full access to all UK exam tracks",
    price: 39.99,
    interval: "/month",
    planKey: "UK_ALL_ACCESS_MONTHLY",
    highlighted: true,
    features: [
      "All UK exam question banks",
      "Unlimited mock exams",
      "Note360 study notes",
      "Pattern recognition flashcards",
      "SCA consultation simulator",
      "Priority support",
    ],
  },
  {
    name: "UK All-Access 3-Month",
    description: "Full UK access - save with 3-month plan",
    price: 99.99,
    interval: "/3 months",
    planKey: "UK_ALL_ACCESS_3MONTH",
    features: [
      "All UK exam question banks",
      "Unlimited mock exams",
      "Note360 study notes",
      "Pattern recognition flashcards",
      "SCA consultation simulator",
      "Priority support",
      "Save vs monthly",
    ],
  },
  {
    name: "International Monthly",
    description: "Full access to all international exam tracks",
    price: 39.99,
    interval: "/month",
    planKey: "INTERNATIONAL_MONTHLY",
    features: [
      "All international exam question banks",
      "Unlimited mock exams",
      "Note360 study notes",
      "Pattern recognition flashcards",
      "AI Coach360 assistant",
      "Priority support",
    ],
  },
  {
    name: "International 3-Month",
    description: "Full international access - save with 3-month plan",
    price: 99.99,
    interval: "/3 months",
    planKey: "INTERNATIONAL_3MONTH",
    features: [
      "All international exam question banks",
      "Unlimited mock exams",
      "Note360 study notes",
      "Pattern recognition flashcards",
      "AI Coach360 assistant",
      "Priority support",
      "Save vs monthly",
    ],
  },
];

function PlanCard({ plan }: { plan: PlanInfo }) {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createCheckout.mutateAsync({
        planKey: plan.planKey,
      });

      if (result.url) {
        window.open(result.url, "_blank");
        toast.success("Redirecting to checkout...");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error?.message || "Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className={`flex flex-col p-6 sm:p-8 rounded-2xl transition-all duration-300 ${
        plan.highlighted
          ? "ring-2 ring-teal-500 shadow-2xl"
          : "hover:shadow-lg"
      }`}
    >
      {plan.highlighted && (
        <div className="mb-4 inline-block">
          <span className="bg-teal-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}

      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-1">
        {plan.name}
      </h3>
      <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">{plan.description}</p>

      <div className="mb-6">
        <span className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">
          £{plan.price % 1 === 0 ? plan.price : plan.price.toFixed(2)}
        </span>
        <span className="text-slate-600 dark:text-slate-400 ml-2">{plan.interval}</span>
      </div>

      <Button
        onClick={handleCheckout}
        disabled={isLoading}
        className={`w-full mb-6 py-3 rounded-lg font-semibold transition-all ${
          plan.highlighted
            ? "bg-teal-600 hover:bg-teal-700 text-white"
            : "bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white"
        }`}
      >
        {isLoading ? "Processing..." : "Get Started"}
      </Button>

      <div className="space-y-3 flex-1">
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-slate-700 dark:text-slate-300">{feature}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Pricing() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Choose the plan that fits your exam preparation journey. Coupon codes available from admin on request.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16">
          {plans.map((plan) => (
            <PlanCard key={plan.planKey} plan={plan} />
          ))}
        </div>

        {/* FAQ Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Yes, cancel your subscription at any time. You'll retain access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                We accept all major credit and debit cards through Stripe, including Visa, Mastercard, and American Express.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Is there a student discount?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Contact our support team for potential student discounts and special offers.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Can I upgrade or downgrade?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Yes, you can change your plan at any time. Changes take effect on your next billing cycle.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Not sure which plan is right for you?
          </p>
          <Button
            onClick={() => navigate("/dashboard")}
            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-lg font-semibold"
          >
            {isAuthenticated ? "Go to Dashboard" : "Sign In to Get Started"}
          </Button>
        </div>
      </div>
    </div>
  );
}
