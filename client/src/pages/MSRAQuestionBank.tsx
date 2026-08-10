import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, Bookmark, Flag } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function MSRAQuestionBank() {
  const [, navigate] = useLocation();
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Fetch specialties
  const { data: specialties, isLoading: loadingSpecialties } = trpc.msra.getSpecialties.useQuery();

  // Fetch topics for selected specialty
  const { data: topics } = trpc.msra.getTopicsBySpecialty.useQuery(
    { specialty: selectedSpecialty || "" },
    { enabled: !!selectedSpecialty }
  );

  // Fetch questions for selected specialty/topic
  const { data: questions, isLoading: loadingQuestions } = trpc.msra.getQuestions.useQuery(
    {
      specialty: selectedSpecialty || undefined,
      topic: selectedTopic || undefined,
      limit: 100,
      offset: 0,
    },
    { enabled: !!selectedSpecialty }
  );

  const currentQuestion = questions?.[currentQuestionIndex];

  const handleSelectSpecialty = (specialty: string) => {
    setSelectedSpecialty(specialty);
    setSelectedTopic(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const handleSubmitAnswer = (option: string) => {
    setSelectedAnswer(option);
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (questions && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  if (!selectedSpecialty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-slate-600">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">MSRA Question Bank</h1>
              <p className="text-sm text-slate-500">Clinical Problem Solving</p>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Select a Specialty</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {loadingSpecialties ? (
              <p className="text-slate-500">Loading specialties...</p>
            ) : specialties && specialties.length > 0 ? (
              specialties.map((specialty) => (
                <Button
                  key={specialty}
                  onClick={() => handleSelectSpecialty(specialty)}
                  className="h-auto py-4 px-6 text-left justify-start bg-white border border-slate-200 hover:border-green-400 hover:bg-green-50 text-slate-900"
                >
                  <div>
                    <div className="font-semibold">{specialty}</div>
                  </div>
                </Button>
              ))
            ) : (
              <p className="text-slate-500">No specialties available</p>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSpecialty(null)}
              className="text-slate-600"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{selectedSpecialty}</h1>
              {selectedTopic && <p className="text-sm text-slate-500">{selectedTopic}</p>}
            </div>
          </div>
          <div className="text-sm text-slate-600">
            {currentQuestionIndex + 1} / {questions?.length || 0}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Topic Filter */}
        {topics && topics.length > 0 && (
          <Card className="p-4 mb-6">
            <p className="text-sm font-semibold text-slate-700 mb-3">Filter by Topic:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTopic === null ? "default" : "outline"}
                size="sm"
                onClick={() => handleSelectTopic("")}
                className="text-xs"
              >
                All Topics
              </Button>
              {topics.map((topic) => (
                <Button
                  key={topic}
                  variant={selectedTopic === topic ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectTopic(topic)}
                  className="text-xs"
                >
                  {topic}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* Question Card */}
        {loadingQuestions ? (
          <Card className="p-8 text-center">
            <p className="text-slate-600">Loading questions...</p>
          </Card>
        ) : currentQuestion ? (
          <Card className="p-8 mb-6">
            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-2">
                Question {currentQuestionIndex + 1} of {questions?.length}
              </p>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">{currentQuestion.question}</h2>

              {/* Options */}
              <div className="space-y-3">
                {["A", "B", "C", "D", "E"].map((letter) => {
                  const optionKey = `option${letter}` as keyof typeof currentQuestion;
                  const optionText = currentQuestion[optionKey] as string;
                  const isSelected = selectedAnswer === letter;
                  const isCorrect = letter === currentQuestion.correctAnswer;
                  const showCorrect = showExplanation && isCorrect;
                  const showWrong = showExplanation && isSelected && !isCorrect;

                  return (
                    <Button
                      key={letter}
                      onClick={() => !showExplanation && handleSubmitAnswer(letter)}
                      disabled={showExplanation}
                      className={`w-full h-auto justify-start text-left p-4 font-medium ${
                        showCorrect
                          ? "bg-green-100 border-green-500 text-green-900"
                          : showWrong
                          ? "bg-red-100 border-red-500 text-red-900"
                          : isSelected
                          ? "bg-blue-100 border-blue-500 text-blue-900"
                          : "bg-white border border-slate-200 hover:border-green-400 text-slate-900"
                      }`}
                    >
                      <span className="font-bold mr-3">{letter}.</span>
                      <span className="flex-1">{optionText}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Explanation */}
            {showExplanation && currentQuestion.explanationCorrect && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-2">Explanation:</p>
                <p className="text-sm text-blue-800">{currentQuestion.explanationCorrect}</p>
                {currentQuestion.reference && (
                  <p className="text-xs text-blue-700 mt-2">Reference: {currentQuestion.reference}</p>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-slate-600">
                  <Bookmark className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-600">
                  <Flag className="w-4 h-4" />
                </Button>
              </div>

              <Button
                onClick={handleNext}
                disabled={!questions || currentQuestionIndex >= questions.length - 1}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-slate-600">No questions available</p>
          </Card>
        )}
      </main>
    </div>
  );
}
