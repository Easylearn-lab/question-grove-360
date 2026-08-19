import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, GripVertical, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { CrossSellGate } from "@/components/CrossSellGate";
import { useExamAccess } from "@/hooks/useExamAccess";

export default function MSRAPDQuestionBank() {
  const [, navigate] = useLocation();
  const { user, loading } = useProtectedRoute();
  const { hasAccess: isPremium, isLoading: subLoading } = useExamAccess("MSRA");

  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Ranking state
  const [rankOrder, setRankOrder] = useState<string[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Pick3 state
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const topicsQuery = trpc.msra.getPdTopics.useQuery();
  const questionsQuery = trpc.msra.getPdQuestions.useQuery({
    domain: selectedTopic === "all" ? undefined : selectedTopic,
    questionType: selectedType === "all" ? undefined : selectedType as any,
    limit: 500,
    offset: 0,
  });

  const questions = questionsQuery.data || [];
  const currentQ = questions[currentIndex];

  const resetQuestion = useCallback(() => {
    setSubmitted(false);
    setSelectedOptions([]);
    if (questions[currentIndex + 1]) {
      const nextQ = questions[currentIndex + 1];
      if (nextQ.questionType === "RANKING") {
        setRankOrder(["A", "B", "C", "D", "E"]);
      }
    }
  }, [currentIndex, questions]);

  // Initialize rank order when question changes
  const initRankOrder = useCallback(() => {
    if (currentQ?.questionType === "RANKING") {
      setRankOrder(["A", "B", "C", "D", "E"]);
    }
  }, [currentQ]);

  // On topic/type change, reset
  const handleFilterChange = (topic: string, type: string) => {
    setSelectedTopic(topic);
    setSelectedType(type);
    setCurrentIndex(0);
    setSubmitted(false);
    setSelectedOptions([]);
    setRankOrder(["A", "B", "C", "D", "E"]);
    setScore({ correct: 0, total: 0 });
  };

  // Drag and drop for ranking
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

  // Move item up/down for mobile
  const moveItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= rankOrder.length) return;
    const newOrder = [...rankOrder];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    setRankOrder(newOrder);
  };

  // Pick3 toggle
  const toggleOption = (letter: string) => {
    if (submitted) return;
    if (selectedOptions.includes(letter)) {
      setSelectedOptions(selectedOptions.filter((o) => o !== letter));
    } else if (selectedOptions.length < 3) {
      setSelectedOptions([...selectedOptions, letter]);
    }
  };

  // Submit answer
  const handleSubmit = () => {
    if (!currentQ) return;
    let isCorrect = false;

    if (currentQ.questionType === "RANKING") {
      const correct = currentQ.correctRanking as string[] | null;
      if (correct) {
        isCorrect = JSON.stringify(rankOrder) === JSON.stringify(correct);
      }
    } else {
      const correct = currentQ.correctOptions as string[] | null;
      if (correct) {
        const sortedSelected = [...selectedOptions].sort();
        const sortedCorrect = [...correct].sort();
        isCorrect = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);
      }
    }

    setSubmitted(true);
    setScore((prev) => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));

    // Record attempt
    if (currentQ.id) {
      recordAttempt.mutate({
        questionId: currentQ.id,
        domain: currentQ.domain || "Unknown",
        questionType: currentQ.questionType as "RANKING" | "PICK3",
        isCorrect,
      });
    }
  };

  // Next question
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setSubmitted(false);
      setSelectedOptions([]);
      const nextQ = questions[nextIdx];
      if (nextQ?.questionType === "RANKING") {
        setRankOrder(["A", "B", "C", "D", "E"]);
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSubmitted(false);
      setSelectedOptions([]);
      const prevQ = questions[currentIndex - 1];
      if (prevQ?.questionType === "RANKING") {
        setRankOrder(["A", "B", "C", "D", "E"]);
      }
    }
  };

  const getActionText = (q: any, letter: string) => {
    if (q.questionType === "RANKING") return q[`action${letter}`];
    return q[`option${letter}`];
  };

  if (loading || subLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;
  }

  // Initialize rank order on first render of a ranking question
  if (currentQ?.questionType === "RANKING" && rankOrder.length === 0) {
    setRankOrder(["A", "B", "C", "D", "E"]);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/msra")}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">MSRA Professional Dilemmas</h1>
          <p className="text-sm text-slate-500">{questions.length} questions available</p>
        </div>
        {score.total > 0 && (
          <Badge className="ml-auto bg-green-100 text-green-800">
            {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
          </Badge>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <CrossSellGate hasAccess={isPremium} requiredTrack="MSRA" featureName="MSRA Professional Dilemmas">

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <Select value={selectedTopic} onValueChange={(v) => handleFilterChange(v, selectedType)}>
            <SelectTrigger className="w-64"><SelectValue placeholder="All Topics" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {topicsQuery.data?.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedType} onValueChange={(v) => handleFilterChange(selectedTopic, v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Formats" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="RANKING">Ranking</SelectItem>
              <SelectItem value="PICK3">Pick 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {questions.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No questions found for the selected filters.</p>
        ) : currentQ ? (
          <div>
            {/* Question header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">Question {currentIndex + 1} of {questions.length}</span>
              <Badge variant="outline" className={currentQ.questionType === "RANKING" ? "border-blue-500 text-blue-600" : "border-purple-500 text-purple-600"}>
                {currentQ.questionType === "RANKING" ? "Rank 1-5" : "Pick 3"}
              </Badge>
            </div>

            {/* Topic */}
            <Badge className="mb-3 bg-gray-100 text-gray-700">{currentQ.domain}</Badge>

            {/* Scenario */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <p className="text-slate-800 leading-relaxed">{currentQ.scenario}</p>
                <p className="text-sm text-slate-500 mt-3 font-medium">
                  {currentQ.questionType === "RANKING"
                    ? "Rank the following actions from most appropriate (1) to least appropriate (5). Drag to reorder."
                    : "Select the 3 most appropriate actions."}
                </p>
              </CardContent>
            </Card>

            {/* RANKING UI */}
            {currentQ.questionType === "RANKING" && (
              <div className="space-y-2 mb-6">
                {rankOrder.map((letter, idx) => {
                  const text = getActionText(currentQ, letter);
                  if (!text) return null;
                  const correctRanking = currentQ.correctRanking as string[] | null;
                  const correctPos = correctRanking ? correctRanking.indexOf(letter) : -1;
                  const isCorrectPos = submitted && correctPos === idx;
                  const isWrongPos = submitted && correctPos !== idx;

                  return (
                    <div
                      key={letter}
                      draggable={!submitted}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        submitted
                          ? isCorrectPos ? "border-green-400 bg-green-50" : "border-red-300 bg-red-50"
                          : draggedIdx === idx ? "border-blue-400 bg-blue-50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300 cursor-grab"
                      }`}
                    >
                      <span className="text-sm font-bold text-gray-400 w-6">{idx + 1}.</span>
                      {!submitted && <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      {submitted && (isCorrectPos ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />)}
                      <span className="font-medium text-gray-700 mr-1">{letter}.</span>
                      <span className="text-sm text-slate-700 flex-1">{text}</span>
                      {!submitted && (
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▲</button>
                          <button onClick={() => moveItem(idx, 1)} disabled={idx === rankOrder.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">▼</button>
                        </div>
                      )}
                      {submitted && correctPos !== idx && (
                        <span className="text-xs text-red-500 flex-shrink-0">→ should be #{correctPos + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* PICK3 UI */}
            {currentQ.questionType === "PICK3" && (
              <div className="space-y-2 mb-6">
                {["A", "B", "C", "D", "E"].map((letter) => {
                  const text = getActionText(currentQ, letter);
                  if (!text) return null;
                  const isSelected = selectedOptions.includes(letter);
                  const correctOpts = currentQ.correctOptions as string[] | null;
                  const isCorrectOption = correctOpts?.includes(letter);
                  const isWrongSelection = submitted && isSelected && !isCorrectOption;
                  const isMissedCorrect = submitted && !isSelected && isCorrectOption;
                  const isRightSelection = submitted && isSelected && isCorrectOption;

                  return (
                    <button
                      key={letter}
                      onClick={() => toggleOption(letter)}
                      disabled={submitted}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        submitted
                          ? isRightSelection ? "border-green-400 bg-green-50"
                            : isWrongSelection ? "border-red-300 bg-red-50"
                            : isMissedCorrect ? "border-yellow-400 bg-yellow-50"
                            : "border-gray-200 bg-white"
                          : isSelected ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        submitted
                          ? isRightSelection ? "border-green-500 bg-green-500 text-white"
                            : isWrongSelection ? "border-red-500 bg-red-500 text-white"
                            : isMissedCorrect ? "border-yellow-500 bg-yellow-100"
                            : "border-gray-300"
                          : isSelected ? "border-green-500 bg-green-500 text-white" : "border-gray-300"
                      }`}>
                        {(isSelected || (submitted && isCorrectOption)) && <span className="text-xs font-bold">✓</span>}
                      </div>
                      <span className="font-medium text-gray-700 mr-1">{letter}.</span>
                      <span className="text-sm text-slate-700 flex-1">{text}</span>
                      {submitted && isRightSelection && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                      {submitted && isWrongSelection && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      {submitted && isMissedCorrect && <span className="text-xs text-yellow-600 flex-shrink-0">Missed</span>}
                    </button>
                  );
                })}
                {!submitted && <p className="text-xs text-gray-500">{selectedOptions.length}/3 selected</p>}
              </div>
            )}

            {/* Submit / Explanation */}
            {!submitted ? (
              <Button
                onClick={handleSubmit}
                disabled={currentQ.questionType === "PICK3" && selectedOptions.length !== 3}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3"
              >
                Submit Answer
              </Button>
            ) : (
              <div className="space-y-4">
                {/* Explanation */}
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Explanation</h4>
                    <p className="text-sm text-slate-700 whitespace-pre-line">
                      {currentQ.questionType === "RANKING" ? currentQ.explanationRanking : currentQ.explanationOptions}
                    </p>
                    {currentQ.reference && <p className="text-xs text-gray-500 mt-2">Reference: {currentQ.reference}</p>}
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0} className="flex-1 gap-1">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Button>
                  <Button onClick={handleNext} disabled={currentIndex >= questions.length - 1} className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        </CrossSellGate>
      </main>
    </div>
  );
}
  const recordAttempt = trpc.msra.recordPdAttempt.useMutation();
