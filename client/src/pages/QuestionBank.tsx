import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bookmark, Flag, ChevronRight, ChevronLeft, BookOpen, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SubscriptionGate } from "@/components/SubscriptionGate";

const SPECIALTIES = [
  "All Specialties",
  "Cardiology",
  "Respiratory",
  "Gastroenterology",
  "Neurology",
  "Endocrinology",
  "Dermatology",
  "Psychiatry",
  "Musculoskeletal",
  "Renal",
];

const DIFFICULTIES = ["All Levels", "Easy", "Medium", "Hard"];

export default function QuestionBank() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"tutor" | "exam">("tutor");
  const [specialty, setSpecialty] = useState("All Specialties");
  const [difficulty, setDifficulty] = useState("All Levels");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  // Fetch questions from server
  const questionsQuery = trpc.questions.getQuestions.useQuery(
    {
      specialty: specialty === "All Specialties" ? undefined : specialty,
      limit: 50,
      offset: 0,
    },
    { enabled: isAuthenticated }
  );

  const recordAttempt = trpc.mockExams.recordAttempt.useMutation();
  const bookmarkMutation = trpc.questions.bookmarkQuestion.useMutation();

  // Filter questions client-side for difficulty and search
  const filteredQuestions = useMemo(() => {
    if (!questionsQuery.data) return [];
    let filtered = [...questionsQuery.data];

    if (difficulty !== "All Levels") {
      filtered = filtered.filter((q) => q.difficulty === difficulty);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.question.toLowerCase().includes(query) ||
          (q.specialty && q.specialty.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [questionsQuery.data, difficulty, searchQuery]);

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const currentQuestion = filteredQuestions[currentQuestionIndex];
  const totalQuestions = filteredQuestions.length;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setBookmarked(false);
      setFlagged(false);
      setNotes("");
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setBookmarked(false);
      setFlagged(false);
      setNotes("");
    }
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setShowExplanation(true);

    // Record the attempt
    recordAttempt.mutate({
      questionId: currentQuestion.id,
      examId: currentQuestion.examId,
      selectedAnswer,
      isCorrect,
      timeTaken: 0,
      mode,
    });

    if (mode === "tutor") {
      toast[isCorrect ? "success" : "error"](
        isCorrect ? "Correct! Well done." : "Incorrect. Review the explanation below."
      );
    }
  };

  const handleBookmark = () => {
    if (!currentQuestion) return;
    setBookmarked(!bookmarked);
    bookmarkMutation.mutate(currentQuestion.id);
    toast.success(bookmarked ? "Bookmark removed" : "Question bookmarked");
  };

  // Empty state when no questions are available
  if (!questionsQuery.isLoading && totalQuestions === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-teal-100 rounded-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">No Questions Available</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            {questionsQuery.data?.length === 0
              ? "Questions haven't been added to the database yet. Check back soon or contact your administrator."
              : "No questions match your current filters. Try adjusting your specialty or difficulty settings."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => { setSpecialty("All Specialties"); setDifficulty("All Levels"); setSearchQuery(""); }}>
              Reset Filters
            </Button>
            <Button onClick={() => navigate("/dashboard")} className="bg-teal-600 hover:bg-teal-700 text-white">
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              {totalQuestions > 0 ? `Question ${currentQuestionIndex + 1} of ${totalQuestions}` : "Loading..."}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <Card className="p-6 border-slate-200 sticky top-24">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Filters</h2>

              <div className="space-y-6">
                {/* Mode Selection */}
                <div>
                  <Label className="text-slate-700 font-medium mb-3 block">Mode</Label>
                  <div className="space-y-2">
                    <button
                      onClick={() => setMode("tutor")}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        mode === "tutor" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Tutor Mode
                    </button>
                    <button
                      onClick={() => setMode("exam")}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        mode === "exam" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Exam Mode
                    </button>
                  </div>
                </div>

                {/* Specialty Filter */}
                <div>
                  <Label className="text-slate-700 font-medium">Specialty</Label>
                  <Select value={specialty} onValueChange={(v) => { setSpecialty(v); setCurrentQuestionIndex(0); }}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((spec) => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <Label className="text-slate-700 font-medium">Difficulty</Label>
                  <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setCurrentQuestionIndex(0); }}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((diff) => (
                        <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div>
                  <Label className="text-slate-700 font-medium">Search</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentQuestionIndex(0); }}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Question Display */}
          <div className="lg:col-span-3">
            {questionsQuery.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
              </div>
            ) : currentQuestion ? (
              <>
                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">Progress</span>
                    <span className="text-sm text-slate-600">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-teal-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {/* Question Card */}
                <Card className="p-8 border-slate-200 mb-8">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {currentQuestion.specialty && (
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                            {currentQuestion.specialty}
                          </span>
                        )}
                        {currentQuestion.difficulty && (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            currentQuestion.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                            currentQuestion.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {currentQuestion.difficulty}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleBookmark} className={bookmarked ? "text-teal-600" : "text-slate-400"}>
                          <Bookmark className="w-5 h-5" fill={bookmarked ? "currentColor" : "none"} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setFlagged(!flagged)} className={flagged ? "text-orange-600" : "text-slate-400"}>
                          <Flag className="w-5 h-5" fill={flagged ? "currentColor" : "none"} />
                        </Button>
                      </div>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 mb-6">{currentQuestion.question}</h2>
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-3 mb-8">
                    {["A", "B", "C", "D", "E"].map((option) => {
                      const optionKey = `option${option}` as keyof typeof currentQuestion;
                      const optionText = currentQuestion[optionKey] as string | null;
                      if (!optionText) return null;

                      const isSelected = selectedAnswer === option;
                      const isCorrect = option === currentQuestion.correctAnswer;
                      const showCorrect = showExplanation && isCorrect;
                      const showIncorrect = showExplanation && isSelected && !isCorrect;

                      return (
                        <button
                          key={option}
                          onClick={() => !showExplanation && setSelectedAnswer(option)}
                          disabled={showExplanation}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            showCorrect ? "border-green-500 bg-green-50" :
                            showIncorrect ? "border-red-500 bg-red-50" :
                            isSelected ? "border-teal-600 bg-teal-50" :
                            "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-medium text-sm ${
                              showCorrect ? "border-green-500 bg-green-500 text-white" :
                              showIncorrect ? "border-red-500 bg-red-500 text-white" :
                              isSelected ? "border-teal-600 bg-teal-600 text-white" :
                              "border-slate-300"
                            }`}>
                              {option}
                            </div>
                            <span className="text-slate-900">{optionText}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Submit Button */}
                  {!showExplanation && (
                    <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                      Submit Answer
                    </Button>
                  )}

                  {/* Explanation (Tutor Mode) */}
                  {showExplanation && mode === "tutor" && (
                    <div className="mt-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
                      <h3 className="font-bold text-slate-900 mb-3">Explanation</h3>
                      <p className="text-slate-700 mb-4">{currentQuestion.explanationCorrect || "No explanation available for this question."}</p>
                      {currentQuestion.reference && (
                        <p className="text-sm text-slate-600">
                          <strong>Reference:</strong> {currentQuestion.reference}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {showExplanation && (
                    <div className="mt-6">
                      <Label className="text-slate-700 font-medium">Personal Notes</Label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add your notes for this question..."
                        className="w-full mt-2 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
                        rows={3}
                      />
                    </div>
                  )}
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button onClick={handlePrevious} disabled={currentQuestionIndex === 0} variant="outline" className="gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <div className="text-sm text-slate-600">
                    {currentQuestionIndex + 1} / {totalQuestions}
                  </div>
                  <Button onClick={handleNext} disabled={currentQuestionIndex === totalQuestions - 1} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
