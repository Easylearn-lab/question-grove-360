import { useLocation } from "wouter";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bookmark, Flag, ChevronRight, ChevronLeft, BookOpen, Search, CloudUpload, Cloud, Keyboard, X } from "lucide-react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CrossSellGate } from "@/components/CrossSellGate";
import { useExamAccess } from "@/hooks/useExamAccess";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useStudySession } from "@/contexts/StudySessionContext";
import { ReconnectingBanner } from "@/components/ReconnectingBanner";

const SPECIALTIES = [
  "All Specialties",
  "Cardiovascular",
  "Dermatology",
  "Endocrinology",
  "Ethics & Organisational",
  "Gastroenterology",
  "General Practice",
  "Haematology",
  "Infectious Disease",
  "Musculoskeletal",
  "Musculoskeletal Surgery",
  "Neurology",
  "Obstetrics & Gynaecology",
  "ENT",
  "Ophthalmology",
  "Paediatrics",
  "Pharmacology & Prescribing",
  "Psychiatry",
  "Renal",
  "Renal & Urology",
  "Respiratory",
];

const DIFFICULTIES = ["All Levels", "Medium", "Hard"];

// localStorage keys for session persistence
const QBANK_SESSION_KEY = "qg360_qbank_session";
const QBANK_QUESTIONS_KEY = "qg360_qbank_questions";

interface QBankSession {
  questionIds: number[];
  specialty: string;
  difficulty: string;
  currentIndex: number;
  answers: Record<number, { selectedAnswer: string; isCorrect: boolean }>;
  savedAt: number;
}

