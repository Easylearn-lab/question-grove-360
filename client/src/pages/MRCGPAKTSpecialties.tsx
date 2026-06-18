import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, BarChart3, Lock } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useSubscription } from "@/hooks/useSubscription";

interface SpecialtyData {
  name: string;
  icon: string;
  questionCount: number;
  attempted: number;
  correct: number;
  slug: string;
}

const SPECIALTIES: SpecialtyData[] = [
  { name: "Ethics & Organisational", icon: "⚖️", questionCount: 7, attempted: 0, correct: 0, slug: "ethics-organisational" },
  { name: "Endocrinology", icon: "🔬", questionCount: 6, attempted: 0, correct: 0, slug: "endocrinology" },
  { name: "Paediatrics", icon: "👶", questionCount: 6, attempted: 0, correct: 0, slug: "paediatrics" },
  { name: "Cardiovascular", icon: "❤️", questionCount: 6, attempted: 0, correct: 0, slug: "cardiovascular" },
  { name: "Statistics & EBM", icon: "📊", questionCount: 6, attempted: 0, correct: 0, slug: "statistics-ebm" },
  { name: "Gastroenterology", icon: "🍽️", questionCount: 6, attempted: 0, correct: 0, slug: "gastroenterology" },
  { name: "Haematology", icon: "🩸", questionCount: 5, attempted: 0, correct: 0, slug: "haematology" },
  { name: "General Practice", icon: "🏥", questionCount: 4, attempted: 0, correct: 0, slug: "general-practice" },
  { name: "Respiratory", icon: "💨", questionCount: 4, attempted: 0, correct: 0, slug: "respiratory" },
  { name: "Pharmacology & Prescribing", icon: "💊", questionCount: 2, attempted: 0, correct: 0, slug: "pharmacology-prescribing" },
  { name: "Ophthalmology & ENT", icon: "👁️", questionCount: 2, attempted: 0, correct: 0, slug: "ophthalmology-ent" },
  { name: "Musculoskeletal", icon: "🦴", questionCount: 2, attempted: 0, correct: 0, slug: "musculoskeletal" },
  { name: "Neurology", icon: "🧠", questionCount: 2, attempted: 0, correct: 0, slug: "neurology" },
  { name: "Dermatology", icon: "🩹", questionCount: 1, attempted: 0, correct: 0, slug: "dermatology" },
  { name: "Obstetrics & Gynaecology", icon: "🤰", questionCount: 1, attempted: 0, correct: 0, slug: "obstetrics-gynaecology" },
];

const DIFFICULTY_FILTERS = ["All", "Easy", "Medium", "Hard"];

export default function MRCGPAKTSpecialties() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useProtectedRoute();
  const { isPremium } = useSubscription();
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  const handleSpecialtyClick = (specialty: SpecialtyData) => {
    if (!isPremium && specialty.questionCount > 3) {
      navigate("/pricing");
      return;
    }
    navigate(`/practice/mrcgp-akt/${specialty.slug}`);
  };

  if (loading) {
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
              <p className="text-sm text-slate-600">60 questions across 15 specialties</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Difficulty Filter */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Filter by Difficulty</h2>
          <div className="flex gap-3 flex-wrap">
            {DIFFICULTY_FILTERS.map((difficulty) => (
              <Button
                key={difficulty}
                variant={selectedDifficulty === difficulty ? "default" : "outline"}
                onClick={() => setSelectedDifficulty(difficulty)}
                className={selectedDifficulty === difficulty ? "bg-green-600 hover:bg-green-700 text-gray-900" : ""}
              >
                {difficulty}
              </Button>
            ))}
          </div>
        </div>

        {/* Specialties Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SPECIALTIES.map((specialty) => {
            const progress = specialty.attempted > 0 ? (specialty.correct / specialty.attempted) * 100 : 0;
            const isLocked = !isPremium && specialty.questionCount > 3;

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

                {/* Progress Bar */}
                {specialty.attempted > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-600">Progress</span>
                      <span className="text-xs font-semibold text-slate-900">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                  <div className="bg-slate-50 p-2 rounded">
                    <p className="text-slate-600">Attempted</p>
                    <p className="font-bold text-slate-900">{specialty.attempted}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <p className="text-slate-600">Correct</p>
                    <p className="font-bold text-green-600">{specialty.correct}</p>
                  </div>
                </div>

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
                <p className="text-3xl font-bold text-slate-900">60</p>
              </div>
              <BookOpen className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6 border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Specialties</p>
                <p className="text-3xl font-bold text-slate-900">{SPECIALTIES.length}</p>
              </div>
              <BarChart3 className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6 border-slate-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Your Progress</p>
                <p className="text-3xl font-bold text-slate-900">0%</p>
              </div>
              <BarChart3 className="w-10 h-10 text-purple-600 opacity-20" />
            </div>
          </Card>
        </div>
      </main>


    </div>
  );
}
