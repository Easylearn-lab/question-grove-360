import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

const FLASHCARDS = [
  {
    id: 1,
    front: "What is the classic presentation of acute myocardial infarction?",
    back: "Central crushing chest pain radiating to the left arm, associated with dyspnea, diaphoresis, and nausea. May present atypically in elderly, diabetics, and women.",
    difficulty: "Medium",
    masteryLevel: "learning",
    lastReviewed: "2026-05-30",
  },
  {
    id: 2,
    front: "What are the stages of chronic kidney disease?",
    back: "Stage 1: eGFR ≥90, Stage 2: eGFR 60-89, Stage 3a: eGFR 45-59, Stage 3b: eGFR 30-44, Stage 4: eGFR 15-29, Stage 5: eGFR <15",
    difficulty: "Easy",
    masteryLevel: "familiar",
    lastReviewed: "2026-05-28",
  },
  {
    id: 3,
    front: "What is the pathophysiology of diabetic ketoacidosis?",
    back: "Absolute or relative insulin deficiency leads to uncontrolled lipolysis, producing ketone bodies (acetoacetate, beta-hydroxybutyrate, acetone). Results in metabolic acidosis, osmotic diuresis, and electrolyte derangements.",
    difficulty: "Hard",
    masteryLevel: "learning",
    lastReviewed: "2026-05-29",
  },
];

export default function PatternRecognition() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteryLevel, setMasteryLevel] = useState<"learning" | "familiar" | "mastered">("learning");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const currentCard = FLASHCARDS[currentCardIndex];
  const totalCards = FLASHCARDS.length;
  const progress = ((currentCardIndex + 1) / totalCards) * 100;

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

  const handleMastery = (level: "learning" | "familiar" | "mastered") => {
    setMasteryLevel(level);
    // Save progress to database
    setTimeout(() => {
      handleNext();
    }, 500);
  };

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
            <h1 className="text-2xl font-bold text-slate-900">Pattern Recognition</h1>
          </div>
          <div className="text-sm text-slate-600">
            Card {currentCardIndex + 1} of {totalCards}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm text-slate-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-teal-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Flashcard */}
        <div className="mb-12">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="h-96 bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl shadow-2xl cursor-pointer flex items-center justify-center p-8 transition-transform duration-300 hover:scale-105"
          >
            <div className="text-center">
              <p className="text-sm text-teal-100 mb-4 uppercase tracking-wider">
                {isFlipped ? "Answer" : "Question"}
              </p>
              <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
              <p className="text-teal-100 text-sm mt-8">Click to flip</p>
            </div>
          </div>
        </div>

        {/* Mastery Buttons */}
        <div className="mb-12">
          <p className="text-sm font-medium text-slate-700 mb-4">How well do you know this?</p>
          <div className="grid md:grid-cols-3 gap-4">
            <Button
              onClick={() => handleMastery("learning")}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 border-red-300 hover:bg-red-50"
            >
              <AlertCircle className="w-6 h-6 text-red-600" />
              <span className="font-medium text-red-600">Learning</span>
              <span className="text-xs text-slate-600">Need more practice</span>
            </Button>
            <Button
              onClick={() => handleMastery("familiar")}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 border-yellow-300 hover:bg-yellow-50"
            >
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <span className="font-medium text-yellow-600">Familiar</span>
              <span className="text-xs text-slate-600">Getting there</span>
            </Button>
            <Button
              onClick={() => handleMastery("mastered")}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 border-green-300 hover:bg-green-50"
            >
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <span className="font-medium text-green-600">Mastered</span>
              <span className="text-xs text-slate-600">Confident</span>
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentCardIndex === 0}
            variant="outline"
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            onClick={() => setCurrentCardIndex(0)}
            variant="outline"
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </Button>
          <Button
            onClick={handleNext}
            disabled={currentCardIndex === totalCards - 1}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            { label: "Cards Mastered", value: "12", icon: CheckCircle2 },
            { label: "Familiar", value: "8", icon: AlertCircle },
            { label: "Still Learning", value: "15", icon: AlertCircle }
          ].map((stat, idx) => (
            <Card key={idx} className="p-6 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <stat.icon className="w-8 h-8 text-teal-600 opacity-20" />
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
