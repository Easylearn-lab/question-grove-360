import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Zap } from "lucide-react";
import { useLocation } from "wouter";

interface SubscriptionGateProps {
  isPremium: boolean;
  children: ReactNode;
  featureName: string;
  fallbackUI?: ReactNode;
}

export function SubscriptionGate({
  isPremium,
  children,
  featureName,
  fallbackUI,
}: SubscriptionGateProps) {
  const [, navigate] = useLocation();

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    fallbackUI || (
      <Card className="p-12 border-slate-200 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Premium Feature</h3>
        <p className="text-slate-600 mb-6 max-w-sm mx-auto">
          {featureName} is available with a premium subscription. Upgrade now to unlock unlimited access.
        </p>
        <Button
          onClick={() => navigate("/pricing")}
          className="bg-green-600 hover:bg-green-700 text-gray-900 gap-2"
        >
          <Zap className="w-4 h-4" />
          Upgrade to Premium
        </Button>
      </Card>
    )
  );
}
