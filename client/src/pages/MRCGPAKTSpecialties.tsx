import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, BarChart3, Lock } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useSubscription } from "@/hooks/useSubscription";
import { trpc } from "@/lib/trpc";

const SPECIALTY_ICONS: Record<string, string> = {
  "Neurology": "🧠",
  "Endocrinology": "🔬",
  "Dermatology": "🩹",
  "Renal & Urology": "🫘",
  "Cardiovascular": "❤️",
  "Respiratory": "💨",
  "Gastroenterology": "🍽️",
  "Musculoskeletal": "🦴",
  "Obstetrics & Gynaecology": "🤰",
  "Ethics & Organisational": "⚖️",
  "Paediatrics": "👶",
  "Haematology": "🩸",
  "Pharmacology & Prescribing": "💊",
  "Statistics & EBM": "📊",
  "Ophthalmology & ENT": "👁️",
  "Infectious Disease": "🦠",
  "General Practice": "🏥",
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[&]/g, "").replace(/\s+/g, "-").replace(/--+/g, "-");
}

export default function MRCGPAKTSpecialties() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useProtectedRoute();
  const { isPremium } = useSubscription();

  const specialtiesQuery = trpc.mrcgpAkt.getSpecialties.useQuery();

  const specialties = useMemo(() => {
    if (!specialtiesQuery.data) return [];
    return specialtiesQuery.data.map((s) => ({
      name: s.specialty,
      icon: SPECIALTY_ICONS[s.specialty] || "📋",
      questionCount: s.count,
      slug: slugify(s.specialty),
    }));
  }, [specialtiesQuery.data]);

  const totalQuestions = useMemo(() => {
    return specialties.reduce((sum, s) => sum + s.questionCount, 0);
  }, [specialties]);

  const handleSpecialtyClick = (specialty: { name: string; slug: string }) => {
    if (!isPremium) {
      navigate("/pricing");
      return;
    }
    navigate(`/practice/mrcgp-akt/${specialty.slug}`);
  };

  if (loading || specialtiesQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-slate-600">Loading specialties...</p>
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
              <h1 className="text-2xl font-bold text-slate-900">MRCGP AKT</h1>
              <p className="text-sm text-slate-600">{totalQuestions.toLocaleString()} questions across {specialties.length} specialties</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Specialties Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specialties.map((specialty) => {
            const isLocked = !isPremium;

            return (
              <Card
                key={specialty.slug}
                className="p-6 border-slate-200 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                onClick={() => handleSpecialtyClick(specialty)}
              >
                {isLocked && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <div className="text-center text-white">
                      <Lock className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm font-semibold">Premium Only</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{specialty.icon}</span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    {specialty.questionCount} Q
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-green-600 transition-colors">
                  {specialty.name}
                </h3>

                <Button className="w-full bg-green-600 hover:bg-green-700 text-gray-900 group-hover:shadow-lg transition-all">
                  Practice Now
                  <BookOpen className="w-4 h-4 ml-2" />
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card className="p-6 border-slate-200 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Questions</p>
                <p className="text-3xl font-bold text-slate-900">{totalQuestions.toLocaleString()}</p>
              </div>
              <BookOpen className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6 border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Specialties</p>
                <p className="text-3xl font-bold text-slate-900">{specialties.length}</p>
              </div>
              <BarChart3 className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6 border-slate-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Exam Format</p>
                <p className="text-3xl font-bold text-slate-900">AKT</p>
              </div>
              <BarChart3 className="w-10 h-10 text-purple-600 opacity-20" />
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
