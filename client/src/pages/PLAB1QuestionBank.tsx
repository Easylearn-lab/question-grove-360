import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bookmark, Flag, ChevronRight, ChevronLeft, BookOpen, X, Timer, ImageIcon } from "lucide-react";
import { ZoomableImage } from "@/components/ZoomableImage";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CrossSellGate } from "@/components/CrossSellGate";
import { useExamAccess } from "@/hooks/useExamAccess";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useStudySession } from "@/contexts/StudySessionContext";
// StudySessionContext uses startStudySession/endStudySession
import { useShuffledOptions, getOrCreateSessionSeed, clearSessionSeed, mapDisplayToOriginal } from "@/hooks/useShuffledOptions";
import { useLocation, useSearch } from "wouter";

const PLAB1_SPECIALTIES = [
  "All Specialties",
  "Medicine",
  "Surgery",
  "Obstetrics and Gynaecology",
  "Paediatrics",
  "Psychiatry",
  "General Practice and Public Health",
  "Clinical Pharmacology and Therapeutics",
  "Ethics and Law",
];

const DIFFICULTIES = ["All Levels", "Easy", "Medium", "Hard"];

// localStorage keys for PLAB1 session persistence
const PLAB1_SESSION_KEY = "qg360_plab1_session";
const PLAB1_QUESTIONS_KEY = "qg360_plab1_questions";

interface Plab1Session {
  questionIds: number[];
  specialty: string;
  topic?: string | null;
  difficulty: string;
  currentIndex: number;
  answers: Record<number, { selectedAnswer: string; isCorrect: boolean }>;
  savedAt: number;
}

function savePlab1Session(session: Plab1Session) {
  try {
    localStorage.setItem(PLAB1_SESSION_KEY, JSON.stringify(session));
  } catch {}
}

