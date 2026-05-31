import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { PricingCard } from "@/components/PricingCard";

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Choose the plan that fits your exam preparation journey. All plans include a 7-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <PricingCard
            name="Starter"
            description="Perfect for beginners"
            price={9.99}
            planKey="STARTER"
            features={[
              "Access to Question Bank (limited)",
              "1 Mock Exam per month",
              "Basic Study Notes",
              "Email support",
            ]}
            trialDays={7}
          />
          <PricingCard
            name="Professional"
            description="Most popular for serious students"
            price={29.99}
            planKey="PROFESSIONAL"
            popular={true}
            features={[
              "Unlimited Question Bank access",
              "Unlimited Mock Exams",
              "Note360 Study Notes",
              "Pattern Recognition Flashcards",
              "Priority email support",
              "Weekly progress reports",
            ]}
            trialDays={7}
          />
          <PricingCard
            name="Elite"
            description="Complete exam mastery"
            price={59.99}
            planKey="ELITE"
            features={[
              "Everything in Professional",
              "SCA AI Consultation Simulator",
              "AI Coach360 (24/7 available)",
              "Real-time voice feedback",
              "1-on-1 strategy sessions (monthly)",
              "Personalized study plans",
              "Phone support",
            ]}
            trialDays={7}
          />
        </div>

        {/* FAQ Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
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
