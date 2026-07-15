import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, AlertCircle, Brain } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { useExamAccess } from "@/hooks/useExamAccess";

const SPECIALTIES = [
  "Cardiovascular",
  "Respiratory",
  "Gastroenterology",
  "Neurology",
  "Paediatrics",
  "Psychiatry",
  "Rheumatology",
  "Dermatology",
  "Endocrinology",
  "Oncology",
  "Haematology",
  "Immunology",
  "Ophthalmology",
  "Otolaryngology",
  "Obstetrics & Gynaecology",
  "Musculoskeletal",
  "Infectious Diseases",
  "Renal & Urology",
  "Pharmacology & Prescribing",
];

// Flashcards will be fetched from database via tRPC

type MasteryLevel = "learning" | "familiar" | "mastered";

interface CardProgress {
  [cardId: number]: {
    mastery: MasteryLevel;
    reviewCount: number;
    lastReviewed: Date;
  };
}

const CARD_COLORS = [
  { from: "#7c3aed", to: "#a855f7" },
  { from: "#2563eb", to: "#3b82f6" },
  { from: "#059669", to: "#10b981" },
  { from: "#dc2626", to: "#ef4444" },
  { from: "#ea580c", to: "#f97316" },
  { from: "#0891b2", to: "#06b6d4" },
  { from: "#7c2d12", to: "#9a3412" },
  { from: "#6b21a8", to: "#9333ea" },
];

function getCardColor(cardId: number) {
  return CARD_COLORS[cardId % CARD_COLORS.length];
}

