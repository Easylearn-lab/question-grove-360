import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Lock, CheckCircle, Clock } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { usePicture360Access } from "@/hooks/usePicture360Access";
import { trpc } from "@/lib/trpc";
import { useMemo, useEffect } from "react";
import { toast } from "sonner";

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
  const { hasAccess, status, expiresAt, isLoading: accessLoading, refetch } = usePicture360Access();

  const pictureCountsQuery = trpc.picture360.getSpecialtyCounts.useQuery();
  const purchaseMutation = trpc.stripe.createPicture360Checkout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to checkout...");
        window.open(data.url, "_blank");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create checkout session");
    },
  });

  // Handle payment success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success("Payment successful! Your Picture360 access is now active.");
      refetch();
      // Clean URL
      window.history.replaceState({}, "", "/picture360");
    } else if (params.get("payment") === "cancelled") {
      toast.info("Payment cancelled.");
      window.history.replaceState({}, "", "/picture360");
    }
  }, []);

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

  if (loading || pictureCountsQuery.isLoading || accessLoading) {
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
          {hasAccess && expiresAt && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
              <CheckCircle className="w-4 h-4" />
              <span>Access until {new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          )}
        </div>
      </header>

      {/* Lock Screen / Purchase Gate */}
      {!hasAccess && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 py-10 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-md mb-6">
              <span className="text-4xl">📸</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Picture360 — Visual Diagnosis Training</h2>
            
            {status === "expired" ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-3 text-amber-700">
                  <Clock className="w-5 h-5" />
                  <p className="font-semibold">Your access has expired</p>
                </div>
                <p className="text-slate-600 mb-6">
                  Renew your access to continue training across all 6 specialties with 120+ clinical images.
                </p>
              </>
            ) : (
              <p className="text-slate-600 mb-6">
                Master visual diagnosis across 6 specialties with 120+ clinical images, key features, exam pearls, and MCQ practice.
              </p>
            )}

            <div className="bg-white rounded-xl border border-emerald-200 p-6 shadow-sm max-w-sm mx-auto mb-6">
              <div className="text-4xl font-bold text-slate-900 mb-1">£9</div>
              <p className="text-slate-500 text-sm mb-4">for 3 months access</p>
              <ul className="text-left text-sm text-slate-700 space-y-2 mb-6">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> All 6 specialties included</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> 120+ clinical images</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Learn mode with key features</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> Test mode with MCQ practice</li>
              </ul>
              <Button
                onClick={() => purchaseMutation.mutate()}
                disabled={purchaseMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-lg font-semibold"
              >
                {purchaseMutation.isPending ? "Processing..." : status === "expired" ? "Renew for £9" : "Buy Now — £9"}
              </Button>
            </div>
            <p className="text-xs text-slate-500">One-time payment. No recurring charges. Use test card 4242 4242 4242 4242 in test mode.</p>
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
                hasAccess ? "hover:shadow-lg cursor-pointer" : "opacity-70 cursor-not-allowed"
              } bg-gradient-to-br from-slate-50 to-slate-100`}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{specialty.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{specialty.name}</h3>

                {!hasAccess ? (
                  <div className="mt-6">
                    <div className="flex items-center justify-center gap-1 text-slate-500">
                      <Lock className="w-4 h-4" />
                      <span className="text-sm font-medium">Purchase Required</span>
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
