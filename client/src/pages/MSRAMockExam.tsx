import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Clock, GripVertical, CheckCircle2, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { CrossSellGate } from "@/components/CrossSellGate";
import { useExamAccess } from "@/hooks/useExamAccess";

type ExamState = "intro" | "active" | "results";
type CpsQuestion = { id: number; section: "CPS"; question: string; optionA: string | null; optionB: string | null; optionC: string | null; optionD: string | null; optionE: string | null; correctAnswer: string | null; explanationCorrect: string | null; specialty: string | null; topic: string | null; };
type PdQuestion = { id: number; section: "PD"; questionType: string; domain: string | null; scenario: string | null; actionA: string | null; actionB: string | null; actionC: string | null; actionD: string | null; actionE: string | null; correctRanking: string[] | null; explanationRanking: string | null; optionA: string | null; optionB: string | null; optionC: string | null; optionD: string | null; optionE: string | null; correctOptions: string[] | null; explanationOptions: string | null; };
type AnyQuestion = CpsQuestion | PdQuestion;

export default function MSRAMockExam() {
  const [, navigate] = useLocation();
  const { user, loading } = useProtectedRoute();
  const { hasAccess: isPremium, isLoading: subLoading } = useExamAccess("MSRA");

  const [examState, setExamState] = useState<ExamState>("intro");
  const [allQuestions, setAllQuestions] = useState<AnyQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState(195 * 60); // 3h15m in seconds
  const timerRef = useRef<any>(null);

  // PD ranking state
  const [rankOrder, setRankOrder] = useState<string[]>(["A", "B", "C", "D", "E"]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  // PD pick3 state
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  // CPS state
  const [selectedCps, setSelectedCps] = useState<string | null>(null);

  const generateMock = trpc.msra.generateMockExam.useMutation({
    onSuccess: (data) => {
      const combined: AnyQuestion[] = [
        ...data.cpsQuestions.map((q: any) => ({ ...q, section: "CPS" as const })),
        ...data.pdQuestions.map((q: any) => ({ ...q, section: "PD" as const })),
      ];
      setAllQuestions(combined);
      setExamState("active");
      setCurrentIdx(0);
      setAnswers({});
      setTimeLeft(data.timeLimitMinutes * 60);
      // Init first question state
      const first = combined[0];
      if (first?.section === "PD") {
        const pd = first as PdQuestion;
        if (pd.questionType === "RANKING") setRankOrder(["A", "B", "C", "D", "E"]);
        else setSelectedOptions([]);
      } else {
        setSelectedCps(null);
      }
    },
  });

  // Timer
  useEffect(() => {
    if (examState !== "active") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); handleFinish(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [examState]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const currentQ = allQuestions[currentIdx];
  const isCps = currentQ?.section === "CPS";
  const isPd = currentQ?.section === "PD";

  const saveCurrentAnswer = () => {
    if (!currentQ) return;
    const key = currentIdx;
    if (isCps && selectedCps) {
      setAnswers((prev) => ({ ...prev, [key]: { type: "CPS", answer: selectedCps } }));
    } else if (isPd) {
      const pd = currentQ as PdQuestion;
      if (pd.questionType === "RANKING") {
        setAnswers((prev) => ({ ...prev, [key]: { type: "RANKING", answer: [...rankOrder] } }));
      } else if (selectedOptions.length > 0) {
        setAnswers((prev) => ({ ...prev, [key]: { type: "PICK3", answer: [...selectedOptions] } }));
      }
    }
  };

  const goToQuestion = (idx: number) => {
    saveCurrentAnswer();
    setCurrentIdx(idx);
    const q = allQuestions[idx];
    // Restore saved answer or reset
    const saved = answers[idx];
    if (q.section === "CPS") {
      setSelectedCps(saved?.answer || null);
    } else {
      const pd = q as PdQuestion;
      if (pd.questionType === "RANKING") {
        setRankOrder(saved?.answer || ["A", "B", "C", "D", "E"]);
      } else {
        setSelectedOptions(saved?.answer || []);
      }
    }
  };

  const handleFinish = () => {
    saveCurrentAnswer();
    clearInterval(timerRef.current);
    setExamState("results");
  };

  // Calculate results
  const getResults = () => {
    let cpsCorrect = 0, cpsTotal = 0, pdCorrect = 0, pdTotal = 0;
    const finalAnswers = { ...answers };
    // Save current if not saved
    if (currentQ) {
      if (isCps && selectedCps) finalAnswers[currentIdx] = { type: "CPS", answer: selectedCps };
      else if (isPd) {
        const pd = currentQ as PdQuestion;
        if (pd.questionType === "RANKING") finalAnswers[currentIdx] = { type: "RANKING", answer: [...rankOrder] };
        else if (selectedOptions.length > 0) finalAnswers[currentIdx] = { type: "PICK3", answer: [...selectedOptions] };
      }
    }

    allQuestions.forEach((q, idx) => {
      const ans = finalAnswers[idx];
      if (q.section === "CPS") {
        cpsTotal++;
        const cps = q as CpsQuestion;
        if (ans?.answer === cps.correctAnswer) cpsCorrect++;
      } else {
        pdTotal++;
        const pd = q as PdQuestion;
        if (pd.questionType === "RANKING") {
          if (ans?.answer && pd.correctRanking && JSON.stringify(ans.answer) === JSON.stringify(pd.correctRanking)) pdCorrect++;
        } else {
          if (ans?.answer && pd.correctOptions) {
            const sorted1 = [...ans.answer].sort();
            const sorted2 = [...pd.correctOptions].sort();
            if (JSON.stringify(sorted1) === JSON.stringify(sorted2)) pdCorrect++;
          }
        }
      }
    });
    return { cpsCorrect, cpsTotal, pdCorrect, pdTotal, totalCorrect: cpsCorrect + pdCorrect, totalQuestions: cpsTotal + pdTotal };
  };

  // Drag handlers for PD ranking
  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const newOrder = [...rankOrder];
    const [removed] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(idx, 0, removed);
    setRankOrder(newOrder);
    setDraggedIdx(idx);
  };
  const handleDragEnd = () => setDraggedIdx(null);
  const moveItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= rankOrder.length) return;
    const newOrder = [...rankOrder];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[newIdx]];
    newOrder[newIdx] = rankOrder[idx];
    newOrder[idx] = rankOrder[newIdx];
    setRankOrder(newOrder);
  };
  const toggleOption = (letter: string) => {
    if (selectedOptions.includes(letter)) setSelectedOptions(selectedOptions.filter((o) => o !== letter));
    else if (selectedOptions.length < 3) setSelectedOptions([...selectedOptions, letter]);
  };

  if (loading || subLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;
  }

  // ─── INTRO ────────────────────────────────────────────────────────────────
  if (examState === "intro") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/msra")}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="text-xl font-bold text-slate-900">MSRA Full Mock Exam</h1>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-12">
          <CrossSellGate hasAccess={isPremium} requiredTrack="MSRA" featureName="MSRA Mock Exam">
          <Card className="text-center">
            <CardContent className="py-12">
              <Clock className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Full Length MSRA Mock</h2>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                This mock replicates the real MSRA exam: 97 Clinical Problem Solving (CPS) questions followed by 75 Professional Dilemmas (PD) questions. Total time: 3 hours 15 minutes.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">172</p>
                  <p className="text-xs text-gray-500">Questions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">3h 15m</p>
                  <p className="text-xs text-gray-500">Time Limit</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">2</p>
                  <p className="text-xs text-gray-500">Sections</p>
                </div>
              </div>
              <Button onClick={() => generateMock.mutate()} disabled={generateMock.isPending} className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3">
                {generateMock.isPending ? "Generating exam..." : "Start Mock Exam"}
              </Button>
            </CardContent>
          </Card>
          </CrossSellGate>
        </main>
      </div>
    );
  }

  // ─── RESULTS ──────────────────────────────────────────────────────────────
  if (examState === "results") {
    const r = getResults();
    const cpsPercent = r.cpsTotal > 0 ? Math.round((r.cpsCorrect / r.cpsTotal) * 100) : 0;
    const pdPercent = r.pdTotal > 0 ? Math.round((r.pdCorrect / r.pdTotal) * 100) : 0;
    const totalPercent = r.totalQuestions > 0 ? Math.round((r.totalCorrect / r.totalQuestions) * 100) : 0;

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/msra")}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="text-xl font-bold text-slate-900">MSRA Mock Exam Results</h1>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* Overall Score */}
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-5xl font-bold text-green-600 mb-2">{totalPercent}%</p>
              <p className="text-slate-600">{r.totalCorrect} / {r.totalQuestions} correct</p>
            </CardContent>
          </Card>

          {/* Section Breakdown */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Clinical Problem Solving</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600 mb-1">{cpsPercent}%</p>
                <p className="text-sm text-gray-500">{r.cpsCorrect} / {r.cpsTotal} correct</p>
                <Progress value={cpsPercent} className="mt-3 h-3" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Professional Dilemmas</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600 mb-1">{pdPercent}%</p>
                <p className="text-sm text-gray-500">{r.pdCorrect} / {r.pdTotal} correct</p>
                <Progress value={pdPercent} className="mt-3 h-3" />
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => { setExamState("intro"); setAllQuestions([]); }} variant="outline" className="flex-1">Try Again</Button>
            <Button onClick={() => navigate("/msra")} className="flex-1 bg-green-600 hover:bg-green-700 text-white">Back to MSRA</Button>
          </div>
        </main>
      </div>
    );
  }

  // ─── ACTIVE EXAM ──────────────────────────────────────────────────────────
  const cpsCount = allQuestions.filter((q) => q.section === "CPS").length;
  const sectionLabel = currentIdx < cpsCount ? "CPS" : "PD";
  const sectionNum = currentIdx < cpsCount ? currentIdx + 1 : currentIdx - cpsCount + 1;
  const sectionTotal = currentIdx < cpsCount ? cpsCount : allQuestions.length - cpsCount;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Badge className={sectionLabel === "CPS" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
            {sectionLabel} — Q{sectionNum}/{sectionTotal}
          </Badge>
          <span className="text-sm text-gray-500">({currentIdx + 1}/{allQuestions.length} overall)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono font-bold ${timeLeft < 600 ? "text-red-600 animate-pulse" : "text-slate-700"}`}>
            <Clock className="w-4 h-4 inline mr-1" />{formatTime(timeLeft)}
          </span>
          <Button variant="outline" size="sm" onClick={handleFinish} className="text-red-600 border-red-300">Finish Exam</Button>
        </div>
      </header>

      {/* Progress */}
      <Progress value={(currentIdx + 1) / allQuestions.length * 100} className="h-1 rounded-none" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* CPS Question */}
        {isCps && (
          <div>
            <Card className="mb-6">
              <CardContent className="p-6">
                <p className="text-slate-800 leading-relaxed">{(currentQ as CpsQuestion).question}</p>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {["A", "B", "C", "D", "E"].map((letter) => {
                const text = (currentQ as any)[`option${letter}`];
                if (!text) return null;
                return (
                  <button key={letter} onClick={() => setSelectedCps(letter)} className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${selectedCps === letter ? "border-green-500 bg-green-50 ring-2 ring-green-200" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <span className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm flex-shrink-0 ${selectedCps === letter ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-gray-500'}">{letter}</span>
                    <span className="text-sm text-slate-700">{text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PD RANKING Question */}
        {isPd && (currentQ as PdQuestion).questionType === "RANKING" && (
          <div>
            <Card className="mb-6">
              <CardContent className="p-6">
                <p className="text-slate-800 leading-relaxed">{(currentQ as PdQuestion).scenario}</p>
                <p className="text-sm text-slate-500 mt-3 font-medium">Rank from most appropriate (1) to least appropriate (5).</p>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {rankOrder.map((letter, idx) => {
                const text = (currentQ as any)[`action${letter}`];
                if (!text) return null;
                return (
                  <div key={letter} draggable onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-grab ${draggedIdx === idx ? "border-blue-400 bg-blue-50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <span className="text-sm font-bold text-gray-400 w-6">{idx + 1}.</span>
                    <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-700 mr-1">{letter}.</span>
                    <span className="text-sm text-slate-700 flex-1">{text}</span>
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▲</button>
                      <button onClick={() => moveItem(idx, 1)} disabled={idx === rankOrder.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▼</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PD PICK3 Question */}
        {isPd && (currentQ as PdQuestion).questionType === "PICK3" && (
          <div>
            <Card className="mb-6">
              <CardContent className="p-6">
                <p className="text-slate-800 leading-relaxed">{(currentQ as PdQuestion).scenario}</p>
                <p className="text-sm text-slate-500 mt-3 font-medium">Select the 3 most appropriate actions.</p>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {["A", "B", "C", "D", "E"].map((letter) => {
                const text = (currentQ as any)[`option${letter}`];
                if (!text) return null;
                const isSelected = selectedOptions.includes(letter);
                return (
                  <button key={letter} onClick={() => toggleOption(letter)} className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${isSelected ? "border-green-500 bg-green-50 ring-2 ring-green-200" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-green-500 bg-green-500 text-white" : "border-gray-300"}`}>
                      {isSelected && <span className="text-xs font-bold">✓</span>}
                    </div>
                    <span className="font-medium text-gray-700 mr-1">{letter}.</span>
                    <span className="text-sm text-slate-700 flex-1">{text}</span>
                  </button>
                );
              })}
              <p className="text-xs text-gray-500">{selectedOptions.length}/3 selected</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => goToQuestion(currentIdx - 1)} disabled={currentIdx === 0} className="flex-1">← Previous</Button>
          {currentIdx < allQuestions.length - 1 ? (
            <Button onClick={() => goToQuestion(currentIdx + 1)} className="flex-1 bg-green-600 hover:bg-green-700 text-white">Next →</Button>
          ) : (
            <Button onClick={handleFinish} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Finish Exam</Button>
          )}
        </div>

        {/* Question navigator */}
        <div className="mt-6 flex flex-wrap gap-1">
          {allQuestions.map((q, idx) => (
            <button key={idx} onClick={() => goToQuestion(idx)} className={`w-8 h-8 text-xs rounded font-medium transition-all ${idx === currentIdx ? "bg-green-600 text-white" : answers[idx] ? "bg-green-100 text-green-800 border border-green-300" : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"}`}>
              {idx + 1}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
