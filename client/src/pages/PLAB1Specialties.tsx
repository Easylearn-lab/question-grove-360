import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Clock, Target, Stethoscope, Brain, Baby, Heart, Pill, Scale, Scissors, Users } from "lucide-react";
import { useLocation } from "wouter";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { trpc } from "@/lib/trpc";

const SPECIALTY_ICONS: Record<string, any> = {
  "Medicine": Heart,
  "Surgery": Scissors,
  "Obstetrics and Gynaecology": Users,
  "Paediatrics": Baby,
  "Psychiatry": Brain,
  "General Practice and Public Health": Stethoscope,
  "Clinical Pharmacology and Therapeutics": Pill,
  "Ethics and Law": Scale,
};

export default function PLAB1Specialties() {
  useProtectedRoute();
  const [, navigate] = useLocation();
  const specialtiesQuery = trpc.plab1.getSpecialties.useQuery();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">PLAB 1 Question Bank</h1>
              <p className="text-slate-500 text-sm">180 SBA questions · 3 hours · 5 options per question</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => navigate("/plab1/mock")}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Clock className="w-4 h-4 mr-2" /> Full Mock Exam (180 Questions)
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/plab1/questions")}
            >
              <Target className="w-4 h-4 mr-2" /> Practice All Questions
            </Button>
          </div>
        </div>
      </header>

      {/* Specialties Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Choose a Specialty</h2>
        
        {specialtiesQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-5 animate-pulse">
                <div className="h-10 w-10 bg-slate-200 rounded-lg mb-3" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(specialtiesQuery.data || []).map((s: any) => {
              const Icon = SPECIALTY_ICONS[s.specialty] || BookOpen;
              return (
                <Card
                  key={s.specialty}
                  className="p-5 cursor-pointer hover:border-green-300 hover:shadow-md transition-all group"
                  onClick={() => navigate(`/plab1/questions?specialty=${encodeURIComponent(s.specialty)}`)}
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                    <Icon className="w-5 h-5 text-green-700" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{s.specialty}</h3>
                  <p className="text-sm text-slate-500">{s.count} questions</p>
                </Card>
              );
            })}

            {/* Show all specialties even if no questions yet */}
            {(!specialtiesQuery.data || specialtiesQuery.data.length === 0) && (
              Object.entries(SPECIALTY_ICONS).map(([name, Icon]) => (
                <Card
                  key={name}
                  className="p-5 cursor-pointer hover:border-green-300 hover:shadow-md transition-all group opacity-60"
                  onClick={() => navigate(`/plab1/questions?specialty=${encodeURIComponent(name)}`)}
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                    <Icon className="w-5 h-5 text-green-700" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{name}</h3>
                  <p className="text-sm text-slate-400">Coming soon</p>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Exam info */}
        <Card className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <h3 className="font-semibold text-slate-900 mb-2">About PLAB 1</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Format</p>
              <p className="font-medium text-slate-900">180 SBA Questions</p>
            </div>
            <div>
              <p className="text-slate-500">Duration</p>
              <p className="font-medium text-slate-900">3 Hours</p>
            </div>
            <div>
              <p className="text-slate-500">Pass Mark</p>
              <p className="font-medium text-slate-900">~63%</p>
            </div>
            <div>
              <p className="text-slate-500">Options</p>
              <p className="font-medium text-slate-900">5 (A-E)</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
