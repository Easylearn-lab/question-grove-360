import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trash2, BookmarkX } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { useSubscription } from "@/hooks/useSubscription";

export default function Bookmarks() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const { isPremium } = useSubscription();

  // Fetch bookmarks
  const { data: bookmarks = [], isLoading, refetch } = trpc.questions.getBookmarks.useQuery({
    limit: 100,
    offset: 0,
  });

  // Mutations
  const removeBookmarkMutation = trpc.questions.removeBookmark.useMutation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const currentQuestion = bookmarks[currentQuestionIndex];
  const totalQuestions = bookmarks.length;

  const handleRemoveBookmark = () => {
    if (!currentQuestion || currentQuestion.questionId === null) return;
    removeBookmarkMutation.mutate(currentQuestion.questionId, {
      onSuccess: () => {
        toast.success("Bookmark removed");
        refetch();
        if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
      },
      onError: () => {
        toast.error("Failed to remove bookmark");
      },
    });
  };

  const handleSelectAnswer = (option: string) => {
    setSelectedAnswer(option);
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  return (
    <SubscriptionGate isPremium={isPremium} featureName="Bookmarks">
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="hover:bg-slate-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-3xl font-bold text-slate-900">Bookmarked Questions</h1>
            </div>
            <div className="text-sm text-slate-600">
              {totalQuestions === 0 ? "No bookmarks" : `${currentQuestionIndex + 1} of ${totalQuestions}`}
            </div>
          </div>

          {/* Empty State */}
          {totalQuestions === 0 ? (
            <Card className="p-12 text-center">
              <BookmarkX className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 text-lg mb-4">No bookmarked questions yet</p>
              <p className="text-slate-500 mb-6">
                Bookmark difficult questions from the Question Bank to review them later.
              </p>
              <Button
                onClick={() => navigate("/questions")}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Go to Question Bank
              </Button>
            </Card>
          ) : (
            <>
              {/* Question Card */}
              <Card className="p-6 mb-6 border-2 border-slate-200">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-teal-600">
                      {currentQuestion?.specialty || "General"}
                    </span>
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                      {currentQuestion?.difficulty || "Medium"}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-4">{currentQuestion?.question}</h2>
                </div>

                {/* Options */}
                <div className="space-y-3 mb-6">
                  {["A", "B", "C", "D", "E"].map((letter) => {
                    const optionKey = `option${letter}` as keyof typeof currentQuestion;
                    const optionText = currentQuestion?.[optionKey];
                    if (!optionText) return null;

                    const isCorrect = currentQuestion?.correctAnswer === letter;
                    const isSelected = selectedAnswer === letter;

                    return (
                      <button
                        key={letter}
                        onClick={() => handleSelectAnswer(letter)}
                        className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${
                          isSelected
                            ? isCorrect
                              ? "border-green-500 bg-green-50"
                              : "border-red-500 bg-red-50"
                            : showExplanation && isCorrect
                              ? "border-green-500 bg-green-50"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="font-semibold text-slate-900">{letter}. {String(optionText)}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {showExplanation && currentQuestion && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                    <p className="text-sm text-slate-700">
                      <strong>Correct Answer:</strong> {currentQuestion.correctAnswer}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mb-6">
                  <Button
                    onClick={() => setShowExplanation(!showExplanation)}
                    variant="outline"
                    className="flex-1"
                  >
                    {showExplanation ? "Hide" : "Show"} Explanation
                  </Button>
                  <Button
                    onClick={handleRemoveBookmark}
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </Button>
                </div>
              </Card>

              {/* Navigation */}
              <div className="flex gap-3 justify-between">
                <Button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                  className="flex-1"
                >
                  Previous
                </Button>
                <div className="flex items-center justify-center px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-700 font-semibold">
                  {currentQuestionIndex + 1} / {totalQuestions}
                </div>
                <Button
                  onClick={handleNext}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </SubscriptionGate>
  );
}
