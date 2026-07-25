import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, Flag, Timer, AlertTriangle, CheckCircle2, XCircle, RotateCcw, CloudUpload } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useStudySession } from "@/contexts/StudySessionContext";
import { useQuizPersistence, loadQuizProgress, clearQuizProgress } from "@/hooks/useQuizPersistence";
import { ReconnectingBanner } from "@/components/ReconnectingBanner";

interface MockQuestion {
  id: number;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string | null;
  optionE: string | null;
  specialty: string;
  tags: string;
}

interface MockData {
  mockId: number;
  questions: MockQuestion[];
  timerMinutes: number;
  totalQuestions: number;
  passMarkPercentage: number;
}

export default function ActiveMockExam() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/mock-exam/:id");
  const { startStudySession, endStudySession } = useStudySession();

  const [mockData, setMockData] = useState<MockData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionKeyRef = useRef<string | null>(null);

  const submitMutation = trpc.mockExams.submitMock.useMutation({
    onSuccess: (data) => {
      // Clear saved progress on successful submission
      clearProgress();
      endStudySession();
      toast.success("Mock exam submitted!");
      navigate(`/mock-results/${data.resultId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit exam. Your progress is saved — please try again.");
      setIsSubmitting(false);
    },
  });

  // Resume from saved progress
  const handleResume = useCallback(() => {
    if (!sessionKeyRef.current) return;
    const savedProgress = loadQuizProgress(sessionKeyRef.current);
    if (savedProgress) {
      setCurrentIndex(savedProgress.currentIndex);
      setAnswers(savedProgress.answers);
      setFlagged(new Set(savedProgress.flaggedIds));
      if (savedProgress.timeRemaining !== null) {
        setTimeRemaining(savedProgress.timeRemaining);
      }
      toast.success(`Resumed from question ${savedProgress.currentIndex + 1}`);
    }
    setShowResumePrompt(false);
  }, []);

  const handleStartFresh = useCallback(() => {
    if (sessionKeyRef.current) {
      clearQuizProgress(sessionKeyRef.current);
    }
    if (mockData) {
      setTimeRemaining(mockData.timerMinutes * 60);
    }
    setShowResumePrompt(false);
  }, [mockData]);

  // Register study session on mount, deregister on unmount
  useEffect(() => {
    startStudySession("mock-exam");
    return () => {
      endStudySession();
    };
  }, []);

  // Load mock data from sessionStorage, check for saved progress
  useEffect(() => {
    const stored = sessionStorage.getItem("activeMockData");
    if (stored) {
      const data = JSON.parse(stored) as MockData;
      setMockData(data);
      const key = `mock-${data.mockId}`;
      sessionKeyRef.current = key;

      // Check if there's saved progress to resume
      const savedProgress = loadQuizProgress(key);
      if (savedProgress && savedProgress.currentIndex > 0) {
        setShowResumePrompt(true);
        // Pre-load the saved state (user can choose to resume or start fresh)
        setTimeRemaining(savedProgress.timeRemaining ?? data.timerMinutes * 60);
      } else {
        setTimeRemaining(data.timerMinutes * 60);
      }
    } else {
      toast.error("No exam data found. Please start a new mock.");
      navigate("/mock-exams");
    }
  }, []);

  // Auto-save quiz progress using the persistence hook
  const persistenceData = useMemo(() => {
    if (!mockData) return null;
    return {
      currentIndex,
      answers,
      flaggedIds: Array.from(flagged),
      timeRemaining,
      totalQuestions: mockData.totalQuestions,
      examId: mockData.mockId,
      metadata: { examName: `MRCGP AKT - Full Mock ${mockData.mockId}` },
    };
  }, [currentIndex, answers, flagged, timeRemaining, mockData]);

  const { clear: clearProgress, lastSavedAt } = useQuizPersistence(sessionKeyRef.current, persistenceData);

  // Use a ref to always have the latest submit function available for the timer
  const submitRef = useRef<() => void>(() => {});

  const handleSubmit = useCallback(() => {
    if (!mockData || isSubmitting) return;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const timeTaken = (mockData.timerMinutes * 60) - timeRemaining;
    submitMutation.mutate({
      mockId: mockData.mockId,
      mockName: `MRCGP AKT - Full Mock ${mockData.mockId}`,
      answers,
      flaggedQuestions: Array.from(flagged),
      timeTaken,
    });
  }, [mockData, answers, flagged, timeRemaining, isSubmitting]);

  // Keep submitRef up to date
  useEffect(() => {
    submitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Timer
  useEffect(() => {
    if (!mockData || timeRemaining <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Use ref to call the latest handleSubmit
          submitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mockData]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(answers).length;

  if (!mockData || loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-slate-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = mockData.questions[currentIndex];
  const totalQuestions = mockData.totalQuestions;
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id.toString()] : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <ReconnectingBanner />
      {/* Timer Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-900 hidden sm:block">MRCGP AKT Mock</h1>
            <span className="text-sm text-slate-600 font-medium">
              Q{currentIndex + 1}/{totalQuestions}
            </span>
            <span className="text-xs text-slate-500">
              {answeredCount} answered
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-save indicator */}
            {lastSavedAt && (
              <div className="flex items-center gap-1.5 text-xs text-green-600" title={`Progress saved at ${new Date(lastSavedAt).toLocaleTimeString()}`}>
                <CloudUpload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${
              timeRemaining < 300 ? "bg-red-100 text-red-700 animate-pulse" : 
              timeRemaining < 600 ? "bg-amber-100 text-amber-700" : 
              "bg-slate-100 text-slate-700"
            }`}>
              <Timer className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </div>
            <Button
              onClick={() => setShowConfirmSubmit(true)}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Finish Exam
            </Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 bg-slate-100">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question Palette - Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="p-4 sticky top-24">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Question Navigator</h3>
              <div className="grid grid-cols-8 lg:grid-cols-5 gap-1.5 max-h-[400px] overflow-y-auto">
                {mockData.questions.map((q, idx) => {
                  const isAnswered = !!answers[q.id.toString()];
                  const isCurrent = idx === currentIndex;
                  const isFlagged = flagged.has(q.id);
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-8 h-8 rounded text-xs font-medium transition-all relative ${
                        isCurrent ? "bg-green-600 text-white ring-2 ring-green-300" :
                        isAnswered ? "bg-green-100 text-green-700" :
                        "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full"></span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Answered</span>
                  <span className="font-bold text-slate-900">{answeredCount}/{totalQuestions}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-green-600 h-1.5 rounded-full transition-all" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Flagged</span>
                  <span className="font-bold text-amber-600">{flagged.size}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Question Area */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {currentQuestion && (
              <Card className="p-6 sm:p-8">
                {/* Question metadata */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                    {currentQuestion.specialty}
                  </span>
                  {flagged.has(currentQuestion.id) && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
                      <Flag className="w-3 h-3" /> Flagged
                    </span>
                  )}
                </div>

                {/* Question stem */}
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-8 leading-relaxed">
                  {currentQuestion.stem}
                </h2>

                {/* Options */}
                <div className="space-y-3 mb-8">
                  {(["A", "B", "C", "D", "E"] as const).map((option) => {
                    const optionKey = `option${option}` as keyof MockQuestion;
                    const optionText = currentQuestion[optionKey] as string | null;
                    if (!optionText) return null;
                    const isSelected = selectedAnswer === option;

                    return (
                      <button
                        key={option}
                        onClick={() => {
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.id.toString()]: option,
                          }));
                        }}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-green-600 bg-green-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-medium text-sm flex-shrink-0 mt-0.5 ${
                            isSelected ? "border-green-600 bg-green-600 text-white" : "border-slate-300 text-slate-500"
                          }`}>
                            {option}
                          </div>
                          <span className="text-slate-900">{optionText}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                      disabled={currentIndex === 0}
                      className="gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev
                    </Button>
                    <Button
                      variant={flagged.has(currentQuestion.id) ? "default" : "outline"}
                      onClick={() => {
                        const newFlagged = new Set(flagged);
                        if (newFlagged.has(currentQuestion.id)) {
                          newFlagged.delete(currentQuestion.id);
                        } else {
                          newFlagged.add(currentQuestion.id);
                        }
                        setFlagged(newFlagged);
                      }}
                      className={flagged.has(currentQuestion.id) ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                    >
                      <Flag className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={() => setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))}
                    disabled={currentIndex === totalQuestions - 1}
                    className="bg-green-600 hover:bg-green-700 text-white gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Resume Prompt Modal */}
      {showResumePrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <RotateCcw className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Resume Previous Attempt?</h3>
              <p className="text-slate-600 mb-6">
                You have a saved session for this mock exam. Would you like to resume where you left off?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleStartFresh}
                  className="flex-1"
                >
                  Start Fresh
                </Button>
                <Button
                  onClick={handleResume}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Resume
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Submit Exam?</h3>
              <p className="text-slate-600 mb-2">
                You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
              </p>
              {answeredCount < totalQuestions && (
                <p className="text-amber-600 text-sm mb-6">
                  {totalQuestions - answeredCount} questions are unanswered and will be marked incorrect.
                </p>
              )}
              {flagged.size > 0 && (
                <p className="text-sm text-slate-500 mb-6">
                  You have {flagged.size} flagged question{flagged.size > 1 ? "s" : ""}.
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmSubmit(false)}
                  className="flex-1"
                >
                  Continue Exam
                </Button>
                <Button
                  onClick={() => {
                    setShowConfirmSubmit(false);
                    handleSubmit();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isSubmitting ? "Submitting..." : "Submit Now"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
