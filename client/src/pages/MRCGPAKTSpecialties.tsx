import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, BarChart3, Lock, FileText, BookMarked, Shield, Target } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useExamAccess } from "@/hooks/useExamAccess";
import { usePicture360Access } from "@/hooks/usePicture360Access";
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
  "Ophthalmology": "👁️",
  "ENT": "👂",
  "Infectious Disease": "🦠",
  "General Practice": "🏥",
  "Psychiatry": "💭",
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[&]/g, "").replace(/\s+/g, "-").replace(/--+/g, "-");
}

export default function MRCGPAKTSpecialties() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useProtectedRoute();
  const { hasAccess: isPremium } = useExamAccess("AKT");

  const specialtiesQuery = trpc.mrcgpAkt.getSpecialties.useQuery();
  const readinessQuery = trpc.dashboard.getReadinessScore.useQuery();
  const fingerprintQuery = trpc.dashboard.getWeaknessFingerprint.useQuery();
  const flashcardCountsQuery = trpc.flashcards.getFlashcardCounts.useQuery();

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
        {/* Readiness Score & Weakness Fingerprint */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Readiness Score Card */}
          <Card className="p-8 border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Exam Readiness
                </h3>
                <p className="text-sm text-slate-500">Based on your question bank & mock exam performance</p>
              </div>
            </div>
            {readinessQuery.isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-slate-200 rounded" />
                <div className="h-4 bg-slate-200 rounded w-2/3" />
              </div>
            ) : readinessQuery.data?.score === null ? (
              <div className="text-center py-6">
                <p className="text-3xl font-bold text-slate-300">—</p>
                <p className="text-sm text-slate-400 mt-2">Start answering questions to see your readiness</p>
              </div>
            ) : (
              <div>
                <div className="flex items-end gap-3 mb-3">
                  <span className={`text-5xl font-bold ${
                    readinessQuery.data?.colour === 'green' ? 'text-green-600' :
                    readinessQuery.data?.colour === 'amber' ? 'text-amber-500' :
                    readinessQuery.data?.colour === 'orange' ? 'text-orange-500' :
                    'text-red-500'
                  }`}>
                    {readinessQuery.data?.score}%
                  </span>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full mb-1 ${
                    readinessQuery.data?.colour === 'green' ? 'bg-green-100 text-green-700' :
                    readinessQuery.data?.colour === 'amber' ? 'bg-amber-100 text-amber-700' :
                    readinessQuery.data?.colour === 'orange' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {readinessQuery.data?.label}
                  </span>
                </div>
                {readinessQuery.data?.weakestSpecialties && readinessQuery.data.weakestSpecialties.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Weakest Areas</p>
                    <div className="space-y-1.5">
                      {readinessQuery.data.weakestSpecialties.map((s: { name: string; accuracy: number }) => (
                        <div key={s.name} className="flex items-center justify-between">
                          <span className="text-sm text-slate-700">{s.name}</span>
                          <span className="text-sm font-semibold text-red-500">{s.accuracy}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Weakness Fingerprint Card */}
          <Card className="p-8 border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Weakness Fingerprint
                </h3>
                <p className="text-sm text-slate-500">Per-specialty accuracy across all 17 specialties</p>
              </div>
            </div>
            {fingerprintQuery.isLoading ? (
              <div className="animate-pulse space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-5 bg-slate-200 rounded" />
                ))}
              </div>
            ) : fingerprintQuery.data ? (
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                {fingerprintQuery.data.map((s: { name: string; accuracy: number | null; status: string; label: string; total: number }) => (
                  <div key={s.name} className="flex items-center gap-3 py-1">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      s.status === 'green' ? 'bg-green-500' :
                      s.status === 'amber' ? 'bg-amber-400' :
                      s.status === 'red' ? 'bg-red-500' :
                      'bg-slate-300'
                    }`} />
                    <span className="text-sm text-slate-700 flex-1 truncate">{s.name}</span>
                    <span className={`text-xs font-medium min-w-[60px] text-right ${
                      s.status === 'green' ? 'text-green-600' :
                      s.status === 'amber' ? 'text-amber-600' :
                      s.status === 'red' ? 'text-red-500' :
                      'text-slate-400'
                    }`}>
                      {s.label}
                    </span>
                    {s.total > 0 && (
                      <span className="text-[10px] text-slate-400 min-w-[30px] text-right">
                        ({s.total})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-slate-400">No data available</p>
              </div>
            )}
          </Card>
        </div>

        {/* Mock Exams, Note360, Pattern Recognition & Picture360 Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {/* Mock Exams Card */}
          <Card className="p-8 border-slate-200 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col" onClick={() => navigate("/mock-exams")}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Mock Exams</h3>
                <p className="text-slate-600">Simulate real exam conditions</p>
              </div>
              <span className="text-4xl">📝</span>
            </div>
            <Button className="w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white">
              Start Mock Exam →
            </Button>
          </Card>

          {/* Note360 Card */}
          <Card className="p-8 border-slate-200 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-green-50 to-green-100 flex flex-col" onClick={() => navigate("/mrcgp-akt/note360")}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Note360</h3>
                <p className="text-slate-600">NICE-compliant medical notes</p>
              </div>
              <span className="text-4xl">📓</span>
            </div>
            <Button className="w-full mt-auto bg-[#32CD32] hover:bg-[#2ab82a] text-[#1A1A1A] font-semibold">
              Open Note360 →
            </Button>
          </Card>

          {/* Pattern Recognition Card */}
          <Card className="p-8 border-slate-200 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100 flex flex-col" onClick={() => navigate("/mrcgp-akt/flashcards")}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Pattern Recognition</h3>
                <p className="text-slate-600">{flashcardCountsQuery.data?.totalCards || 0} cards • {flashcardCountsQuery.data?.distinctSpecialties || 0} specialties</p>
              </div>
              <span className="text-4xl">🃏</span>
            </div>
            <Button className="w-full mt-auto bg-[#32CD32] hover:bg-[#2ab82a] text-[#1A1A1A] font-semibold">
              Start Drilling →
            </Button>
          </Card>

          {/* Picture360 Card */}
          <Picture360DashboardCard />
        </div>

        {/* Specialties Grid */}
        <div className="grid md:grid-cols-3 lg:grid-cols-3 gap-6">
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

      </main>
    </div>
  );
}

function Picture360DashboardCard() {
  const [, navigate] = useLocation();
  const { hasAccess } = usePicture360Access();

  return (
    <Card className="p-8 border-slate-200 bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Picture360</h3>
          <p className="text-slate-600">Visual diagnosis training</p>
        </div>
        <span className="text-4xl">📸</span>
      </div>
      {hasAccess ? (
        <>
          <p className="text-sm text-green-700 font-medium mb-3">✓ Access Active</p>
          <Button
            onClick={() => navigate("/picture360")}
            className="w-full mt-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            Explore Now →
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-700 mb-3">
            <span className="text-xl font-bold text-emerald-600">£9</span>{" "}
            <span className="text-slate-500">for 3 months</span>
          </p>
          <Button
            onClick={() => navigate("/picture360")}
            className="w-full mt-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            Buy Now →
          </Button>
        </>
      )}
    </Card>
  );
}
