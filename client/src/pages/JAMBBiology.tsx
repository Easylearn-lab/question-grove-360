import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import JAMBPaywall from "../components/JAMBPaywall";

export default function JAMBBiology() {
  return (
    <JAMBPaywall>
      <JAMBBiologyContent />
    </JAMBPaywall>
  );
}

function JAMBBiologyContent() {
  const [, navigate] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(40 * 60); // 40 minutes in seconds
  const [showNavigator, setShowNavigator] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: questions, isLoading } = trpc.jamb.getQuestions.useQuery({
    subject: "Biology",
  });

  // Timer countdown - only start when questions are loaded
  useEffect(() => {
    if (submitted || !questions) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [submitted, questions]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (questionId: number, answer: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
  };

  const getScore = () => {
    if (!questions) return 0;
    return questions.filter(
      (q: any) => answers[q.id] === q.correctAnswer
    ).length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No questions available yet.</p>
          <button
            onClick={() => navigate("/international/nigeria/jamb")}
            className="mt-4 text-green-600 hover:underline"
          >
            ← Back to JAMB Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const options = [
    { key: "A", text: currentQuestion.optionA },
    { key: "B", text: currentQuestion.optionB },
    { key: "C", text: currentQuestion.optionC },
    { key: "D", text: currentQuestion.optionD },
  ];

  // Results view
  if (submitted) {
    const score = getScore();
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Results Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">JAMB Biology — Results</h1>
            <button
              onClick={() => navigate("/international/nigeria/jamb")}
              className="text-sm text-green-600 hover:underline"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Score Card */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl border shadow-sm p-8 text-center mb-8">
            <div
              className={`text-6xl font-bold mb-2 ${
                percentage >= 50 ? "text-green-600" : "text-red-500"
              }`}
            >
              {percentage}%
            </div>
            <p className="text-gray-600 text-lg">
              {score} of {questions.length} correct
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {percentage >= 50 ? "Well done! Keep practising." : "Keep studying — you'll improve!"}
            </p>
          </div>

          {/* Question Review */}
          <h2 className="text-lg font-bold text-gray-900 mb-4">Review Answers</h2>
          <div className="space-y-6">
            {questions.map((q: any, idx: number) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-xl border p-6 ${
                    !userAnswer
                      ? "border-gray-200"
                      : isCorrect
                      ? "border-green-200"
                      : "border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-sm font-bold text-gray-400 mt-0.5">
                      Q{idx + 1}
                    </span>
                    <p className="text-gray-900 font-medium">{q.questionText}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8 mb-3">
                    {[
                      { key: "A", text: q.optionA },
                      { key: "B", text: q.optionB },
                      { key: "C", text: q.optionC },
                      { key: "D", text: q.optionD },
                    ].map((opt) => (
                      <div
                        key={opt.key}
                        className={`px-3 py-2 rounded-lg text-sm border ${
                          opt.key === q.correctAnswer
                            ? "bg-green-50 border-green-300 text-green-800 font-medium"
                            : opt.key === userAnswer && opt.key !== q.correctAnswer
                            ? "bg-red-50 border-red-300 text-red-800"
                            : "bg-gray-50 border-gray-200 text-gray-600"
                        }`}
                      >
                        <span className="font-bold mr-2">{opt.key}.</span>
                        {opt.text}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="ml-8 mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <span className="font-bold">Explanation:</span> {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Practice view
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/international/nigeria/jamb")}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Exit
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Q{currentIndex + 1}/{questions.length}
            </span>
            <span
              className={`text-sm font-mono font-bold px-3 py-1 rounded-full ${
                timeLeft < 300
                  ? "bg-red-100 text-red-700 animate-pulse"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {formatTime(timeLeft)}
            </span>
            <button
              onClick={() => setShowNavigator(!showNavigator)}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg"
            >
              Navigator
            </button>
          </div>
        </div>
      </div>

      {/* Question Navigator Panel */}
      {showNavigator && (
        <div className="bg-white border-b px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs text-gray-500 mb-2 font-medium">Question Navigator</p>
            <div className="flex flex-wrap gap-1.5">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 text-xs font-medium rounded-lg border transition-all ${
                    idx === currentIndex
                      ? "bg-green-500 text-white border-green-500"
                      : answers[q.id]
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {Object.keys(answers).length} of {questions.length} answered
            </p>
          </div>
        </div>
      )}

      {/* Question Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="bg-white rounded-2xl border shadow-sm p-6 sm:p-8">
          {/* Topic badge */}
          <span className="inline-block text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full mb-4">
            {currentQuestion.topic}
          </span>

          {/* Question stem */}
          <p className="text-lg text-gray-900 font-medium leading-relaxed mb-8">
            {currentQuestion.questionText}
          </p>

          {/* Options */}
          <div className="space-y-3">
            {options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleAnswer(currentQuestion.id, opt.key)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                  answers[currentQuestion.id] === opt.key
                    ? "border-green-500 bg-green-50 ring-1 ring-green-200"
                    : "border-gray-200 hover:border-green-300 hover:bg-green-50/30"
                }`}
              >
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    answers[currentQuestion.id] === opt.key
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {opt.key}
                </span>
                <span className="text-gray-800 pt-1">{opt.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          {currentIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 text-sm font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 shadow-sm"
            >
              Submit Exam
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
              }
              className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