export default function PatternRecognition() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const [, navigate] = useLocation();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardProgress, setCardProgress] = useState<CardProgress>({});
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, mastered: 0, familiar: 0, learning: 0 });
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  const updateProgress = trpc.flashcards.updateProgress.useMutation();
  const { data: flashcards = [] } = trpc.flashcards.getBySpecialty.useQuery({ specialty: selectedSpecialty || undefined });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  const { hasAccess: isPremium, isLoading: subLoading } = useExamAccess("AKT");

  if (loading || !isAuthenticated || !user || subLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleNext = () => {
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    } else {
      toast.success("You've completed this deck!");
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleMastery = (level: MasteryLevel) => {
    const quality = level === "mastered" ? 5 : level === "familiar" ? 3 : 1;

    setCardProgress((prev) => ({
      ...prev,
      [currentCard.id]: {
        mastery: level,
        reviewCount: (prev[currentCard.id]?.reviewCount || 0) + 1,
        lastReviewed: new Date(),
      },
    }));

    setSessionStats((prev) => ({
      reviewed: prev.reviewed + 1,
      mastered: prev.mastered + (level === "mastered" ? 1 : 0),
      familiar: prev.familiar + (level === "familiar" ? 1 : 0),
      learning: prev.learning + (level === "learning" ? 1 : 0),
    }));

    // Save to server
    updateProgress.mutate({ flashcardId: currentCard.id, quality });

    toast.success(
      level === "mastered" ? "Mastered!" :
      level === "familiar" ? "Getting there!" :
      "Keep practising!"
    );

    setTimeout(() => handleNext(), 400);
  };

  const handleRestart = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setSessionStats({ reviewed: 0, mastered: 0, familiar: 0, learning: 0 });
    toast.info("Deck restarted");
  };

  const handleSpecialtyChange = (specialty: string | null) => {
    setSelectedSpecialty(specialty);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setSessionStats({ reviewed: 0, mastered: 0, familiar: 0, learning: 0 });
    if (specialty) {
      toast.info(`Studying ${specialty}`);
    } else {
      toast.info("Studying all specialties");
    }
  };

  const filteredCards = flashcards;
  
  const currentCard = filteredCards[currentCardIndex];
  const totalCards = filteredCards.length;
  const progress = ((currentCardIndex + 1) / totalCards) * 100;

  if (totalCards === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Pattern Recognition</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-slate-600 mb-4">No cards found for this specialty.</p>
          <Button onClick={() => handleSpecialtyChange(null)}>View All Specialties</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-2xl font-bold text-slate-900">Pattern Recognition</h1>
            </div>
            <div className="text-sm text-slate-600">
              Card {currentCardIndex + 1} of {totalCards}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Filter by specialty:</label>
            <select
              value={selectedSpecialty || ""}
              onChange={(e) => handleSpecialtyChange(e.target.value || null)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="">All Specialties ({flashcards.length} cards)</option>
              {SPECIALTIES.map((specialty) => {
                const count = flashcards.filter((card: any) => card.specialty === specialty).length;
                return (
                  <option key={specialty} value={specialty}>
                    {specialty} ({count} cards)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <SubscriptionGate isPremium={isPremium} featureName="Pattern Recognition Flashcards">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Session Progress</span>
            <span className="text-sm text-slate-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* 3D Flip Card */}
        <div className="mb-12" style={{ perspective: "1000px" }}>
          <div
            onClick={handleFlip}
            className="relative w-full h-96 cursor-pointer"
            style={{
              transformStyle: "preserve-3d",
              transition: "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 bg-gradient-to-br from-green-600 to-green-700"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-medium">
                    {currentCard.specialty}
                  </span>
                  {currentCard.difficulty !== "Easy" && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      currentCard.difficulty === "Medium" ? "bg-yellow-400/30 text-yellow-100" :
                      "bg-red-400/30 text-red-100"
                    }`}>
                      {currentCard.difficulty}
                    </span>
                  )}
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
                  {currentCard.front}
                </p>
                <p className="text-green-200 text-sm mt-8 opacity-70">Tap to reveal answer</p>
              </div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: `linear-gradient(135deg, ${getCardColor(currentCard.id).from}, ${getCardColor(currentCard.id).to})`
              }}
            >
              <div className="text-center w-full flex flex-col items-center justify-center h-full overflow-hidden">
                <p className="text-xs text-white/70 mb-4 uppercase tracking-widest font-semibold">Answer</p>
                <p className="text-lg md:text-xl font-bold text-white leading-snug mb-4 max-w-full px-4 line-clamp-4">
                  {currentCard.back}
                </p>
                {currentCard.explanation && (
                  <p className="text-white/80 text-xs leading-relaxed max-w-full px-4 line-clamp-6">
                    {currentCard.explanation}
                  </p>
                )}
                <p className="text-white/60 text-xs mt-4 opacity-70">Tap to see question</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mastery Buttons */}
        <div className="mb-12">
          <p className="text-sm font-medium text-slate-700 mb-4 text-center">How well do you know this?</p>
          <div className="grid md:grid-cols-3 gap-4">
            <Button
              onClick={() => handleMastery("learning")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-1.5 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all active:scale-97"
            >
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="font-semibold text-red-600">Again</span>
              <span className="text-xs text-slate-500">Review soon</span>
            </Button>
            <Button
              onClick={() => handleMastery("familiar")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-1.5 border-amber-200 hover:bg-amber-50 hover:border-amber-300 transition-all active:scale-97"
            >
              <Brain className="w-5 h-5 text-amber-500" />
              <span className="font-semibold text-amber-600">Good</span>
              <span className="text-xs text-slate-500">Review in 3 days</span>
            </Button>
            <Button
              onClick={() => handleMastery("mastered")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-1.5 border-green-200 hover:bg-green-50 hover:border-green-300 transition-all active:scale-97"
            >
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-green-600">Easy</span>
              <span className="text-xs text-slate-500">Review in 3 days</span>
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-12">
          <Button onClick={handlePrevious} disabled={currentCardIndex === 0} variant="outline" className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <Button onClick={handleRestart} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" /> Restart
          </Button>
          <Button onClick={handleNext} disabled={currentCardIndex === totalCards - 1} className="bg-green-600 hover:bg-green-700 text-gray-900 gap-2">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Session Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: "Reviewed", value: sessionStats.reviewed, color: "text-slate-900" },
            { label: "Mastered", value: sessionStats.mastered, color: "text-green-600" },
            { label: "Familiar", value: sessionStats.familiar, color: "text-amber-600" },
            { label: "Learning", value: sessionStats.learning, color: "text-red-600" },
          ].map((stat, idx) => (
            <Card key={idx} className="p-4 border-slate-200 text-center">
              <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </Card>
          ))}
        </div>
        </SubscriptionGate>
      </main>
    </div>
  );
}
