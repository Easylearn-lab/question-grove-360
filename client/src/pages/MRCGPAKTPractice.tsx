import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, Bookmark, Flag } from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Question {
  id: string;
  exam: string;
  domain: string;
  specialty: string;
  difficulty: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  correctAnswer: string;
  explanationCorrect: string;
  explanationA: string;
  explanationB: string;
  explanationC: string;
  explanationD: string;
  explanationE?: string;
  referenceText: string;
  tags: string[];
}

const SPECIALTIES_MAP: Record<string, string> = {
  "ethics-organisational": "Ethics & Organisational",
  "endocrinology": "Endocrinology",
  "paediatrics": "Paediatrics",
  "cardiovascular": "Cardiovascular",
  "statistics-ebm": "Statistics & EBM",
  "gastroenterology": "Gastroenterology",
  "haematology": "Haematology",
  "general-practice": "General Practice",
  "respiratory": "Respiratory",
  "pharmacology-prescribing": "Pharmacology & Prescribing",
  "ophthalmology-ent": "Ophthalmology & ENT",
  "musculoskeletal": "Musculoskeletal",
  "neurology": "Neurology",
  "dermatology": "Dermatology",
  "obstetrics-gynaecology": "Obstetrics & Gynaecology",
  "renal-urology": "Renal & Urology",
  "infectious-disease": "Infectious Disease",
};

export default function MRCGPAKTPractice() {
  const [, navigate] = useLocation();
  const { specialty: specialtySlug } = useParams<{ specialty: string }>();
  const { loading, isAuthenticated } = useProtectedRoute();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  const specialtyName = specialtySlug ? SPECIALTIES_MAP[specialtySlug] : "";

  // Load questions from tRPC
  const questionsQuery = trpc.mrcgpAkt.getQuestions.useQuery(
    { specialty: specialtyName },
    { enabled: !!specialtyName }
  );

  useEffect(() => {
    if (questionsQuery.data) {
      setQuestions(questionsQuery.data as unknown as Question[]);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setQuestionsLoading(false);
    }
  }, [questionsQuery.data]);

  useEffect(() => {
    if (questionsQuery.isLoading) {
      setQuestionsLoading(true);
    }
  }, [questionsQuery.isLoading]);

  useEffect(() => {
    if (questionsQuery.error) {
      console.error("Failed to load questions:", questionsQuery.error);
      toast.error("Failed to load questions");
      setQuestionsLoading(false);
    }
  }, [questionsQuery.error]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading || questionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-slate-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/mrcgp-akt")}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">{specialtyName}</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="p-12 text-center border-slate-200">
            <p className="text-slate-600">No questions found for this specialty.</p>
            <Button
              onClick={() => navigate("/mrcgp-akt")}
              className="mt-6 bg-green-600 hover:bg-green-700 text-gray-900"
            >
              Back to Specialties
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const options = [
    { key: "A", text: currentQuestion.optionA },
    { key: "B", text: currentQuestion.optionB },
    { key: "C", text: currentQuestion.optionC },
    { key: "D", text: currentQuestion.optionD },
    ...(currentQuestion.optionE ? [{ key: "E", text: currentQuestion.optionE }] : []),
  ];

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
  const getExplanation = (key: string) => {
    const explanations: Record<string, string> = {
      A: currentQuestion.explanationA,
      B: currentQuestion.explanationB,
      C: currentQuestion.explanationC,
      D: currentQuestion.explanationD,
      E: currentQuestion.explanationE || "",
    };
    return explanations[key] || "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/mrcgp-akt")}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{specialtyName}</h1>
              <p className="text-sm text-slate-600">
                Question {currentIndex + 1} of {questions.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFlagged(!flagged)}
              className={flagged ? "text-red-600" : "text-slate-600"}
            >
              <Flag className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBookmarked(!bookmarked)}
              className={bookmarked ? "text-yellow-600" : "text-slate-600"}
            >
              <Bookmark className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-900">Progress</span>
            <span className="text-sm text-slate-600">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className="p-8 border-slate-200 mb-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                {currentQuestion.difficulty}
              </span>
              {currentQuestion.domain && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                  {currentQuestion.domain}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {options.map((option) => {
              const isSelected = selectedAnswer === option.key;
              const isAnswered = selectedAnswer !== null;
              const isCorrectOption = option.key === currentQuestion.correctAnswer;
              const isWrongSelected = isSelected && !isCorrect;

              return (
                <button
                  key={option.key}
                  onClick={() => {
                    if (!isAnswered) {
                      setSelectedAnswer(option.key);
                    }
                  }}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? isCorrect
                        ? "border-green-500 bg-green-50"
                        : "border-red-500 bg-red-50"
                      : isAnswered && isCorrectOption
                      ? "border-green-500 bg-green-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  } ${isAnswered ? "cursor-default" : "cursor-pointer"}`}
                  disabled={isAnswered}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-semibold ${
                        isSelected
                          ? isCorrect
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-red-500 bg-red-500 text-white"
                          : isAnswered && isCorrectOption
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-slate-300 text-slate-600"
                      }`}
                    >
                      {option.key}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 font-medium">{option.text}</p>
                      {isAnswered && isCorrectOption && (
                        <p className="text-green-600 text-sm mt-1">✓ Correct answer</p>
                      )}
                      {isWrongSelected && (
                        <p className="text-red-600 text-sm mt-1">✗ Incorrect</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Show Explanation Button */}
          {selectedAnswer && (
            <Button
              onClick={() => setShowExplanation(!showExplanation)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {showExplanation ? "Hide Explanation" : "Show Explanation"}
            </Button>
          )}
        </Card>

        {/* Explanation Card */}
        {showExplanation && selectedAnswer && (
          <Card className="p-8 border-slate-200 mb-8 bg-blue-50">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {isCorrect ? "✓ Correct Explanation" : "✗ Explanation"}
            </h3>

            <div className="space-y-6">
              {/* Correct Answer Explanation */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">
                  Why {currentQuestion.correctAnswer} is correct:
                </h4>
                <p className="text-slate-700">{currentQuestion.explanationCorrect}</p>
              </div>

              {/* Your Answer Explanation */}
              {!isCorrect && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Why {selectedAnswer} is incorrect:
                  </h4>
                  <p className="text-slate-700">{getExplanation(selectedAnswer)}</p>
                </div>
              )}

              {/* Reference */}
              {currentQuestion.referenceText && (
                <div className="pt-4 border-t border-blue-200">
                  <h4 className="font-semibold text-slate-900 mb-2">Reference:</h4>
                  <p className="text-slate-700 text-sm">{currentQuestion.referenceText}</p>
                </div>
              )}

              {/* Tags */}
              {currentQuestion.tags && currentQuestion.tags.length > 0 && (
                <div className="pt-4 border-t border-blue-200">
                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.tags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
                setSelectedAnswer(null);
                setShowExplanation(false);
              }
            }}
            disabled={currentIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/mrcgp-akt")}
            className="text-slate-600 hover:text-slate-900"
          >
            Back to Specialties
          </Button>

          <Button
            onClick={() => {
              if (currentIndex < questions.length - 1) {
                setCurrentIndex(currentIndex + 1);
                setSelectedAnswer(null);
                setShowExplanation(false);
              }
            }}
            disabled={currentIndex === questions.length - 1}
            className="bg-green-600 hover:bg-green-700 text-gray-900 gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