function saveQBankSession(session: QBankSession) {
  try {
    localStorage.setItem(QBANK_SESSION_KEY, JSON.stringify({ ...session, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

function saveQBankQuestions(questions: any[]) {
  try {
    // Store full question data so we can restore without a server fetch
    localStorage.setItem(QBANK_QUESTIONS_KEY, JSON.stringify(questions));
  } catch { /* ignore - may exceed quota for large sets */ }
}

function loadQBankQuestions(): any[] | null {
  try {
    const stored = localStorage.getItem(QBANK_QUESTIONS_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function loadQBankSession(): QBankSession | null {
  try {
    const stored = localStorage.getItem(QBANK_SESSION_KEY);
    if (!stored) return null;
    const data: QBankSession = JSON.parse(stored);
    // Discard if older than 4 hours
    if (Date.now() - data.savedAt > 4 * 60 * 60 * 1000) {
      localStorage.removeItem(QBANK_SESSION_KEY);
      localStorage.removeItem(QBANK_QUESTIONS_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearQBankSession() {
  try {
    localStorage.removeItem(QBANK_SESSION_KEY);
    localStorage.removeItem(QBANK_QUESTIONS_KEY);
  } catch { /* ignore */ }
}

export default function QuestionBank() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const [, navigate] = useLocation();
  const { startStudySession, endStudySession } = useStudySession();

  // Register study session on mount to prevent auth redirects
  useEffect(() => {
    startStudySession("question-bank");
    return () => { endStudySession(); };
  }, []);

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
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMode, setResetMode] = useState<"all" | "specialty">("all");
  const [selectedResetSpecialty, setSelectedResetSpecialty] = useState(specialty);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [showCloudIcon, setShowCloudIcon] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const resumeBannerShownRef = useRef(false);

  // BUG FIX 1: Initialize from localStorage immediately to survive reconnections/remounts
  const [lockedQuestions, setLockedQuestions] = useState<any[] | null>(() => {
    const saved = loadQBankSession();
    if (saved && (saved.specialty === "All Specialties" || saved.specialty === specialty)) {
      const storedQuestions = loadQBankQuestions();
      if (storedQuestions && storedQuestions.length > 0) {
        return storedQuestions;
      }
    }
    return null;
  });
  // BUG FIX 1: Initialize currentQuestionIndex from localStorage
  const [initialSession] = useState<QBankSession | null>(() => loadQBankSession());
  // BUG FIX 2: Track answers per question in session (persisted to localStorage + DB)
  const [sessionAnswers, setSessionAnswers] = useState<Record<number, { selectedAnswer: string; isCorrect: boolean }>>(
    () => initialSession?.answers || {}
  );
  // Track whether we've loaded from a saved session
  const [restoredFromSession, setRestoredFromSession] = useState(() => {
    const saved = loadQBankSession();
    const storedQuestions = loadQBankQuestions();
    return !!(saved && storedQuestions && storedQuestions.length > 0);
  });
  const sessionRestoredRef = useRef(restoredFromSession);

  // BUG FIX 1: Restore currentQuestionIndex from saved session on mount
  useEffect(() => {
    if (initialSession && lockedQuestions) {
      setCurrentQuestionIndex(Math.min(initialSession.currentIndex, lockedQuestions.length - 1));
      if (initialSession.specialty && initialSession.specialty !== "All Specialties") {
        setSpecialty(initialSession.specialty);
      }
      if (initialSession.difficulty && initialSession.difficulty !== "All Levels") {
        setDifficulty(initialSession.difficulty);
      }
    }
  }, []); // Only on mount

  // Fetch questions from server - only when we don't have locked questions
  const questionsQuery = trpc.questions.getQuestions.useQuery(
    {
      specialty: specialty === "All Specialties" ? undefined : specialty,
      limit: 500,
      offset: 0,
    },
    {
      enabled: isReady && isAuthenticated && lockedQuestions === null,
      // BUG FIX 1: Never refetch on reconnect - use locked state
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }
  );

  // BUG FIX 2: Fetch user's previous attempts for the current question set
  const questionIds = useMemo(() => {
    return (lockedQuestions || []).map((q: any) => q.id);
  }, [lockedQuestions]);

  const userAttemptsQuery = trpc.questions.getUserAttempts.useQuery(
    { questionIds },
    {
      enabled: questionIds.length > 0 && isReady && isAuthenticated,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }
  );

  // BUG FIX 1 & 3: Lock questions once loaded from server (only if not already restored from localStorage)
  useEffect(() => {
    if (questionsQuery.data && lockedQuestions === null) {
      if (questionsQuery.data.length > 0) {
        setLockedQuestions(questionsQuery.data);
        // Save full question data to localStorage for reconnection resilience
        saveQBankQuestions(questionsQuery.data);
      } else {
        // BUG FIX 3: Even if empty, lock to empty array to stop spinner
        setLockedQuestions([]);
      }
    }
  }, [questionsQuery.data, lockedQuestions]);

  // BUG FIX 3: Handle query error - stop infinite spinner
  useEffect(() => {
    if (questionsQuery.error && lockedQuestions === null) {
      console.error("[QuestionBank] Failed to fetch questions:", questionsQuery.error);
      toast.error("Failed to load questions. Please try again.");
      setLockedQuestions([]); // Stop spinner
    }
  }, [questionsQuery.error, lockedQuestions]);

  // BUG FIX 3: Timeout fallback - if questions haven't loaded after 15s, stop spinner
  useEffect(() => {
    if (lockedQuestions !== null) return;
    const timeout = setTimeout(() => {
      if (lockedQuestions === null) {
        console.warn("[QuestionBank] Question loading timed out after 15s");
        toast.error("Loading timed out. Please try selecting the specialty again.");
        setLockedQuestions([]);
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [lockedQuestions]);

  // BUG FIX 2: Always load previous attempts from DB into sessionAnswers
  // DB is the source of truth - merge DB data regardless of whether session was restored from localStorage
  useEffect(() => {
    if (userAttemptsQuery.data && userAttemptsQuery.data.length > 0) {
      let newFromServer = 0;
      setSessionAnswers(prev => {
        const merged = { ...prev };
        for (const attempt of userAttemptsQuery.data) {
          // DB data fills in any gaps (questions answered in previous sessions)
          if (!merged[attempt.questionId]) {
            merged[attempt.questionId] = {
              selectedAnswer: attempt.selectedAnswer,
              isCorrect: attempt.isCorrect,
            };
            newFromServer++;
          }
        }
        return merged;
      });
      // Show resume banner if progress was restored from server (not already shown)
      if (newFromServer > 0 && !resumeBannerShownRef.current) {
        resumeBannerShownRef.current = true;
        setShowResumeBanner(true);
        setTimeout(() => setShowResumeBanner(false), 4000);
      }
    }
  }, [userAttemptsQuery.data]);

  // Save session to localStorage on every meaningful state change
  const saveSessionRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!lockedQuestions || lockedQuestions.length === 0) return;
    if (saveSessionRef.current) clearTimeout(saveSessionRef.current);
    saveSessionRef.current = setTimeout(() => {
      const session: QBankSession = {
        questionIds: lockedQuestions.map((q: any) => q.id),
        specialty,
        difficulty,
        currentIndex: currentQuestionIndex,
        answers: sessionAnswers,
        savedAt: Date.now(),
      };
      saveQBankSession(session);
      // BUG FIX 1: Also persist full question data for reconnection resilience
      saveQBankQuestions(lockedQuestions);
      setLastSavedAt(Date.now());
    }, 500);
    return () => { if (saveSessionRef.current) clearTimeout(saveSessionRef.current); };
  }, [lockedQuestions, currentQuestionIndex, sessionAnswers, specialty, difficulty]);

  const recordAttempt = trpc.mockExams.recordAttempt.useMutation();
  const bookmarkMutation = trpc.questions.bookmarkQuestion.useMutation();
  const removeBookmarkMutation = trpc.questions.removeBookmark.useMutation();
  const resetAttemptsMutation = trpc.questions.resetAttempts.useMutation();
  const resetAttemptsBySpecialtyMutation = trpc.questions.resetAttemptsBySpecialty.useMutation();

  const handleResetAttempts = () => {
    setShowResetModal(true);
  };

  const handleConfirmReset = () => {
    if (resetMode === "all") {
      resetAttemptsMutation.mutate(undefined, {
        onSuccess: () => {
          toast.success("All question attempts have been reset");
          setShowResetModal(false);
          setSessionAnswers({});
          clearQBankSession();
          setLockedQuestions(null);
          setCurrentQuestionIndex(0);
        },
        onError: (error) => {
          toast.error("Failed to reset attempts: " + (error?.message || "Unknown error"));
        },
      });
    } else {
      resetAttemptsBySpecialtyMutation.mutate(
        { specialty: selectedResetSpecialty },
        {
          onSuccess: () => {
            toast.success(`Progress reset for ${selectedResetSpecialty}`);
            setShowResetModal(false);
            // Clear answers for questions in that specialty
            if (lockedQuestions) {
              const specialtyQIds = lockedQuestions
                .filter((q: any) => q.specialty === selectedResetSpecialty)
                .map((q: any) => q.id);
              setSessionAnswers(prev => {
                const updated = { ...prev };
                specialtyQIds.forEach((id: number) => { delete updated[id]; });
                return updated;
              });
            }
            clearQBankSession();
            setLockedQuestions(null);
            setCurrentQuestionIndex(0);
          },
          onError: (error) => {
            toast.error("Failed to reset attempts: " + (error?.message || "Unknown error"));
          },
        }
      );
    }
  };

  // Filter questions client-side for difficulty and search
  const filteredQuestions = useMemo(() => {
    const source = lockedQuestions || [];
    if (source.length === 0) return [];
    let filtered = [...source];

    if (difficulty !== "All Levels") {
      filtered = filtered.filter((q: any) => q.difficulty === difficulty);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q: any) =>
          q.question.toLowerCase().includes(query) ||
          (q.specialty && q.specialty.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [lockedQuestions, difficulty, searchQuery]);

  const { hasAccess: isPremium, isLoading: subLoading } = useExamAccess("AKT");

  const currentQuestion = filteredQuestions[currentQuestionIndex];
  const totalQuestions = filteredQuestions.length;
  // BUG FIX 2: Count only answers for questions in the current filtered set
  const answeredCount = useMemo(() => {
    const filteredIds = new Set(filteredQuestions.map((q: any) => q.id));
    return Object.keys(sessionAnswers).filter(id => filteredIds.has(Number(id))).length;
  }, [sessionAnswers, filteredQuestions]);
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  // Query bookmark status for current question (must be above early returns to maintain hook order)
  const isBookmarkedQuery = trpc.questions.isBookmarked.useQuery(
    currentQuestion?.id ?? 0,
    { enabled: !!currentQuestion?.id && isReady && isAuthenticated }
  );

  // Update local bookmarked state when query result changes
  useEffect(() => {
    if (isBookmarkedQuery.data !== undefined) {
      setBookmarked(isBookmarkedQuery.data);
    }
  }, [isBookmarkedQuery.data]);

  // BUG FIX 2: When navigating to a question, restore previous answer if it exists
  useEffect(() => {
    if (!currentQuestion) return;
    const prevAnswer = sessionAnswers[currentQuestion.id];
    if (prevAnswer) {
      setSelectedAnswer(prevAnswer.selectedAnswer);
      setShowExplanation(true);
    } else {
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
    setFlagged(false);
    setNotes("");
  }, [currentQuestion?.id]);

  if (loading || !isAuthenticated || !user || subLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setBookmarked(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setBookmarked(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setShowExplanation(true);

    // BUG FIX 2: Save answer to session state (persisted to localStorage automatically)
    setSessionAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: { selectedAnswer, isCorrect },
    }));

    // BUG FIX 2: Record the attempt to the database in real time
    // Ensure examId is always valid (default to 1 = AKT)
    recordAttempt.mutate({
      questionId: currentQuestion.id,
      examId: currentQuestion.examId || 1,
      selectedAnswer,
      isCorrect,
      timeTaken: 0,
      mode,
    }, {
      onSuccess: () => {
        // Show "Saved" indicator briefly
        setShowSavedIndicator(true);
        setTimeout(() => setShowSavedIndicator(false), 2500);
        // Show cloud icon on progress bar
        setShowCloudIcon(true);
        setTimeout(() => setShowCloudIcon(false), 2000);
      },
    });

    if (mode === "tutor") {
      toast[isCorrect ? "success" : "error"](
        isCorrect ? "Correct! Well done." : "Incorrect. Review the explanation below."
      );
    }
  };

  const handleBookmark = () => {
    if (!currentQuestion) return;

    if (bookmarked) {
      removeBookmarkMutation.mutate(currentQuestion.id, {
        onSuccess: () => {
          setBookmarked(false);
          toast.success("Bookmark removed");
        },
        onError: () => {
          toast.error("Failed to remove bookmark");
        },
      });
    } else {
      bookmarkMutation.mutate(currentQuestion.id, {
        onSuccess: () => {
          setBookmarked(true);
          toast.success("Question bookmarked");
        },
        onError: () => {
          toast.error("Failed to bookmark question");
        },
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire shortcuts when modal is open or when typing in an input/textarea
      if (showResetModal) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (!currentQuestion) return;

      const key = e.key.toUpperCase();

      // A/B/C/D/E to select answer
      if (["A", "B", "C", "D", "E"].includes(key) && !showExplanation) {
        const optionKey = `option${key}` as keyof typeof currentQuestion;
        if (currentQuestion[optionKey]) {
          setSelectedAnswer(key);
          e.preventDefault();
        }
      }

      // Enter to submit
      if (e.key === "Enter" && selectedAnswer && !showExplanation) {
        handleSubmitAnswer();
        e.preventDefault();
      }

      // Left/Right arrow to navigate
      if (e.key === "ArrowLeft") {
        handlePrevious();
        e.preventDefault();
      }
      if (e.key === "ArrowRight") {
        handleNext();
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showResetModal, currentQuestion, showExplanation, selectedAnswer, currentQuestionIndex, totalQuestions]);

  // Handle specialty change: unlock questions so a new fetch happens
  const handleSpecialtyChange = (v: string) => {
    setSpecialty(v);
    setCurrentQuestionIndex(0);
    setLockedQuestions(null); // Allow new fetch for new specialty
    setSessionAnswers({});
    clearQBankSession();
  };

  // Empty state when no questions are available
  if (!questionsQuery.isLoading && lockedQuestions !== null && totalQuestions === 0) {
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
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">No Questions Available</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            No questions match your current filters. Try adjusting your specialty or difficulty settings.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => { handleSpecialtyChange("All Specialties"); setDifficulty("All Levels"); setSearchQuery(""); }}>
              Reset Filters
            </Button>
            <Button onClick={() => navigate("/dashboard")} className="bg-green-600 hover:bg-green-700 text-gray-900">
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ReconnectingBanner />
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Auto-save indicator */}
            {lastSavedAt && (
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <CloudUpload className="w-3.5 h-3.5" />
                <span>Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            <span className="text-sm text-slate-600">
              {totalQuestions > 0 ? `${answeredCount} of ${totalQuestions} answered` : "Loading..."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAttempts}
              disabled={resetAttemptsMutation.isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {resetAttemptsMutation.isPending ? "Resetting..." : "Reset All"}
            </Button>
          </div>
        </div>
      </header>

      {/* Resume Banner */}
      {showResumeBanner && (
        <div className="bg-[#32CD32]/10 border-b border-[#32CD32]/30 transition-all duration-500 animate-in slide-in-from-top-2">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-[#32CD32]" />
              <span className="text-sm font-medium text-slate-800">
                Welcome back! Your progress ({answeredCount} of {totalQuestions} answered) has been restored.
              </span>
            </div>
            <button onClick={() => setShowResumeBanner(false)} className="text-slate-500 hover:text-slate-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <CrossSellGate hasAccess={isPremium} requiredTrack="AKT" featureName="Question Bank">
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
                        mode === "tutor" ? "bg-green-600 text-gray-900" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Tutor Mode
                    </button>
                    <button
                      onClick={() => setMode("exam")}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        mode === "exam" ? "bg-green-600 text-gray-900" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Exam Mode
                    </button>
                  </div>
                </div>

                {/* Specialty Filter */}
                <div>
                  <Label className="text-slate-700 font-medium">Specialty</Label>
                  <Select value={specialty} onValueChange={handleSpecialtyChange}>
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
            {(questionsQuery.isLoading || lockedQuestions === null) ? (
              <div className="flex items-center justify-center py-16">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : currentQuestion ? (
              <>
                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">Progress</span>
                    <div className="flex items-center gap-3">
                      {/* Saved indicator */}
                      <span
                        className={`flex items-center gap-1 text-xs font-medium text-green-600 transition-all duration-500 ${
                          showSavedIndicator ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved
                      </span>
                      <span className="text-sm text-slate-600">{answeredCount} of {totalQuestions} answered ({Math.round(progress)}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 relative">
                    <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    {/* Cloud icon on progress bar fill */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 transition-all duration-500 ${showCloudIcon ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
                      style={{ left: `calc(${Math.min(progress, 97)}% - 6px)` }}
                    >
                      <Cloud className="w-4 h-4 text-green-700 fill-green-200" />
                    </div>
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
                        {currentQuestion.difficulty && currentQuestion.difficulty !== "Easy" && (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            currentQuestion.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {currentQuestion.difficulty}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleBookmark} className={bookmarked ? "text-green-600" : "text-slate-400"}>
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
                            isSelected ? "border-green-600 bg-green-50" :
                            "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-medium text-sm ${
                              showCorrect ? "border-green-500 bg-green-500 text-white" :
                              showIncorrect ? "border-red-500 bg-red-500 text-white" :
                              isSelected ? "border-green-600 bg-green-600 text-gray-900" :
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
                    <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer} className="w-full bg-green-600 hover:bg-green-700 text-gray-900">
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
                        className="w-full mt-2 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
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
                  <Button onClick={handleNext} disabled={currentQuestionIndex === totalQuestions - 1} className="bg-green-600 hover:bg-green-700 text-gray-900 gap-2">
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Keyboard shortcuts hint */}
                <div className="mt-4 flex justify-end">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                        <Keyboard className="w-3.5 h-3.5" />
                        <span>Keyboard shortcuts</span>
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent align="end" className="w-56 p-3">
                      <div className="space-y-2 text-xs">
                        <p className="font-semibold text-slate-700 mb-2">Keyboard Shortcuts</p>
                        <div className="flex justify-between"><span className="text-slate-600">Select answer</span><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">A B C D E</span></div>
                        <div className="flex justify-between"><span className="text-slate-600">Submit answer</span><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">Enter</span></div>
                        <div className="flex justify-between"><span className="text-slate-600">Previous</span><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">&larr;</span></div>
                        <div className="flex justify-between"><span className="text-slate-600">Next</span><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">&rarr;</span></div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </>
            ) : null}
          </div>
        </div>
        </CrossSellGate>
      </main>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Reset Progress</h2>
            
            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={resetMode === "all"}
                  onChange={() => setResetMode("all")}
                  className="w-4 h-4"
                />
                <span className="text-slate-700">Reset all question attempts</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={resetMode === "specialty"}
                  onChange={() => setResetMode("specialty")}
                  className="w-4 h-4"
                />
                <span className="text-slate-700">Reset by specialty</span>
              </label>
            </div>

            {resetMode === "specialty" && (
              <div className="mb-6">
                <Label className="text-slate-700 mb-2 block">Select Specialty</Label>
                <Select value={selectedResetSpecialty} onValueChange={setSelectedResetSpecialty}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.filter(s => s !== "All Specialties").map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-6">
              <p className="text-sm text-amber-800">
                ⚠️ This action cannot be undone. Your progress for {resetMode === "all" ? "all questions" : selectedResetSpecialty} will be permanently deleted.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowResetModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReset}
                disabled={resetAttemptsMutation.isPending || resetAttemptsBySpecialtyMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {resetAttemptsMutation.isPending || resetAttemptsBySpecialtyMutation.isPending ? "Resetting..." : "Reset Progress"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
