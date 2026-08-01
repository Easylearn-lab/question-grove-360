import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Clock, ChevronRight, ChevronLeft, Flag, CheckCircle, XCircle, AlertTriangle, ImageIcon, X } from "lucide-react";
import { ZoomableImage } from "@/components/ZoomableImage";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { CrossSellGate } from "@/components/CrossSellGate";
import { useExamAccess } from "@/hooks/useExamAccess";
import { useShuffledOptions, getOrCreateSessionSeed, mapDisplayToOriginal } from "@/hooks/useShuffledOptions";

const MOCK_STORAGE_KEY = "qg360_plab1_mock";

interface MockState {
  questions: any[];
  answers: Record<string, string>;
  flagged: number[];
  currentIndex: number;
  startTime: number;
  timeRemaining: number; // seconds
}

function saveMockState(state: MockState) {
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function loadMockState(): MockState | null {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearMockState() {
  localStorage.removeItem(MOCK_STORAGE_KEY);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function PLAB1MockExam() {
  useProtectedRoute();
  const [, navigate] = useLocation();
  const { hasAccess, isLoading: accessLoading } = useExamAccess("PLAB1");

  // Phases: "start" | "exam" | "results"
  const [phase, setPhase] = useState<"start" | "exam" | "results">("start");
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(180 * 60); // 3 hours in seconds
  const [results, setResults] = useState<any>(null);
  const [showNavigator, setShowNavigator] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateMockMutation = trpc.plab1.generateMockExam.useMutation();
  const submitMockMutation = trpc.plab1.submitMockExam.useMutation();

  // Check for saved state on mount
  useEffect(() => {
    const saved = loadMockState();
    if (saved && saved.questions.length > 0) {
      setQuestions(saved.questions);
      setAnswers(saved.answers);
      setFlagged(saved.flagged);
      setCurrentIndex(saved.currentIndex);
      setTimeRemaining(saved.timeRemaining);
      setPhase("exam");
    }
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - auto-submit
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Save state periodically
  useEffect(() => {
    if (phase === "exam" && questions.length > 0) {
      saveMockState({
        questions,
        answers,
        flagged,
        currentIndex,
        startTime: Date.now(),
        timeRemaining,
      });
    }
  }, [answers, flagged, currentIndex, timeRemaining, phase]);

  const currentQuestion = questions[currentIndex];
  const sessionSeed = useMemo(() => getOrCreateSessionSeed(), []);
  const { options: shuffledOptions } = useShuffledOptions(currentQuestion, sessionSeed);

  // Start exam
  const handleStartExam = async () => {
    try {
      const result = await generateMockMutation.mutateAsync();
      if (result.questions.length < 180) {
        toast.error(`Only ${result.questions.length} questions available. Need 180 for a full mock.`);
        if (result.questions.length === 0) return;
      }
      setQuestions(result.questions);
      setAnswers({});
      setFlagged([]);
      setCurrentIndex(0);
      setTimeRemaining(result.timerMinutes * 60);
      setPhase("exam");
      clearMockState();
      toast.success("Mock exam started. Good luck!");
    } catch (error) {
      toast.error("Failed to generate mock exam. Please try again.");
    }
  };

  // Submit exam
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const timeTaken = (180 * 60) - timeRemaining;
      const result = await submitMockMutation.mutateAsync({
        answers,
        timeTaken,
      });
      setResults(result);
      setPhase("results");
      clearMockState();
    } catch (error) {
      toast.error("Failed to submit exam. Your answers are saved locally.");
      setIsSubmitting(false);
    }
  };

  // Answer selection
  const handleSelectAnswer = (displayLabel: string) => {
    if (!currentQuestion) return;
    const originalLabel = mapDisplayToOriginal(displayLabel, shuffledOptions) || "";
    setAnswers((prev) => ({ ...prev, [currentQuestion.id.toString()]: originalLabel }));
  };

  // Flag toggle
  const toggleFlag = () => {
    if (!currentQuestion) return;
    setFlagged((prev) =>
      prev.includes(currentQuestion.id)
        ? prev.filter((id) => id !== currentQuestion.id)
        : [...prev, currentQuestion.id]
    );
  };

  // Navigation
  const goTo = (index: number) => {
    setCurrentIndex(index);
    setShowNavigator(false);
  };

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  // Loading
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Access gate
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate("/plab1")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <CrossSellGate requiredTrack="PLAB1" featureName="PLAB 1 Mock Exam" hasAccess={hasAccess}>
            <div />
          </CrossSellGate>
        </div>
      </div>
    );
  }

  // START PHASE
  if (phase === "start") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/plab1")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-slate-900">PLAB 1 Full Mock Exam</h1>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Full Length Mock Exam</h2>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              This mock replicates the real PLAB 1 exam: 180 single best answer questions in 3 hours.
              No negative marking. Pass mark is 63%.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500">Questions</p>
                <p className="text-xl font-bold text-slate-900">180</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500">Time</p>
                <p className="text-xl font-bold text-slate-900">3:00:00</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-500">Pass Mark</p>
                <p className="text-xl font-bold text-slate-900">63%</p>
              </div>
            </div>

            <Button
              onClick={handleStartExam}
              disabled={generateMockMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            >
              {generateMockMutation.isPending ? "Generating..." : "Start Exam"}
            </Button>

            {loadMockState() && (
              <div className="mt-4">
                <Button variant="outline" onClick={() => {
                  const saved = loadMockState();
                  if (saved) {
                    setQuestions(saved.questions);
                    setAnswers(saved.answers);
                    setFlagged(saved.flagged);
                    setCurrentIndex(saved.currentIndex);
                    setTimeRemaining(saved.timeRemaining);
                    setPhase("exam");
                  }
                }}>
                  Resume Previous Attempt
                </Button>
              </div>
            )}
          </Card>
        </main>
      </div>
    );
  }

  // RESULTS PHASE
  if (phase === "results" && results) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/plab1")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-slate-900">Mock Exam Results</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          {/* Score card */}
          <Card className={`p-8 text-center mb-6 ${results.passed ? "border-green-300 bg-green-50/50" : "border-red-300 bg-red-50/50"}`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: results.passed ? "#dcfce7" : "#fee2e2" }}>
              {results.passed ? <CheckCircle className="w-8 h-8 text-green-600" /> : <XCircle className="w-8 h-8 text-red-600" />}
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-1">
              {results.score} / {results.totalQuestions}
            </h2>
            <p className="text-xl text-slate-600 mb-2">{results.percentage.toFixed(1)}%</p>
            <p className={`text-lg font-semibold ${results.passed ? "text-green-600" : "text-red-600"}`}>
              {results.passed ? "PASSED" : "NOT PASSED"} (Pass mark: {results.passMark}%)
            </p>
          </Card>

          {/* Specialty breakdown */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">Specialty Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(results.specialtyBreakdown || {}).sort((a: any, b: any) => a[1].percentage - b[1].percentage).map(([specialty, data]: [string, any]) => (
                <div key={specialty}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{specialty}</span>
                    <span className={`font-medium ${data.percentage >= 63 ? "text-green-600" : "text-red-600"}`}>
                      {data.correct}/{data.total} ({data.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${data.percentage >= 63 ? "bg-green-500" : "bg-red-400"}`}
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/plab1")} className="flex-1">
              Back to PLAB 1
            </Button>
            <Button onClick={() => { setPhase("start"); setResults(null); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              Try Again
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // EXAM PHASE
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Exam header with timer */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">
              Q{currentIndex + 1}/{questions.length}
            </span>
            <span className="text-xs text-slate-400">
              {answeredCount} answered · {unansweredCount} remaining
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
              timeRemaining < 600 ? "bg-red-100 text-red-700" :
              timeRemaining < 1800 ? "bg-amber-100 text-amber-700" :
              "bg-slate-100 text-slate-700"
            }`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-medium text-sm">{formatTime(timeRemaining)}</span>
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowNavigator(!showNavigator)}>
              Navigator
            </Button>
            <Button variant="outline" size="sm" onClick={toggleFlag}>
              <Flag className={`w-4 h-4 ${flagged.includes(currentQuestion?.id) ? "fill-amber-400 text-amber-500" : ""}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (unansweredCount > 0) {
                  if (!confirm(`You have ${unansweredCount} unanswered questions. Submit anyway?`)) return;
                }
                handleSubmit();
              }}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? "Submitting..." : "Submit Exam"}
            </Button>
          </div>
        </div>
      </header>

      {/* Question content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {currentQuestion && (
          <Card className="p-6">
            {/* Metadata */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                {currentQuestion.specialty}
              </span>
              {currentQuestion.topic && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {currentQuestion.topic}
                </span>
              )}
            </div>

            {/* Image */}
            {currentQuestion.imageUrl && (
              <div className="mb-4">
                <ZoomableImage
                  src={currentQuestion.imageUrl}
                  alt={currentQuestion.imageCaption || "Clinical image"}
                  caption={currentQuestion.imageCaption}
                  imageType={currentQuestion.imageType}
                  maxHeight="14rem"
                />
              </div>
            )}

            {/* Stem */}
            <div className="text-slate-900 mb-6 leading-relaxed whitespace-pre-wrap">
              {currentQuestion.stem}
            </div>

            {/* Options */}
            <div className="space-y-3">
              {shuffledOptions.map((opt: any) => {
                const originalLabel = mapDisplayToOriginal(opt.displayLabel, shuffledOptions) || "";
                const isSelected = answers[currentQuestion.id.toString()] === originalLabel;

                return (
                  <button
                    key={opt.displayLabel}
                    onClick={() => handleSelectAnswer(opt.displayLabel)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-green-500 bg-green-50/50"
                        : "border-slate-200 hover:border-green-300 hover:bg-green-50/30"
                    }`}
                  >
                    <span className="font-semibold text-slate-700 mr-3">{opt.displayLabel}.</span>
                    <span className="text-slate-800">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => goTo(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => goTo(Math.min(questions.length - 1, currentIndex + 1))} disabled={currentIndex >= questions.length - 1}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </Card>
        )}
      </main>

      {/* Question Navigator overlay */}
      {showNavigator && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNavigator(false)}>
          <Card className="p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-900">Question Navigator</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNavigator(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3 mb-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> Answered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-400 rounded" /> Flagged</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-200 rounded" /> Unanswered</span>
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {questions.map((q: any, i: number) => {
                const isAnswered = !!answers[q.id.toString()];
                const isFlagged = flagged.includes(q.id);
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => goTo(i)}
                    className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                      isCurrent ? "ring-2 ring-green-500 ring-offset-1" : ""
                    } ${
                      isFlagged ? "bg-amber-400 text-white" :
                      isAnswered ? "bg-green-500 text-white" :
                      "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}


    </div>
  );
}
