import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Lock } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useSubscription } from "@/hooks/useSubscription";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

const SPECIALTIES = [
  { name: "Dermatology", icon: "🩹" },
  { name: "Ophthalmology", icon: "👁️" },
  { name: "ECG", icon: "❤️" },
  { name: "ENT", icon: "👂" },
  { name: "Chest X-ray", icon: "🫁" },
  { name: "Paediatrics", icon: "👶" },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export default function Picture360() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useProtectedRoute();
  const { isPremium, isLoading: subLoading } = useSubscription();
  
  const pictureCountsQuery = trpc.picture360.getSpecialtyCounts.useQuery();

  const specialtiesWithCounts = useMemo(() => {
    if (!pictureCountsQuery.data) {
      return SPECIALTIES.map((s) => ({ ...s, count: 0, slug: slugify(s.name) }));
    }
    
    const countMap = new Map(pictureCountsQuery.data.map((item: any) => [item.specialty, item.count]));
    return SPECIALTIES.map((s) => ({
      ...s,
      count: countMap.get(s.name) || 0,
      slug: slugify(s.name),
    }));
  }, [pictureCountsQuery.data]);

  if (loading || pictureCountsQuery.isLoading || subLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-slate-600">Loading Picture360...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Picture360</h1>
              <p className="text-sm text-slate-600">Visual diagnosis training</p>
            </div>
          </div>
        </div>
      </header>

      {/* Premium Gate Banner */}
      {!isPremium && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 py-6 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-amber-700" />
              <p className="text-amber-900 font-bold text-lg">Premium Feature</p>
            </div>
            <p className="text-sm text-amber-700 mb-4">
              Picture360 is available exclusively for premium subscribers. Upgrade to access visual diagnosis training across all specialties.
            </p>
            <Button
              onClick={() => navigate("/pricing")}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8"
            >
              Upgrade to Premium
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specialtiesWithCounts.map((specialty) => (
            <Card
              key={specialty.slug}
              className={`p-8 border-slate-200 transition-all ${
                isPremium ? "hover:shadow-lg cursor-pointer" : "opacity-70 cursor-not-allowed"
              } bg-gradient-to-br from-slate-50 to-slate-100`}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{specialty.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{specialty.name}</h3>
                
                {!isPremium ? (
                  <div className="mt-6">
                    <div className="flex items-center justify-center gap-1 text-slate-500">
                      <Lock className="w-4 h-4" />
                      <span className="text-sm font-medium">Premium Only</span>
                    </div>
                  </div>
                ) : specialty.count === 0 ? (
                  <div className="mt-6">
                    <span className="inline-block bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-sm font-semibold">
                      Coming Soon
                    </span>
                  </div>
                ) : (
                  <div className="mt-6">
                    <p className="text-3xl font-bold text-green-600 mb-2">{specialty.count}</p>
                    <p className="text-sm text-slate-600">
                      {specialty.count === 1 ? "image" : "images"} available
                    </p>
                    <Button
                      onClick={() => navigate(`/picture360/${specialty.slug}`)}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Start Learning →
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
