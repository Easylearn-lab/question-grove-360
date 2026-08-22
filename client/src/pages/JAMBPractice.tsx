import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import JAMBPaywall from "../components/JAMBPaywall";
import { trpc } from "../lib/trpc";
import { getJambSubjectBySlug } from "../../../shared/jamb";

export default function JAMBPractice() {
  const { subjectSlug } = useParams<{ subjectSlug: string }>();
  const subject = getJambSubjectBySlug(subjectSlug);

  if (!subject) {
    return <InvalidSubject />;
  }

  return (
    <JAMBPaywall>
      <JAMBPracticeContent subject={subject.name} />
    </JAMBPaywall>
  );
}

function InvalidSubject() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <p className="text-3xl mb-3">📚</p>
        <h1 className="text-xl font-bold text-slate-900">Subject not found</h1>
        <p className="text-sm text-slate-600 mt-2">Choose a subject from the JAMB dashboard to begin practising.</p>
        <button onClick={() => navigate("/international/nigeria/jamb")} className="mt-5 text-sm font-semibold text-green-700 hover:underline">
          Back to JAMB subjects
        </button>
      </div>
    </div>
  );
}

function JAMBPracticeContent({ subject }: { subject: string }) {
  const [, navigate] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(40 * 60);
  const [showNavigator, setShowNavigator] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { data: questions, isLoading } = trpc.jamb.getQuestions.useQuery({ subject });

  useEffect(() => {
    if (submitted || !questions?.length) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setSubmitted(true);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [questions, submitted]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  const handleSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" /><p className="text-slate-600">Loading {subject} questions…</p></div>
      </div>
    );
  }

  if (!questions?.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center"><p className="text-slate-600">No {subject} questions are available yet.</p><button onClick={() => navigate("/international/nigeria/jamb")} className="mt-4 text-green-700 hover:underline">Back to JAMB subjects</button></div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const score = questions.filter((question) => answers[question.id] === question.correctAnswer).length;

  if (submitted) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b sticky top-0 z-10"><div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between"><h1 className="text-xl font-bold text-slate-900">JAMB {subject} — Results</h1><button onClick={() => navigate("/international/nigeria/jamb")} className="text-sm text-green-700 hover:underline">Back to subjects</button></div></header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <section className="bg-white rounded-2xl border shadow-sm p-8 text-center mb-8"><div className={`text-6xl font-bold mb-2 ${percentage >= 50 ? "text-green-600" : "text-red-500"}`}>{percentage}%</div><p className="text-slate-600 text-lg">{score} of {questions.length} correct</p><p className="text-sm text-slate-500 mt-2">{percentage >= 50 ? "Well done. Keep practising to build confidence." : "Keep studying — targeted practice will improve your score."}</p></section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Review answers</h2>
          <div className="space-y-6">
            {questions.map((question, index) => {
              const selectedAnswer = answers[question.id];
              const isCorrect = selectedAnswer === question.correctAnswer;
              const options = [["A", question.optionA], ["B", question.optionB], ["C", question.optionC], ["D", question.optionD]] as const;
              return (
                <article key={question.id} className={`bg-white rounded-xl border p-6 ${!selectedAnswer ? "border-slate-200" : isCorrect ? "border-green-200" : "border-red-200"}`}>
                  <div className="flex items-start gap-3 mb-3"><span className="text-sm font-bold text-slate-400 mt-0.5">Q{index + 1}</span><p className="text-slate-900 font-medium">{question.questionText}</p></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8 mb-3">{options.map(([key, text]) => <div key={key} className={`px-3 py-2 rounded-lg text-sm border ${key === question.correctAnswer ? "bg-green-50 border-green-300 text-green-800 font-medium" : key === selectedAnswer ? "bg-red-50 border-red-300 text-red-800" : "bg-slate-50 border-slate-200 text-slate-600"}`}><span className="font-bold mr-2">{key}.</span>{text}</div>)}</div>
                  {question.explanation && <div className="ml-8 mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg"><p className="text-sm text-blue-800"><span className="font-bold">Explanation:</span> {question.explanation}</p></div>}
                </article>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  const options = [["A", currentQuestion.optionA], ["B", currentQuestion.optionB], ["C", currentQuestion.optionC], ["D", currentQuestion.optionD]] as const;
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10"><div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between"><button onClick={() => navigate("/international/nigeria/jamb")} className="text-sm text-slate-500 hover:text-slate-700">← Exit</button><div className="flex items-center gap-3"><span className="hidden sm:inline text-sm text-slate-600">{subject}</span><span className="text-sm text-slate-600">Q{currentIndex + 1}/{questions.length}</span><span className={`text-sm font-mono font-bold px-3 py-1 rounded-full ${timeLeft < 300 ? "bg-red-100 text-red-700 animate-pulse" : "bg-green-100 text-green-700"}`}>{formatTime(timeLeft)}</span><button onClick={() => setShowNavigator((open) => !open)} className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg">Navigator</button></div></div></header>
      {showNavigator && <div className="bg-white border-b px-4 py-4"><div className="max-w-4xl mx-auto"><p className="text-xs text-slate-500 mb-2 font-medium">Question navigator</p><div className="flex flex-wrap gap-1.5">{questions.map((question, index) => <button key={question.id} onClick={() => setCurrentIndex(index)} className={`w-8 h-8 text-xs font-medium rounded-lg border transition-all ${index === currentIndex ? "bg-green-500 text-white border-green-500" : answers[question.id] ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-slate-600 border-slate-200 hover:border-green-300"}`}>{index + 1}</button>)}</div><p className="text-xs text-slate-400 mt-2">{Object.keys(answers).length} of {questions.length} answered</p></div></div>}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full"><section className="bg-white rounded-2xl border shadow-sm p-6 sm:p-8"><span className="inline-block text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full mb-4">{currentQuestion.topic || subject}</span><p className="text-lg text-slate-900 font-medium leading-relaxed mb-8">{currentQuestion.questionText}</p><div className="space-y-3">{options.map(([key, text]) => <button key={key} onClick={() => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: key }))} className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all flex items-start gap-3 ${answers[currentQuestion.id] === key ? "border-green-500 bg-green-50 ring-1 ring-green-200" : "border-slate-200 hover:border-green-300 hover:bg-green-50/30"}`}><span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${answers[currentQuestion.id] === key ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600"}`}>{key}</span><span className="text-slate-800 pt-1">{text}</span></button>)}</div></section><div className="flex items-center justify-between mt-6"><button onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-lg hover:bg-slate-50 disabled:opacity-40">← Previous</button>{currentIndex === questions.length - 1 ? <button onClick={handleSubmit} className="px-6 py-2.5 text-sm font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 shadow-sm">Submit practice</button> : <button onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))} className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600">Next →</button>}</div></main>
    </div>
  );
}
