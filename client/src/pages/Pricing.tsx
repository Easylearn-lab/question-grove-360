import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";

export default function Pricing() {
  const [, navigate] = useLocation();
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
        planKey: "QUARTERLY",
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

  const features = [
    "Full question bank access",
    "Unlimited mock exams",
    "Note360 study notes",
    "Pattern recognition flashcards",
    "SCA consultation simulator",
    "AI Coach360 assistant",
    "Priority support",
  ];

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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            One plan, full access. Everything you need to pass your exams.
          </p>
        </div>

        {/* Single Pricing Card */}
        <Card className="p-8 sm:p-12 rounded-2xl ring-2 ring-teal-500 shadow-2xl max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Best Value
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              3-Month Access
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Full access to all exam preparation resources
            </p>

            {/* Price Display */}
            <div className="mb-2">
              <span className="text-5xl sm:text-6xl font-bold text-slate-900 dark:text-white">
                £20
              </span>
              <span className="text-slate-600 dark:text-slate-400 ml-2 text-lg">
                / 3 months
              </span>
            </div>

            {/* Discount Reference */}
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
              <span className="line-through">Usually £23.97</span>
              <span className="ml-2 text-teal-600 dark:text-teal-400 font-semibold">
                Save £3.97 vs £7.99/month
              </span>
            </div>
          </div>

          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full mb-8 py-4 rounded-lg font-semibold text-lg bg-teal-600 hover:bg-teal-700 text-white transition-all"
          >
            {isLoading ? "Processing..." : "Get Started"}
          </Button>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 dark:text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* FAQ Section */}
        <div className="mt-16 bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Yes, cancel your subscription at any time. You'll retain access until the end of your 3-month billing period.
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
                Why only a 3-month plan?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                We believe 3 months is the ideal commitment for focused exam preparation. It gives you enough time to work through the material thoroughly while keeping you motivated with a clear timeline.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Is there a discount?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                The 3-month plan is already discounted from the £7.99/month rate (saving you £3.97). Coupon codes may also be available from admin on request.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Ready to start your exam preparation?
          </p>
          <Button
            onClick={() => isAuthenticated ? handleCheckout() : navigate("/dashboard")}
            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-lg font-semibold"
          >
            {isAuthenticated ? "Subscribe Now" : "Sign In to Get Started"}
          </Button>
        </div>
      </div>
    </div>
  );
}
