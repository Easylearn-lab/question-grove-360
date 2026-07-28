import { useState, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, XCircle, Flag, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useShuffledOptions, getOrCreateSessionSeed } from "@/hooks/useShuffledOptions";

type FilterMode = "all" | "incorrect" | "flagged" | "correct";

export default function MockExamReview() {
  const { user, isAuthenticated, loading } = useProtectedRoute();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/mock-review/:id");
  const resultId = params?.id ? Number(params.id) : 0;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [showExplanation, setShowExplanation] = useState(true);

  const reviewQuery = trpc.mockExams.getReview.useQuery(
    { resultId },
    { enabled: !!resultId && isAuthenticated }
  );

  const questions = reviewQuery.data || [];

  const filteredQuestions = useMemo(() => {
    switch (filter) {
      case "incorrect":
        return questions.filter((q) => !q.isCorrect);
      case "correct":
        return questions.filter((q) => q.isCorrect);
      case "flagged":
        return questions.filter((q) => q.isFlagged);
      default:
        return questions;
    }
  }, [questions, filter]);

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (reviewQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-slate-600">Loading review...</p>
        </div>
      </div>
    );
  }

  if (!filteredQuestions.length) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/mock-results/${resultId}`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Question Review</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-10 text-center">
          <p className="text-slate-600">No questions match the selected filter.</p>
          <Button variant="outline" onClick={() => setFilter("all")} className="mt-4">
            Show All Questions
          </Button>
        </main>
      </div>
    );
  }

  const currentQuestion = filteredQuestions[currentIndex];
  const totalFiltered = filteredQuestions.length;
  const incorrectCount = questions.filter((q) => !q.isCorrect).length;
  const flaggedCount = questions.filter((q) => q.isFlagged).length;

  // Use the same session seed as the exam — produces identical shuffle order
  const [sessionSeed] = useState(() => getOrCreateSessionSeed());
  const shuffleQuestion = currentQuestion ? {
    id: currentQuestion.id,
    optionA: currentQuestion.options.A || null,
    optionB: currentQuestion.options.B || null,
    optionC: currentQuestion.options.C || null,
    optionD: currentQuestion.options.D || null,
    optionE: currentQuestion.options.E || null,
    correctAnswer: currentQuestion.correctAnswer,
  } : null;
  const { options: shuffledOptions } = useShuffledOptions(shuffleQuestion, sessionSeed);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/mock-results/${resultId}`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Question Review</h1>
              <p className="text-sm text-slate-600">
                {currentIndex + 1} of {totalFiltered} {filter !== "all" ? `(${filter})` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showExplanation ? "default" : "outline"}
              size="sm"
              onClick={() => setShowExplanation(!showExplanation)}
              className={showExplanation ? "bg-green-600 hover:bg-green-700 text-white" : ""}
            >
              Explanations {showExplanation ? "ON" : "OFF"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilter("all"); setCurrentIndex(0); }}
            className={filter === "all" ? "bg-slate-800 text-white" : ""}
          >
            All ({questions.length})
          </Button>
          <Button
            variant={filter === "incorrect" ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilter("incorrect"); setCurrentIndex(0); }}
            className={filter === "incorrect" ? "bg-red-600 text-white hover:bg-red-700" : "text-red-600 border-red-200"}
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Incorrect ({incorrectCount})
          </Button>
          <Button
            variant={filter === "correct" ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilter("correct"); setCurrentIndex(0); }}
            className={filter === "correct" ? "bg-green-600 text-white hover:bg-green-700" : "text-green-600 border-green-200"}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Correct ({questions.length - incorrectCount})
          </Button>
          {flaggedCount > 0 && (
            <Button
              variant={filter === "flagged" ? "default" : "outline"}
              size="sm"
              onClick={() => { setFilter("flagged"); setCurrentIndex(0); }}
              className={filter === "flagged" ? "bg-amber-500 text-white hover:bg-amber-600" : "text-amber-600 border-amber-200"}
            >
              <Flag className="w-3.5 h-3.5 mr-1" />
              Flagged ({flaggedCount})
            </Button>
          )}
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <Card className="p-6 sm:p-8 mb-6">
            {/* Status & Specialty */}
            <div className="flex items-center gap-3 mb-6">
              {currentQuestion.isCorrect ? (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Incorrect
                </span>
              )}
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                {currentQuestion.specialty}
              </span>
              {currentQuestion.isFlagged && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
                  <Flag className="w-3 h-3" /> Flagged
                </span>
              )}
            </div>

            {/* Question Stem */}
            <h2 className="text-lg font-bold text-slate-900 mb-8 leading-relaxed">
              {currentQuestion.stem}
            </h2>

            {/* Options with correct/incorrect highlighting (shuffled to match exam order) */}
            <div className="space-y-3 mb-8">
              {shuffledOptions.map((opt) => {
                const isUserAnswer = currentQuestion.userAnswer === opt.originalKey;
                const isCorrectAnswer = currentQuestion.correctAnswer === opt.originalKey;
                const isWrongSelection = isUserAnswer && !isCorrectAnswer;

                let borderClass = "border-slate-200 bg-white";
                if (isCorrectAnswer) borderClass = "border-green-500 bg-green-50";
                if (isWrongSelection) borderClass = "border-red-500 bg-red-50";

                return (
                  <div
                    key={opt.displayLabel}
                    className={`w-full text-left p-4 rounded-lg border-2 min-h-[3.5rem] ${borderClass}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-medium text-sm flex-shrink-0 mt-0.5 ${
                        isCorrectAnswer ? "border-green-600 bg-green-600 text-white" :
                        isWrongSelection ? "border-red-500 bg-red-500 text-white" :
                        "border-slate-300 text-slate-500"
                      }`}>
                        {isCorrectAnswer ? "✓" : isWrongSelection ? "✗" : opt.displayLabel}
                      </div>
                      <div className="flex-1">
                        <span className="text-slate-900 leading-snug">{opt.text}</span>
                        {showExplanation && currentQuestion.explanations[opt.originalKey as keyof typeof currentQuestion.explanations] && (
                          <p className="text-sm text-slate-600 mt-2 italic">
                            {currentQuestion.explanations[opt.originalKey as keyof typeof currentQuestion.explanations]}
                          </p>
                        )}
                      </div>
                      {isUserAnswer && (
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Your answer
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && currentQuestion.correctExplanation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-bold text-blue-900 mb-2">Explanation</h4>
                <p className="text-sm text-blue-800 leading-relaxed">{currentQuestion.correctExplanation}</p>
              </div>
            )}

            {/* NICE Reference */}
            {currentQuestion.niceReference && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-800">
                  <strong>Reference:</strong> {currentQuestion.niceReference}
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            {currentIndex + 1} / {totalFiltered}
          </span>
          <Button
            onClick={() => setCurrentIndex(Math.min(totalFiltered - 1, currentIndex + 1))}
            disabled={currentIndex === totalFiltered - 1}
            className="bg-green-600 hover:bg-green-700 text-white gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
