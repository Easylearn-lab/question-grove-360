import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";

interface PricingCardProps {
  name: string;
  description: string;
  price: number;
  features: string[];
  planKey: "STARTER" | "PROFESSIONAL" | "ELITE";
  popular?: boolean;
  trialDays?: number;
}

export function PricingCard({
  name,
  description,
  price,
  features,
  planKey,
  popular,
  trialDays,
}: PricingCardProps) {
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
        planKey,
        trialDays,
      });

      if (result.url) {
        window.open(result.url, "_blank");
        toast.success("Redirecting to checkout...");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className={`flex flex-col p-8 rounded-2xl transition-all duration-300 ${
        popular
          ? "ring-2 ring-teal-500 shadow-2xl scale-105"
          : "hover:shadow-lg"
      }`}
    >
      {popular && (
        <div className="mb-4 inline-block">
          <span className="bg-teal-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}

      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        {name}
      </h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">{description}</p>

      <div className="mb-6">
        <span className="text-5xl font-bold text-slate-900 dark:text-white">
          £{price}
        </span>
        <span className="text-slate-600 dark:text-slate-400 ml-2">/month</span>
        {trialDays && (
          <p className="text-sm text-teal-600 dark:text-teal-400 mt-2">
            {trialDays}-day free trial
          </p>
        )}
      </div>

      <Button
        onClick={handleCheckout}
        disabled={isLoading}
        className={`w-full mb-8 py-3 rounded-lg font-semibold transition-all ${
          popular
            ? "bg-teal-600 hover:bg-teal-700 text-white"
            : "bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white"
        }`}
      >
        {isLoading ? "Processing..." : "Get Started"}
      </Button>

      <div className="space-y-4 flex-1">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
            <span className="text-slate-700 dark:text-slate-300">{feature}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
