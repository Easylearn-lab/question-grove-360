import { useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, BookmarkX, Search, X, Filter } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { toast } from "sonner";
import { CrossSellGate } from "@/components/CrossSellGate";
import { useExamAccess } from "@/hooks/useExamAccess";

const DIFFICULTIES = ["All Levels", "Medium", "Hard"];

export default function Bookmarks() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const [, navigate] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [specialty, setSpecialty] = useState("All Specialties");
  const [difficulty, setDifficulty] = useState("All Levels");

  const { hasAccess: isPremium } = useExamAccess("AKT");

  // Fetch bookmarks
  const { data: bookmarks = [], isLoading, refetch } = trpc.questions.getBookmarks.useQuery({
    limit: 200,
    offset: 0,
  });

  // Derive specialties dynamically from bookmark data
  const availableSpecialties = useMemo(() => {
    const specs = new Set<string>();
    bookmarks.forEach((b) => {
      if (b.specialty) specs.add(b.specialty);
    });
    return ["All Specialties", ...Array.from(specs).sort()];
  }, [bookmarks]);

  // Mutations
  const removeBookmarkMutation = trpc.questions.removeBookmark.useMutation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  // Filter bookmarks based on search, specialty, and difficulty
  const filteredBookmarks = useMemo(() => {
    let filtered = [...bookmarks];

    if (specialty !== "All Specialties") {
      filtered = filtered.filter((b) => b.specialty === specialty);
    }

    if (difficulty !== "All Levels") {
      filtered = filtered.filter((b) => b.difficulty === difficulty);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.question?.toLowerCase().includes(query) ||
          b.specialty?.toLowerCase().includes(query) ||
          b.domain?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [bookmarks, specialty, difficulty, searchQuery]);

  // Reset question index when filters change
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
  }, [specialty, difficulty, searchQuery]);

  const hasActiveFilters = specialty !== "All Specialties" || difficulty !== "All Levels" || searchQuery.trim() !== "";

  const clearFilters = () => {
    setSpecialty("All Specialties");
    setDifficulty("All Levels");
    setSearchQuery("");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const currentQuestion = filteredBookmarks[currentQuestionIndex];
  const totalQuestions = filteredBookmarks.length;

  const handleRemoveBookmark = () => {
    if (!currentQuestion || currentQuestion.questionId === null) return;
    removeBookmarkMutation.mutate(currentQuestion.questionId, {
      onSuccess: () => {
        toast.success("Bookmark removed");
        refetch();
        if (currentQuestionIndex > 0 && currentQuestionIndex >= filteredBookmarks.length - 1) {
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
    <CrossSellGate hasAccess={isPremium} requiredTrack="AKT" featureName="Bookmarks">
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
              {bookmarks.length} total saved
            </div>
          </div>

          {/* Filters Section */}
          <Card className="p-4 mb-6 border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Filter & Search</span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-auto text-xs text-slate-500 hover:text-slate-700 gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search bookmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Specialty Filter */}
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent>
                  {availableSpecialties.map((spec: string) => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Difficulty Filter */}
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((diff) => (
                    <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active filter summary */}
            {hasActiveFilters && (
              <div className="mt-3 text-xs text-slate-500">
                Showing {filteredBookmarks.length} of {bookmarks.length} bookmarked questions
              </div>
            )}
          </Card>

          {/* Empty State */}
          {bookmarks.length === 0 ? (
            <Card className="p-12 text-center">
              <BookmarkX className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 text-lg mb-4">No bookmarked questions yet</p>
              <p className="text-slate-500 mb-6">
                Bookmark difficult questions from the Question Bank to review them later.
              </p>
              <Button
                onClick={() => navigate("/questions")}
                className="bg-green-600 hover:bg-green-700 text-gray-900"
              >
                Go to Question Bank
              </Button>
            </Card>
          ) : filteredBookmarks.length === 0 ? (
            <Card className="p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 text-lg mb-4">No matching bookmarks</p>
              <p className="text-slate-500 mb-6">
                No bookmarked questions match your current filters. Try adjusting your search or filter settings.
              </p>
              <Button
                onClick={clearFilters}
                variant="outline"
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Clear All Filters
              </Button>
            </Card>
          ) : (
            <>
              {/* Question Counter */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-600 font-medium">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
              </div>

              {/* Question Card */}
              <Card className="p-6 mb-6 border-2 border-slate-200">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-green-600">
                      {currentQuestion?.specialty || "General"}
                    </span>
                    {currentQuestion?.difficulty && currentQuestion.difficulty !== "Easy" && (
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        currentQuestion.difficulty === "Hard" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {currentQuestion.difficulty}
                      </span>
                    )}
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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-gray-900"
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </CrossSellGate>
  );
}
