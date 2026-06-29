import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { trpc } from "@/lib/trpc";
import { useMemo, ReactNode } from "react";

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

  if (loading || pictureCountsQuery.isLoading) {
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
              <h1 className="text-2xl font-bold text-slate-900">Picture Album</h1>
              <p className="text-sm text-slate-600">Visual diagnosis training</p>
            </div>
          </div>
        </div>
      </header>

      {/* Coming Soon Banner */}
      <div className="bg-amber-50 border-b border-amber-200 py-4 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-amber-900 font-semibold">
            🚀 Coming Soon — Available Soon
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Picture Album is launching soon. Browse the specialties below to see what's coming.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specialtiesWithCounts.map((specialty) => (
            <Card
              key={specialty.slug}
              className="p-8 border-slate-200 hover:shadow-lg transition-all cursor-default bg-gradient-to-br from-slate-50 to-slate-100"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{specialty.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{specialty.name}</h3>
                
                {specialty.count === 0 ? (
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
