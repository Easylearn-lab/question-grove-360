import { useState, useCallback, useRef, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Volume2, Check, X, Trophy, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";

type GameState = "setup" | "playing" | "summary";

export default function SpellingBee() {
  const [, navigate] = useLocation();
  const [category, setCategory] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [gameState, setGameState] = useState<GameState>("setup");
  const [words, setWords] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [results, setResults] = useState<Array<{ word: string; userAnswer: string; correct: boolean }>>([]);
  const [showResult, setShowResult] = useState<"correct" | "wrong" | null>(null);
  const [wordRevealed, setWordRevealed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = trpc.topics.getSpellingCategories.useQuery();
  const fetchWords = trpc.topics.getSpellingWords.useQuery(
    { category: category || undefined, difficulty: difficulty || undefined, limit: 20 },
    { enabled: false }
  );

  const speak = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.lang = "en-GB";
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const startGame = async () => {
    const result = await fetchWords.refetch();
    if (result.data && result.data.length > 0) {
      setWords(result.data);
      setCurrentIdx(0);
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setResults([]);
      setGameState("playing");
      setUserInput("");
      setShowResult(null);
      setWordRevealed(false);
      // Brief flash of the word then hide
      setTimeout(() => {
        setWordRevealed(false);
        speak(result.data[0].audioPronunciationText || result.data[0].word);
      }, 100);
    }
  };

  const currentWord = words[currentIdx];

  const submitAnswer = () => {
    if (!currentWord || showResult) return;
    const isCorrect = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
    const newStreak = isCorrect ? streak + 1 : 0;
    const points = isCorrect ? 10 + (streak >= 3 ? streak * 2 : 0) : 0;

    setShowResult(isCorrect ? "correct" : "wrong");
    setScore(s => s + points);
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    setResults(r => [...r, { word: currentWord.word, userAnswer: userInput.trim(), correct: isCorrect }]);

    setTimeout(() => {
      if (currentIdx + 1 < words.length) {
        setCurrentIdx(i => i + 1);
        setUserInput("");
        setShowResult(null);
        setWordRevealed(false);
        speak(words[currentIdx + 1]?.audioPronunciationText || words[currentIdx + 1]?.word);
        inputRef.current?.focus();
      } else {
        setGameState("summary");
      }
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submitAnswer();
  };

  useEffect(() => {
    if (gameState === "playing" && inputRef.current) inputRef.current.focus();
  }, [gameState, currentIdx]);

  return (
    <div className="min-h-screen bg-amber-50/30">
      <SEOHead
        title="Spelling Bee"
        description="Practice spelling with audio pronunciation, difficulty levels, and streak scoring. Improve your vocabulary across General, Science, Geography, and commonly misspelled words."
        path="/topics/spelling-bee"
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/topics")} className="mb-6 text-gray-600">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Topics Library
        </Button>

        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">🐝</span>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Spelling Bee</h1>
          <p className="text-gray-600">Listen to the word, then spell it correctly</p>
        </div>

        {/* Setup */}
        {gameState === "setup" && (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setCategory("")} className={`px-3 py-1.5 rounded-lg text-sm ${!category ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}>All</button>
                  {categories?.map(c => (
                    <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-lg text-sm ${category === c ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Difficulty</label>
                <div className="flex gap-2">
                  {["", "easy", "medium", "hard"].map(d => (
                    <button key={d} onClick={() => setDifficulty(d)} className={`px-3 py-1.5 rounded-lg text-sm capitalize ${difficulty === d ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}>{d || "All"}</button>
                  ))}
                </div>
              </div>
              <Button onClick={startGame} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-lg py-6">Start Spelling Bee</Button>
            </CardContent>
          </Card>
        )}

        {/* Playing */}
        {gameState === "playing" && currentWord && (
          <div className="max-w-md mx-auto space-y-6">
            {/* Score bar */}
            <div className="flex justify-between items-center bg-white rounded-xl p-4 shadow-sm">
              <div><span className="text-sm text-gray-500">Score</span><p className="text-2xl font-bold text-amber-600">{score}</p></div>
              <div className="text-center"><span className="text-sm text-gray-500">Word</span><p className="text-lg font-bold">{currentIdx + 1}/{words.length}</p></div>
              <div className="text-right"><span className="text-sm text-gray-500">Streak</span><p className="text-2xl font-bold text-green-600">{streak} 🔥</p></div>
            </div>

            {/* Word card */}
            <Card className={`transition-all ${showResult === "correct" ? "border-green-400 bg-green-50" : showResult === "wrong" ? "border-red-400 bg-red-50" : ""}`}>
              <CardContent className="p-8 text-center">
                <Badge className="mb-4" variant="outline">{currentWord.category} — {currentWord.difficultyLevel}</Badge>

                <button onClick={() => speak(currentWord.audioPronunciationText || currentWord.word)} className="w-20 h-20 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center mx-auto mb-4 transition-colors">
                  <Volume2 className="w-10 h-10 text-amber-700" />
                </button>
                <p className="text-sm text-gray-500 mb-2">Click to hear the word again</p>

                {currentWord.hint && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2 mb-4">Hint: {currentWord.hint}</p>}

                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!!showResult}
                  placeholder="Type the spelling..."
                  className="w-full text-center text-2xl font-mono border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-amber-400 focus:outline-none disabled:bg-gray-50"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />

                {showResult === "correct" && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-green-700">
                    <Check className="w-6 h-6" /> <span className="text-lg font-bold">Correct! +{10 + (streak >= 3 ? (streak - 1) * 2 : 0)} points</span>
                  </div>
                )}
                {showResult === "wrong" && (
                  <div className="mt-4">
                    <div className="flex items-center justify-center gap-2 text-red-700 mb-2">
                      <X className="w-6 h-6" /> <span className="text-lg font-bold">Incorrect</span>
                    </div>
                    <p className="text-gray-700">Correct spelling: <strong className="text-lg">{currentWord.word}</strong></p>
                  </div>
                )}

                {!showResult && (
                  <Button onClick={submitAnswer} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-8" disabled={!userInput.trim()}>Check Spelling</Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary */}
        {gameState === "summary" && (
          <div className="max-w-md mx-auto space-y-6">
            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50">
              <CardContent className="p-8 text-center">
                <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
                <p className="text-4xl font-bold text-amber-600 mb-4">{score} points</p>
                <div className="flex justify-center gap-6 text-sm text-gray-600">
                  <div><p className="font-bold text-lg text-green-600">{results.filter(r => r.correct).length}</p>Correct</div>
                  <div><p className="font-bold text-lg text-red-600">{results.filter(r => !r.correct).length}</p>Wrong</div>
                  <div><p className="font-bold text-lg text-amber-600">{bestStreak}</p>Best Streak</div>
                </div>
              </CardContent>
            </Card>

            {results.filter(r => !r.correct).length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Words to Review</h3>
                  <div className="space-y-2">
                    {results.filter(r => !r.correct).map((r, i) => (
                      <div key={i} className="flex justify-between items-center bg-red-50 rounded-lg px-4 py-2">
                        <div>
                          <span className="text-red-600 line-through text-sm">{r.userAnswer}</span>
                          <span className="mx-2">→</span>
                          <span className="font-bold text-gray-900">{r.word}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button onClick={() => { setGameState("setup"); setResults([]); }} variant="outline" className="flex-1"><RotateCcw className="w-4 h-4 mr-2" /> New Game</Button>
              <Button onClick={() => navigate("/topics")} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">Back to Topics</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
