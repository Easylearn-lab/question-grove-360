import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ExamTimer from "@/components/ExamTimer";
import ExamResults from "@/components/ExamResults";
import { ChevronLeft, ChevronRight, Flag, Bookmark } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface ExamState {
  currentQuestionIndex: number;
  answers: Record<number, number>;
  flagged: Set<number>;
  bookmarked: Set<number>;
  timeSpent: number;
  isSubmitted: boolean;
  score: number;
  results: any;
}

export default function ActiveMockExam() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/mock-exam/:id");
  const examId = params?.id;

  const [examState, setExamState] = useState<ExamState>({
    currentQuestionIndex: 0,
    answers: {},
    flagged: new Set(),
    bookmarked: new Set(),
    timeSpent: 0,
    isSubmitted: false,
    score: 0,
    results: null,
  });

  // Mock questions data
  const questions: Question[] = [
    {
      id: 1,
      text: "A 45-year-old man presents with chest pain and dyspnea. What is the most likely diagnosis?",
      options: ["Myocardial infarction", "Pneumonia", "Anxiety disorder", "Gastroesophageal reflux"],
      correctAnswer: 0,
      explanation: "Based on the clinical presentation of chest pain and dyspnea in a 45-year-old, MI is most likely.",
    },
    {
      id: 2,
      text: "Which of the following is the most common cause of community-acquired pneumonia?",
      options: ["Staphylococcus aureus", "Streptococcus pneumoniae", "Haemophilus influenzae", "Legionella"],
      correctAnswer: 1,
      explanation: "Streptococcus pneumoniae is the most common cause of CAP.",
    },
    {
      id: 3,
      text: "A patient with type 2 diabetes has an HbA1c of 8.5%. What is the recommended next step?",
      options: ["Increase metformin dose", "Add insulin", "Continue current therapy", "Switch to GLP-1 agonist"],
      correctAnswer: 0,
      explanation: "HbA1c above 7% indicates need for therapy intensification.",
    },
  ];

  const totalTime = 180 * 60; // 3 hours in seconds
  const currentQuestion = questions[examState.currentQuestionIndex];
  const selectedAnswer = examState.answers[currentQuestion.id];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleAnswerSelect = (optionIndex: number) => {
    setExamState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [currentQuestion.id]: optionIndex,
      },
    }));
  };

  const handleToggleFlag = () => {
    setExamState((prev) => {
      const newFlagged = new Set(prev.flagged);
      if (newFlagged.has(currentQuestion.id)) {
        newFlagged.delete(currentQuestion.id);
      } else {
        newFlagged.add(currentQuestion.id);
      }
      return { ...prev, flagged: newFlagged };
    });
  };

  const handleToggleBookmark = () => {
    setExamState((prev) => {
      const newBookmarked = new Set(prev.bookmarked);
      if (newBookmarked.has(currentQuestion.id)) {
        newBookmarked.delete(currentQuestion.id);
      } else {
        newBookmarked.add(currentQuestion.id);
      }
      return { ...prev, bookmarked: newBookmarked };
    });
  };

  const handleNext = () => {
    if (examState.currentQuestionIndex < questions.length - 1) {
      setExamState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      }));
    }
  };

  const handlePrevious = () => {
    if (examState.currentQuestionIndex > 0) {
      setExamState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
      }));
    }
  };

  const handleTimeExpired = () => {
    handleSubmitExam();
  };

  const handleSubmitExam = () => {
    // Calculate score
    let score = 0;
    questions.forEach((q) => {
      if (examState.answers[q.id] === q.correctAnswer) {
        score++;
      }
    });

    const results = {
      score,
      totalQuestions: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      specialty: "General Practice",
      duration: totalTime,
      specialtyBreakdown: [
        { specialty: "Cardiology", correct: 2, total: 3 },
        { specialty: "Respiratory", correct: 1, total: 2 },
        { specialty: "Endocrinology", correct: 1, total: 2 },
      ],
      previousAttempts: [
        { date: "2026-05-20", score: 75 },
        { date: "2026-05-15", score: 72 },
      ],
      platformAverage: 70,
    };

    setExamState((prev) => ({
      ...prev,
      isSubmitted: true,
      score,
      results,
    }));

    toast.success("Exam submitted successfully!");
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  if (examState.isSubmitted && examState.results) {
    return (
      <ExamResults
        score={examState.results.score}
        totalQuestions={examState.results.totalQuestions}
        specialty={examState.results.specialty}
        duration={examState.results.duration}
        specialtyBreakdown={examState.results.specialtyBreakdown}
        previousAttempts={examState.results.previousAttempts}
        platformAverage={examState.results.platformAverage}
        onDownloadPDF={() => toast.success("PDF download started")}
        onEmailReport={() => toast.success("Report sent to email")}
        onBack={() => navigate("/mocks")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header with Timer */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">MRCGP AKT - Full Mock</h1>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Are you sure you want to exit? Your progress will be saved.")) {
                  navigate("/mocks");
                }
              }}
            >
              Exit Exam
            </Button>
          </div>
          <ExamTimer totalSeconds={totalTime} onTimeExpired={handleTimeExpired} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <Card className="p-8 border-slate-200">
              {/* Question Header */}
              <div className="mb-6 pb-6 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-teal-600">
                    Question {examState.currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant={examState.flagged.has(currentQuestion.id) ? "default" : "outline"}
                      size="sm"
                      onClick={handleToggleFlag}
                      className="gap-2"
                    >
                      <Flag className="w-4 h-4" />
                      Flag
                    </Button>
                    <Button
                      variant={examState.bookmarked.has(currentQuestion.id) ? "default" : "outline"}
                      size="sm"
                      onClick={handleToggleBookmark}
                      className="gap-2"
                    >
                      <Bookmark className="w-4 h-4" />
                      Bookmark
                    </Button>
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <h2 className="text-xl font-bold text-slate-900 mb-6">{currentQuestion.text}</h2>

              {/* Options */}
              <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(idx)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedAnswer === idx
                        ? "border-teal-600 bg-teal-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedAnswer === idx
                            ? "border-teal-600 bg-teal-600"
                            : "border-slate-300"
                        }`}
                      >
                        {selectedAnswer === idx && <span className="text-white text-sm font-bold">✓</span>}
                      </div>
                      <span className="font-medium text-slate-900">{option}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-4">
                <Button
                  onClick={handlePrevious}
                  disabled={examState.currentQuestionIndex === 0}
                  variant="outline"
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={examState.currentQuestionIndex === questions.length - 1}
                  className="bg-teal-600 hover:bg-teal-700 text-white gap-2 flex-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar - Question Navigator */}
          <div>
            <Card className="p-4 border-slate-200 sticky top-32">
              <h3 className="font-bold text-slate-900 mb-4">Questions</h3>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setExamState((prev) => ({ ...prev, currentQuestionIndex: idx }))}
                    className={`w-8 h-8 rounded text-xs font-semibold transition-all ${
                      idx === examState.currentQuestionIndex
                        ? "bg-teal-600 text-white"
                        : examState.answers[q.id] !== undefined
                        ? "bg-green-100 text-green-700"
                        : examState.flagged.has(q.id)
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmitExam}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white mt-6"
              >
                Submit Exam
              </Button>

              {/* Stats */}
              <div className="mt-6 pt-6 border-t border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Answered:</span>
                  <span className="font-bold text-slate-900">{Object.keys(examState.answers).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Flagged:</span>
                  <span className="font-bold text-slate-900">{examState.flagged.size}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
