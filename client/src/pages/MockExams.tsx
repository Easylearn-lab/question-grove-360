import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Play, FileText, Timer, BarChart3, Flag } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { useSubscription } from "@/hooks/useSubscription";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

const MOCK_EXAMS = [
  { id: 1, name: "MRCGP AKT - Full Mock 1", exam: "MRCGP AKT", questions: 160, duration: 155, passMark: 72, examId: 1 },
  { id: 2, name: "MRCGP AKT - Full Mock 2", exam: "MRCGP AKT", questions: 160, duration: 155, passMark: 72, examId: 1 },
  { id: 3, name: "PLAB 1 - Full Mock 1", exam: "PLAB 1", questions: 160, duration: 155, passMark: 75, examId: 3 },
  { id: 4, name: "USMLE Step 1 - Full Mock 1", exam: "USMLE Step 1", questions: 160, duration: 155, passMark: 70, examId: 5 },
];

type MockState = "list" | "active" | "results";

interface MockAnswer {
  questionId: number;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  flagged?: boolean;
}

export default function MockExams() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const [, navigate] = useLocation();
  const [mockState, setMockState] = useState<MockState>("list");
  const [activeMock, setActiveMock] = useState<typeof MOCK_EXAMS[0] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<MockAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [mockScore, setMockScore] = useState({ score: 0, total: 0, percentage: 0, passed: false });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const questionsQuery = trpc.questions.getQuestions.useQuery(
    { limit: 50, offset: 0 },
    { enabled: isReady && isAuthenticated && mockState === "active" }
  );

  const recordAttempt = trpc.mockExams.recordAttempt.useMutation();

  // Timer logic
  useEffect(() => {
    if (mockState === "active" && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleFinishMock();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mockState]);

  const handleStartMock = (mock: typeof MOCK_EXAMS[0]) => {
    setActiveMock(mock);
    setMockState("active");
    setTimeRemaining(mock.duration * 60);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !questionsQuery.data) return;
    const question = questionsQuery.data[currentQuestionIndex];
    if (!question) return;

    const isCorrect = selectedAnswer === question.correctAnswer;

    const newAnswer: MockAnswer = {
      questionId: question.id,
      selectedAnswer,
      isCorrect,
    };

    setAnswers((prev) => {
      const existing = prev.findIndex((a) => a.questionId === question.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newAnswer;
        return updated;
      }
      return [...prev, newAnswer];
    });

    // Record attempt in background
    recordAttempt.mutate({
      questionId: question.id,
      examId: activeMock?.examId || 1,
      selectedAnswer,
      isCorrect,
      timeTaken: 0,
      mode: "exam",
    });

    // Move to next question
    if (questionsQuery.data && currentQuestionIndex < questionsQuery.data.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    }
  };

  const handleFinishMock = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const totalAnswered = answers.length;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const percentage = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    const passed = percentage >= (activeMock?.passMark || 70);

    setMockScore({ score: correctAnswers, total: totalAnswered, percentage, passed });
    setMockState("results");
    toast.success("Mock exam completed!");
  }, [answers, activeMock]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const { isPremium, isLoading: subLoading } = useSubscription();

  if (loading || !isAuthenticated || !user || subLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Results screen
  if (mockState === "results") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setMockState("list")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">Mock Exam Results</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${mockScore.passed ? "bg-green-100" : "bg-red-100"}`}>
              {mockScore.passed ? (
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              ) : (
                <AlertCircle className="w-12 h-12 text-red-600" />
              )}
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {mockScore.passed ? "Congratulations!" : "Keep Practising"}
            </h2>
            <p className="text-slate-600 mb-8">
              {mockScore.passed
                ? `You passed with ${mockScore.percentage}%!`
                : `You scored ${mockScore.percentage}%. The pass mark is ${activeMock?.passMark}%.`}
            </p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Score</p>
                <p className="text-2xl font-bold text-slate-900">{mockScore.score}/{mockScore.total}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Percentage</p>
                <p className={`text-2xl font-bold ${mockScore.passed ? "text-green-600" : "text-red-600"}`}>{mockScore.percentage}%</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Pass Mark</p>
                <p className="text-2xl font-bold text-slate-900">{activeMock?.passMark}%</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setMockState("list")}>Back to Mocks</Button>
              <Button onClick={() => navigate("/dashboard")} className="bg-teal-600 hover:bg-teal-700 text-white">Dashboard</Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Active mock exam
  if (mockState === "active" && activeMock) {
    const questions = questionsQuery.data || [];
    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = Math.min(questions.length, activeMock.questions);
    const answeredCount = answers.length;

    if (questionsQuery.isLoading) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            <p className="mt-4 text-slate-600">Loading exam questions...</p>
          </div>
        </div>
      );
    }

    if (questions.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50">
          <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setMockState("list")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-2xl font-bold text-slate-900">{activeMock.name}</h1>
            </div>
          </header>
          <main className="max-w-3xl mx-auto px-4 py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-teal-100 rounded-full flex items-center justify-center">
              <FileText className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">No Questions Available</h2>
            <p className="text-slate-600 mb-6">Questions haven't been added to this exam yet. Check back soon.</p>
            <Button onClick={() => setMockState("list")} className="bg-teal-600 hover:bg-teal-700 text-white">Back to Mocks</Button>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Timer Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-slate-900">{activeMock.name}</h1>
              <span className="text-sm text-slate-600">Q{currentQuestionIndex + 1}/{totalQuestions}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold ${timeRemaining < 300 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                <Timer className="w-4 h-4" />
                {formatTime(timeRemaining)}
              </div>
              <Button onClick={handleFinishMock} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                Finish Exam
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Question Palette */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <Card className="p-4 sticky top-20">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Question Palette</h3>
                <div className="grid grid-cols-5 gap-1.5">
                  {questions.slice(0, totalQuestions).map((_, idx) => {
                    const isAnswered = answers.some((a) => a.questionId === questions[idx]?.id);
                    const isCurrent = idx === currentQuestionIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => { setCurrentQuestionIndex(idx); setSelectedAnswer(null); }}
                        className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                          isCurrent ? "bg-teal-600 text-white ring-2 ring-teal-300" :
                          isAnswered ? "bg-teal-100 text-teal-700" :
                          "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-600">Answered: {answeredCount}/{totalQuestions}</p>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                    <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Question Area */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              {currentQuestion && (
                <Card className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    {currentQuestion.specialty && (
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">{currentQuestion.specialty}</span>
                    )}
                    {currentQuestion.difficulty && currentQuestion.difficulty !== "Easy" && (
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        currentQuestion.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>{currentQuestion.difficulty}</span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 mb-8">{currentQuestion.question}</h2>

                  <div className="space-y-3 mb-8">
                    {["A", "B", "C", "D", "E"].map((option) => {
                      const optionKey = `option${option}` as keyof typeof currentQuestion;
                      const optionText = currentQuestion[optionKey] as string | null;
                      if (!optionText) return null;

                      const isSelected = selectedAnswer === option;

                      return (
                        <button
                          key={option}
                          onClick={() => setSelectedAnswer(option)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            isSelected ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-medium text-sm ${
                              isSelected ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300"
                            }`}>{option}</div>
                            <span className="text-slate-900">{optionText}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => { if (currentQuestionIndex > 0) { setCurrentQuestionIndex(currentQuestionIndex - 1); setSelectedAnswer(null); } }}
                        disabled={currentQuestionIndex === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant={flaggedQuestions.has(currentQuestion.id) ? "default" : "outline"}
                        onClick={() => {
                          const newFlagged = new Set(flaggedQuestions);
                          if (newFlagged.has(currentQuestion.id)) {
                            newFlagged.delete(currentQuestion.id);
                          } else {
                            newFlagged.add(currentQuestion.id);
                          }
                          setFlaggedQuestions(newFlagged);
                        }}
                        className={flaggedQuestions.has(currentQuestion.id) ? "bg-amber-600 hover:bg-amber-700" : ""}
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        {flaggedQuestions.has(currentQuestion.id) ? "Flagged" : "Flag"}
                      </Button>
                    </div>
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!selectedAnswer}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {currentQuestionIndex === totalQuestions - 1 ? "Submit & Finish" : "Next"}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Mock Exam List
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Mock Exams</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <SubscriptionGate isPremium={isPremium} featureName="Mock Exams">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Available Mocks", value: MOCK_EXAMS.length.toString(), icon: FileText },
            { label: "Questions Ready", value: questionsQuery.data?.length?.toString() || "0", icon: BarChart3 },
            { label: "Pass Mark Range", value: "70-75%", icon: CheckCircle2 },
            { label: "Avg Duration", value: "3 hrs", icon: Clock },
          ].map((stat, idx) => (
            <Card key={idx} className="p-6 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <stat.icon className="w-10 h-10 text-teal-600 opacity-20" />
              </div>
            </Card>
          ))}
        </div>

        {/* Mocks List */}
        <div className="space-y-4">
          {MOCK_EXAMS.map((mock) => (
            <Card key={mock.id} className="p-6 border-slate-200 hover:shadow-lg transition-all">
              <div className="grid md:grid-cols-5 gap-4 items-center">
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{mock.name}</h3>
                  <p className="text-sm text-slate-600">{mock.exam}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-1">Questions</p>
                  <p className="font-bold text-slate-900">{mock.questions}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-1">Duration</p>
                  <p className="font-bold text-slate-900">{mock.duration} min</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-1">Pass Mark</p>
                  <p className="font-bold text-slate-900">{mock.passMark}%</p>
                </div>
                <div className="text-right">
                  <Button
                    onClick={() => handleStartMock(mock)}
                    className="bg-teal-600 hover:bg-teal-700 text-white w-full gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Start Exam
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        </SubscriptionGate>
      </main>
    </div>
  );
}
