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
import { useSubscription } from "@/hooks/useSubscription";

const FLASHCARDS = [
  {
    id: 1,
    front: "What is the classic presentation of acute myocardial infarction?",
    back: "Central crushing chest pain radiating to the left arm, associated with dyspnea, diaphoresis, and nausea. May present atypically in elderly, diabetics, and women.",
    specialty: "Cardiology",
    difficulty: "Medium",
  },
  {
    id: 2,
    front: "What are the stages of chronic kidney disease?",
    back: "Stage 1: eGFR ≥90, Stage 2: eGFR 60-89, Stage 3a: eGFR 45-59, Stage 3b: eGFR 30-44, Stage 4: eGFR 15-29, Stage 5: eGFR <15",
    specialty: "Renal",
    difficulty: "Easy",
  },
  {
    id: 3,
    front: "What is the pathophysiology of diabetic ketoacidosis?",
    back: "Absolute or relative insulin deficiency leads to uncontrolled lipolysis, producing ketone bodies (acetoacetate, beta-hydroxybutyrate, acetone). Results in metabolic acidosis, osmotic diuresis, and electrolyte derangements.",
    specialty: "Endocrinology",
    difficulty: "Hard",
  },
  {
    id: 4,
    front: "What are the red flag symptoms in headache?",
    back: "Sudden thunderclap onset, papilloedema, focal neurological signs, seizures, meningism, fever, new headache >50 years, worse on lying/coughing/Valsalva, immunocompromised, progressive worsening.",
    specialty: "Neurology",
    difficulty: "Medium",
  },
  {
    id: 5,
    front: "What is the Duke criteria for infective endocarditis?",
    back: "Major: Positive blood cultures (typical organisms x2 or persistently positive), endocardial involvement on echo. Minor: Predisposition, fever >38°C, vascular phenomena, immunological phenomena, microbiological evidence not meeting major criteria.",
    specialty: "Cardiology",
    difficulty: "Hard",
  },
];

type MasteryLevel = "learning" | "familiar" | "mastered";

interface CardProgress {
  [cardId: number]: {
    mastery: MasteryLevel;
    reviewCount: number;
    lastReviewed: Date;
  };
}

export default function PatternRecognition() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const [, navigate] = useLocation();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardProgress, setCardProgress] = useState<CardProgress>({});
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, mastered: 0, familiar: 0, learning: 0 });

  const updateProgress = trpc.flashcards.updateProgress.useMutation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  const { isPremium, isLoading: subLoading } = useSubscription();

  if (loading || !isAuthenticated || !user || subLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const currentCard = FLASHCARDS[currentCardIndex];
  const totalCards = FLASHCARDS.length;
  const progress = ((currentCardIndex + 1) / totalCards) * 100;

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleNext = () => {
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
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
            <div className="bg-teal-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
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
              className="absolute inset-0 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 bg-gradient-to-br from-teal-600 to-teal-700"
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
                <p className="text-teal-200 text-sm mt-8 opacity-70">Tap to reveal answer</p>
              </div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-600 to-purple-700"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="text-center">
                <p className="text-sm text-purple-200 mb-4 uppercase tracking-wider font-medium">Answer</p>
                <p className="text-xl md:text-2xl font-medium text-white leading-relaxed">
                  {currentCard.back}
                </p>
                <p className="text-purple-200 text-sm mt-8 opacity-70">Tap to see question</p>
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
          <Button onClick={handleNext} disabled={currentCardIndex === totalCards - 1} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
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