function loadPlab1Session(): Plab1Session | null {
  try {
    const raw = localStorage.getItem(PLAB1_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Plab1Session;
    // Expire after 4 hours
    if (Date.now() - session.savedAt > 4 * 60 * 60 * 1000) {
      clearPlab1Session();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function clearPlab1Session() {
  localStorage.removeItem(PLAB1_SESSION_KEY);
  localStorage.removeItem(PLAB1_QUESTIONS_KEY);
}

export default function PLAB1QuestionBank() {
  useProtectedRoute();
  const { user } = useAuth();
  const { hasAccess, isLoading: accessLoading } = useExamAccess("PLAB1");
  const { startStudySession, endStudySession } = useStudySession();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);

  // URL params for deep-linking
  const urlSpecialty = searchParams.get("specialty");
  const urlTopic = searchParams.get("topic");

  // State
  const [specialty, setSpecialty] = useState<string>(urlSpecialty || "All Specialties");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(urlTopic || null);
  const [difficulty, setDifficulty] = useState("All Levels");
  const [lockedQuestions, setLockedQuestions] = useState<any[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState<Record<number, { selectedAnswer: string; isCorrect: boolean }>>({});
  const [showResetModal, setShowResetModal] = useState(false);


  const sessionStartedRef = useRef(false);

  // Queries
  const specialtiesQuery = trpc.plab1.getSpecialties.useQuery();
  const topicsQuery = trpc.plab1.getTopicsBySpecialty.useQuery(specialty, {
    enabled: specialty !== "All Specialties",
  });
  const questionsQuery = trpc.plab1.getQuestions.useQuery(
    {
      specialty: specialty === "All Specialties" ? undefined : specialty,
      topic: selectedTopic || undefined,
      limit: 500,
    },
    { enabled: lockedQuestions === null }
  );

  const recordAttemptMutation = trpc.plab1.recordAttempt.useMutation();

  // Lock questions once fetched
  useEffect(() => {
    if (questionsQuery.data && lockedQuestions === null) {
      let filtered = questionsQuery.data;
      if (difficulty !== "All Levels") {
        filtered = filtered.filter((q: any) => q.difficulty === difficulty);
      }
      setLockedQuestions(filtered);

      // Try to restore session
      const saved = loadPlab1Session();
      if (saved && saved.specialty === specialty && saved.topic === selectedTopic) {
        setCurrentQuestionIndex(saved.currentIndex);
        setSessionAnswers(saved.answers);
      }
    }
  }, [questionsQuery.data, lockedQuestions, difficulty, specialty, selectedTopic]);

  // Study session tracking
  useEffect(() => {
    if (lockedQuestions && lockedQuestions.length > 0 && !sessionStartedRef.current) {
      startStudySession("plab1_questions");
      sessionStartedRef.current = true;
    }
    return () => {
      if (sessionStartedRef.current) {
        endStudySession();
        sessionStartedRef.current = false;
      }
    };
  }, [lockedQuestions]);

  // Save session on changes
  useEffect(() => {
    if (lockedQuestions && lockedQuestions.length > 0) {
      savePlab1Session({
        questionIds: lockedQuestions.map((q: any) => q.id),
        specialty,
        topic: selectedTopic,
        difficulty,
        currentIndex: currentQuestionIndex,
        answers: sessionAnswers,
        savedAt: Date.now(),
      });
    }
  }, [currentQuestionIndex, sessionAnswers, lockedQuestions, specialty, selectedTopic, difficulty]);

  // Derived
  const totalQuestions = lockedQuestions?.length || 0;
  const currentQuestion = lockedQuestions?.[currentQuestionIndex];
  const availableTopics = useMemo(() => {
    if (topicsQuery.data) return topicsQuery.data;
    return [];
  }, [topicsQuery.data]);

  // Shuffled options
  const sessionSeed = useMemo(() => getOrCreateSessionSeed(), []);
  const { options: shuffledOptions, correctDisplayLabel } = useShuffledOptions(currentQuestion, sessionSeed);

  // Handlers
  const handleSpecialtyChange = (v: string) => {
    setSpecialty(v);
    setSelectedTopic(null);
    setCurrentQuestionIndex(0);
    setLockedQuestions(null);
    setSessionAnswers({});
    clearPlab1Session();
    clearSessionSeed();
  };

  const handleTopicChange = (topic: string | null) => {
    setSelectedTopic(topic);
    setCurrentQuestionIndex(0);
    setLockedQuestions(null);
    setSessionAnswers({});
    clearPlab1Session();
  };

  const handleAnswerSelect = (displayLabel: string) => {
    if (showExplanation) return;
    setSelectedAnswer(displayLabel);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;
    const originalLabel = mapDisplayToOriginal(selectedAnswer, shuffledOptions) || "";
    const isCorrect = originalLabel === currentQuestion.correctAnswer;
    setShowExplanation(true);
    setSessionAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: { selectedAnswer: originalLabel, isCorrect },
    }));
    recordAttemptMutation.mutate({
      questionId: currentQuestion.id,
      selectedAnswer: originalLabel,
      isCorrect,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handleReset = () => {
    setLockedQuestions(null);
    setCurrentQuestionIndex(0);
    setSessionAnswers({});
    setSelectedAnswer(null);
    setShowExplanation(false);
    clearPlab1Session();
    clearSessionSeed();
    setShowResetModal(false);
    toast.success("Session reset. New questions loaded.");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResetModal) return;
      if (e.key === "1" || e.key === "a") handleAnswerSelect("A");
      if (e.key === "2" || e.key === "b") handleAnswerSelect("B");
      if (e.key === "3" || e.key === "c") handleAnswerSelect("C");
      if (e.key === "4" || e.key === "d") handleAnswerSelect("D");
      if (e.key === "5" || e.key === "e") handleAnswerSelect("E");
      if (e.key === "Enter" && selectedAnswer && !showExplanation) handleSubmitAnswer();
      if (e.key === "Enter" && showExplanation) handleNext();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showResetModal, currentQuestion, showExplanation, selectedAnswer, currentQuestionIndex, totalQuestions, shuffledOptions]);

  // Loading state
  if (accessLoading || questionsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading PLAB 1 questions...</p>
        </div>
      </div>
    );
  }

  // Access gate
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
          <CrossSellGate requiredTrack="PLAB1" featureName="PLAB 1 Question Bank" hasAccess={hasAccess}>
            <div />
          </CrossSellGate>
        </div>
      </div>
    );
  }

  // Empty state
  if (lockedQuestions !== null && totalQuestions === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/plab1")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">PLAB 1 Question Bank</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">No Questions Available</h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            No questions match your current filters. Questions are being added — check back soon.
          </p>
          <Button variant="outline" onClick={() => { handleSpecialtyChange("All Specialties"); setDifficulty("All Levels"); }}>
            Reset Filters
          </Button>
        </main>
      </div>
    );
  }

  // Get explanation for the correct answer
  const getExplanation = () => {
    if (!currentQuestion) return "";
    return currentQuestion.explanationCorrect || "No explanation available.";
  };

  const getOptionExplanation = (originalLabel: string) => {
    if (!currentQuestion) return "";
    const key = `explanation${originalLabel}` as keyof typeof currentQuestion;
    return currentQuestion[key] || "";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/plab1")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-slate-900 hidden sm:block">PLAB 1 Question Bank</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">
              {currentQuestionIndex + 1} / {totalQuestions}
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowResetModal(true)}>
              Reset
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-6">
        {/* Sidebar Filters */}
        <aside className="hidden lg:block w-64 shrink-0">
          <Card className="p-4 sticky top-20">
            <h3 className="font-semibold text-slate-900 mb-3">Filters</h3>

            {/* Specialty */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Specialty</label>
              <Select value={specialty} onValueChange={handleSpecialtyChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAB1_SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Topic chips */}
            {specialty !== "All Specialties" && availableTopics.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 mb-2 block">Topic</label>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  <button
                    onClick={() => handleTopicChange(null)}
                    className={`px-2 py-1 rounded-full text-xs transition-colors ${
                      !selectedTopic
                        ? "bg-green-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    All Topics
                  </button>
                  {availableTopics.map((t: any) => (
                    <button
                      key={t.topic}
                      onClick={() => handleTopicChange(t.topic)}
                      className={`px-2 py-1 rounded-full text-xs transition-colors ${
                        selectedTopic === t.topic
                          ? "bg-green-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {t.topic} ({t.count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Difficulty */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Difficulty</label>
              <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setLockedQuestions(null); }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specialty stats */}
            {specialtiesQuery.data && specialtiesQuery.data.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-medium text-slate-500 mb-2">Question Count</h4>
                <div className="space-y-1">
                  {specialtiesQuery.data.map((s: any) => (
                    <div key={s.specialty} className="flex justify-between text-xs">
                      <span className="text-slate-600 truncate">{s.specialty}</span>
                      <span className="text-slate-400 ml-2">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {currentQuestion && (
            <Card className="p-6 mb-4">
              {/* Question metadata */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {currentQuestion.specialty}
                </span>
                {currentQuestion.topic && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                    {currentQuestion.topic}
                  </span>
                )}
                {currentQuestion.difficulty && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    currentQuestion.difficulty === "Hard" ? "bg-red-100 text-red-700" :
                    currentQuestion.difficulty === "Medium" ? "bg-amber-100 text-amber-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {currentQuestion.difficulty}
                  </span>
                )}
              </div>

              {/* Question image (ECG, X-ray, etc.) */}
              {currentQuestion.imageUrl && (
                <div className="mb-4">
                  <ZoomableImage
                    src={currentQuestion.imageUrl}
                    alt={currentQuestion.imageCaption || "Clinical image"}
                    caption={currentQuestion.imageCaption}
                    imageType={currentQuestion.imageType}
                  />
                </div>
              )}

              {/* Question stem */}
              <div className="text-slate-900 mb-6 leading-relaxed whitespace-pre-wrap">
                {currentQuestion.question}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {shuffledOptions.map((opt: any) => {
                  const isSelected = selectedAnswer === opt.displayLabel;
                  const originalLabel = mapDisplayToOriginal(opt.displayLabel, shuffledOptions) || "";
                  const isCorrect = originalLabel === currentQuestion.correctAnswer;
                  const wasAnswered = sessionAnswers[currentQuestion.id];

                  let optionStyle = "border-slate-200 hover:border-green-300 hover:bg-green-50/30";
                  if (showExplanation || wasAnswered) {
                    if (isCorrect) {
                      optionStyle = "border-green-500 bg-green-50";
                    } else if (isSelected || (wasAnswered && wasAnswered.selectedAnswer === originalLabel)) {
                      optionStyle = "border-red-500 bg-red-50";
                    } else {
                      optionStyle = "border-slate-200 opacity-60";
                    }
                  } else if (isSelected) {
                    optionStyle = "border-green-500 bg-green-50/50";
                  }

                  return (
                    <button
                      key={opt.displayLabel}
                      onClick={() => handleAnswerSelect(opt.displayLabel)}
                      disabled={showExplanation || !!wasAnswered}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${optionStyle}`}
                    >
                      <span className="font-semibold text-slate-700 mr-3">{opt.displayLabel}.</span>
                      <span className="text-slate-800">{opt.text}</span>
                      {(showExplanation || wasAnswered) && originalLabel && getOptionExplanation(originalLabel) && (
                        <p className="mt-2 text-xs text-slate-500 pl-6">
                          {getOptionExplanation(originalLabel)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Submit / Explanation */}
              {!showExplanation && !sessionAnswers[currentQuestion.id] && (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer}
                  className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Submit Answer
                </Button>
              )}

              {(showExplanation || sessionAnswers[currentQuestion.id]) && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-2">Explanation</h4>
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {getExplanation()}
                  </p>
                  {currentQuestion.reference && (
                    <p className="text-xs text-slate-400 mt-3">Reference: {currentQuestion.reference}</p>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-slate-500">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentQuestionIndex >= totalQuestions - 1}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Reset Session?</h3>
            <p className="text-slate-600 text-sm mb-4">
              This will clear your current progress and load new questions with spaced repetition weighting.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowResetModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleReset} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                Reset
              </Button>
            </div>
          </Card>
        </div>
      )}


    </div>
  );
}
