import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionGate } from "@/components/SubscriptionGate";

// 17 specialties with icons and colors
const SPECIALTIES = [
  { name: "Cardiovascular", icon: "❤️", color: "from-red-100 to-red-50" },
  { name: "Respiratory", icon: "🫁", color: "from-blue-100 to-blue-50" },
  { name: "Gastroenterology", icon: "🍽️", color: "from-orange-100 to-orange-50" },
  { name: "Neurology", icon: "🧠", color: "from-purple-100 to-purple-50" },
  { name: "Paediatrics", icon: "👶", color: "from-pink-100 to-pink-50" },
  { name: "Dermatology", icon: "🩹", color: "from-yellow-100 to-yellow-50" },
  { name: "Musculoskeletal", icon: "🦴", color: "from-amber-100 to-amber-50" },
  { name: "Endocrinology", icon: "⚗️", color: "from-indigo-100 to-indigo-50" },
  { name: "Renal & Urology", icon: "💧", color: "from-cyan-100 to-cyan-50" },
  { name: "Obstetrics & Gynaecology", icon: "🤰", color: "from-rose-100 to-rose-50" },
  { name: "Ophthalmology & ENT", icon: "👁️", color: "from-teal-100 to-teal-50" },
  { name: "Haematology", icon: "🩸", color: "from-red-100 to-red-50" },
  { name: "Pharmacology & Prescribing", icon: "💊", color: "from-green-100 to-green-50" },
  { name: "Ethics & Organisational", icon: "⚖️", color: "from-slate-100 to-slate-50" },
  { name: "General Practice", icon: "🏥", color: "from-emerald-100 to-emerald-50" },
  { name: "Statistics & EBM", icon: "📊", color: "from-violet-100 to-violet-50" },
  { name: "Infectious Disease", icon: "🦠", color: "from-fuchsia-100 to-fuchsia-50" },
];

// Mock data for topic counts (will be replaced with real data from backend)
const TOPIC_COUNTS: Record<string, number> = {
  "Cardiovascular": 14,
  "Respiratory": 12,
  "Gastroenterology": 13,
  "Neurology": 15,
  "Paediatrics": 11,
  "Dermatology": 10,
  "Musculoskeletal": 12,
  "Endocrinology": 14,
  "Renal & Urology": 13,
  "Obstetrics & Gynaecology": 12,
  "Ophthalmology & ENT": 11,
  "Haematology": 10,
  "Pharmacology & Prescribing": 15,
  "Ethics & Organisational": 9,
  "General Practice": 11,
  "Statistics & EBM": 8,
  "Infectious Disease": 10,
};

export default function Note360List() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [progressData, setProgressData] = useState<Record<string, { read: number; total: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // TODO: Replace with actual tRPC query when backend is ready
  useEffect(() => {
    // Simulate loading progress data
    setIsLoading(true);
    setTimeout(() => {
      const mockProgress: Record<string, { read: number; total: number }> = {};
      SPECIALTIES.forEach((specialty) => {
        const total = TOPIC_COUNTS[specialty.name] || 10;
        mockProgress[specialty.name] = {
          read: Math.floor(Math.random() * total),
          total,
        };
      });
      setProgressData(mockProgress);
      setIsLoading(false);
    }, 500);
  }, [user?.id, navigate]);

  if (isLoading || subLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">📓 Note360</h1>
          <p className="text-lg text-slate-600">
            Comprehensive NICE-compliant medical notes for MRCGP AKT candidates
          </p>
        </div>

        <SubscriptionGate isPremium={isPremium} featureName="Note360 Revision Notes">

        {/* Specialty Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SPECIALTIES.map((specialty) => {
            const progress = progressData[specialty.name];
            const percentage = progress ? (progress.read / progress.total) * 100 : 0;
            const topicCount = TOPIC_COUNTS[specialty.name] || 10;

            return (
              <Card
                key={specialty.name}
                className={`bg-gradient-to-br ${specialty.color} border border-slate-200 hover:shadow-lg transition-shadow p-6`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-3xl mb-2">{specialty.icon}</div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {specialty.name}
                    </h3>
                  </div>
                </div>

                {/* Topic count and date */}
                <div className="mb-4">
                  <p className="text-sm text-slate-600">
                    {topicCount} topics • Updated June 2026
                  </p>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-700">
                      Progress
                    </span>
                    <span className="text-xs font-medium text-slate-700">
                      {progress ? progress.read : 0}/{topicCount}
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className="h-2 bg-slate-200"
                  />
                </div>

                {/* Open button */}
                <Button
                  onClick={() => navigate(`/mrcgp-akt/note360/${specialty.name.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}`)}
                  className="w-full bg-[#32CD32] hover:bg-[#2ab82a] text-[#1A1A1A] font-semibold"
                >
                  Open Notes
                </Button>
              </Card>
            );
          })}
        </div>
        </SubscriptionGate>
      </div>
    </div>
  );
}
