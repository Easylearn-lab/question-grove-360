import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type GameState = "joining" | "lobby" | "playing" | "answered" | "revealed" | "ended";

export default function LiveQuizPlay() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const codeFromUrl = params.get("code") || "";

  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>("joining");
  const [code, setCode] = useState(codeFromUrl);
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [teamName, setTeamName] = useState("");
  const [participantId, setParticipantId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<{ points: number; isCorrect: boolean } | null>(null);
  const [revealedData, setRevealedData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime, setStartTime] = useState(0);
  const timerRef = useRef<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const session = trpc.liveQuiz.getSession.useQuery(
    { sessionCode: code.toUpperCase() },
    { enabled: !!sessionId || (gameState === "lobby" && !!code) }
  );
  const currentQuestion = trpc.liveQuiz.getCurrentQuestion.useQuery(
    { sessionId: sessionId!, includeAnswer: false },
    { enabled: !!sessionId && (gameState === "playing" || gameState === "answered") }
  );
  const leaderboard = trpc.liveQuiz.getLeaderboard.useQuery(sessionId!, {
    enabled: !!sessionId && gameState === "ended",
  });

  const joinSession = trpc.liveQuiz.joinSession.useMutation({
    onSuccess: (data) => {
      setParticipantId(data.participantId);
      setSessionId(data.sessionId);
      setGameState("lobby");
    },
  });
  const submitAnswer = trpc.liveQuiz.submitAnswer.useMutation({
    onSuccess: (data) => {
      if (!data.alreadyAnswered) {
        setAnswerResult({ points: data.points!, isCorrect: data.isCorrect! });
      }
      setGameState("answered");
    },
  });

  // SSE connection for real-time events
  useEffect(() => {
    if (!code || gameState === "joining") return;
    const es = new EventSource(`/api/live-quiz/events/${code.toUpperCase()}`);
    eventSourceRef.current = es;

    es.addEventListener("session_started", (e) => {
      const data = JSON.parse(e.data);
      setCurrentQIndex(data.currentQuestionIndex);
      setGameState("playing");
      setSelectedAnswer(null);
      setAnswerResult(null);
      setRevealedData(null);
      setStartTime(Date.now());
    });

    es.addEventListener("next_question", (e) => {
      const data = JSON.parse(e.data);
      setCurrentQIndex(data.currentQuestionIndex);
      setGameState("playing");
      setSelectedAnswer(null);
      setAnswerResult(null);
      setRevealedData(null);
      setStartTime(Date.now());
    });

    es.addEventListener("answer_revealed", (e) => {
      const data = JSON.parse(e.data);
      setRevealedData(data);
      setGameState("revealed");
    });

    es.addEventListener("session_ended", () => {
      setGameState("ended");
    });

    return () => { es.close(); };
  }, [code, gameState === "joining"]);

  // Timer countdown
  useEffect(() => {
    if (gameState !== "playing") { clearInterval(timerRef.current); return; }
    const limit = currentQuestion.data?.timeLimitSeconds || 30;
    setTimeLeft(limit);
    setStartTime(Date.now());
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, limit - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timerRef.current);
    }, 200);
    return () => clearInterval(timerRef.current);
  }, [gameState, currentQIndex, currentQuestion.data?.timeLimitSeconds]);

  // Refetch question when index changes
  useEffect(() => {
    if (sessionId && gameState === "playing") currentQuestion.refetch();
  }, [currentQIndex]);

  const handleJoin = () => {
    if (!code || !displayName.trim()) return;
    joinSession.mutate({ sessionCode: code.toUpperCase(), displayName: displayName.trim(), teamName: teamName.trim() || undefined });
  };

  const handleAnswer = (letter: string) => {
    if (selectedAnswer || !participantId || !sessionId) return;
    setSelectedAnswer(letter);
    const responseTimeMs = Date.now() - startTime;
    submitAnswer.mutate({ sessionId, participantId, selectedAnswer: letter, responseTimeMs });
  };

  // ─── JOINING STATE ───────────────────────────────────────────────────────
  if (gameState === "joining") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800/80 border-gray-700 w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-2xl">Join Live Quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm">Session Code</label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="ABC123" className="text-2xl text-center tracking-[0.3em] font-mono bg-gray-700 border-gray-600 text-white uppercase" maxLength={6} />
            </div>
            <div>
              <label className="text-gray-400 text-sm">Your Display Name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="bg-gray-700 border-gray-600 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-sm">Team Name (optional)</label>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Team Alpha" className="bg-gray-700 border-gray-600 text-white" />
            </div>
            <Button onClick={handleJoin} disabled={code.length !== 6 || !displayName.trim() || joinSession.isPending} className="w-full bg-[#32CD32] hover:bg-[#28a428] text-black font-bold text-lg py-6">
              {joinSession.isPending ? "Joining..." : "Join Game"}
            </Button>
            {joinSession.error && <p className="text-red-400 text-sm text-center">{joinSession.error.message}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── LOBBY STATE ─────────────────────────────────────────────────────────
  if (gameState === "lobby") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800/80 border-gray-700 w-full max-w-md text-center">
          <CardContent className="py-12">
            <div className="animate-pulse mb-6">
              <div className="w-16 h-16 bg-[#32CD32]/20 rounded-full mx-auto flex items-center justify-center">
                <span className="text-3xl">⏳</span>
              </div>
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">You're in!</h2>
            <p className="text-gray-400 mb-4">Waiting for the host to start the quiz...</p>
            <p className="text-[#32CD32] font-semibold">{session.data?.title}</p>
            <p className="text-gray-500 text-sm mt-2">{session.data?.participants?.length || 0} players waiting</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── PLAYING STATE ───────────────────────────────────────────────────────
  if (gameState === "playing" && currentQuestion.data) {
    const q = currentQuestion.data;
    const timerPercent = (timeLeft / (q.timeLimitSeconds || 30)) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 flex flex-col">
        {/* Timer bar */}
        <div className="w-full h-2 bg-gray-700 rounded-full mb-4 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-200 ${timerPercent > 30 ? "bg-[#32CD32]" : timerPercent > 10 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${timerPercent}%` }} />
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-400 text-sm">Q{(q.questionIndex || 0) + 1}/{q.totalQuestions}</span>
          <span className={`font-mono font-bold text-xl ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-white"}`}>{timeLeft}s</span>
        </div>

        {/* Question */}
        <Card className="bg-gray-800/50 border-gray-700 mb-4 flex-shrink-0">
          <CardContent className="p-4">
            <p className="text-white text-base leading-relaxed">{q.stem}</p>
          </CardContent>
        </Card>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3 flex-1">
          {["A", "B", "C", "D", "E"].map((letter) => {
            const optionText = (q as any)?.[`option${letter}`];
            if (!optionText) return null;
            const colors = { A: "bg-red-600 hover:bg-red-700", B: "bg-blue-600 hover:bg-blue-700", C: "bg-yellow-600 hover:bg-yellow-700", D: "bg-green-600 hover:bg-green-700", E: "bg-purple-600 hover:bg-purple-700" };
            return (
              <button key={letter} onClick={() => handleAnswer(letter)} disabled={!!selectedAnswer} className={`w-full p-4 rounded-xl text-white font-semibold text-left transition-all ${selectedAnswer === letter ? "ring-4 ring-white scale-[0.98]" : ""} ${selectedAnswer && selectedAnswer !== letter ? "opacity-40" : ""} ${(colors as any)[letter]}`}>
                <span className="font-bold mr-2">{letter}.</span> {optionText}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── ANSWERED STATE (waiting for reveal) ─────────────────────────────────
  if (gameState === "answered") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800/80 border-gray-700 w-full max-w-md text-center">
          <CardContent className="py-12">
            {answerResult?.isCorrect ? (
              <>
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-[#32CD32] text-2xl font-bold mb-2">Correct!</h2>
                <p className="text-white text-xl font-mono">+{answerResult.points} pts</p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-red-400 text-2xl font-bold mb-2">Incorrect</h2>
                <p className="text-gray-400">Waiting for the answer reveal...</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── REVEALED STATE ──────────────────────────────────────────────────────
  if (gameState === "revealed" && revealedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800/80 border-gray-700 w-full max-w-md">
          <CardContent className="py-8">
            <div className="text-center mb-4">
              <p className="text-gray-400 text-sm">Correct Answer</p>
              <p className="text-[#32CD32] text-3xl font-bold">{revealedData.correctAnswer}</p>
            </div>
            {revealedData.explanation && (
              <div className="p-3 bg-gray-700/50 rounded-lg">
                <p className="text-gray-300 text-sm">{revealedData.explanation}</p>
              </div>
            )}
            <p className="text-gray-500 text-center text-sm mt-4">Waiting for next question...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── ENDED STATE ─────────────────────────────────────────────────────────
  if (gameState === "ended") {
    const myRank = leaderboard.data?.individuals?.findIndex((p: any) => p.id === participantId);
    const myScore = leaderboard.data?.individuals?.find((p: any) => p.id === participantId);

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800/80 border-gray-700 w-full max-w-md">
          <CardContent className="py-8 text-center">
            <h2 className="text-white text-2xl font-bold mb-4">Game Over!</h2>
            {myRank !== undefined && myRank >= 0 && (
              <div className="mb-6">
                <p className="text-gray-400">Your Rank</p>
                <p className="text-[#32CD32] text-5xl font-bold">#{myRank + 1}</p>
                <p className="text-white text-xl mt-2">{myScore?.totalScore?.toLocaleString()} points</p>
              </div>
            )}
            <div className="space-y-2 text-left max-h-64 overflow-y-auto">
              {leaderboard.data?.individuals?.slice(0, 10).map((p: any, i: number) => (
                <div key={p.id} className={`flex justify-between items-center py-2 px-3 rounded ${p.id === participantId ? "bg-[#32CD32]/10 border border-[#32CD32]/30" : ""}`}>
                  <span className="text-white text-sm"><span className="font-bold text-[#32CD32]">#{i + 1}</span> {p.displayName}</span>
                  <span className="text-gray-400 text-sm font-mono">{p.totalScore?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <p>Loading...</p>
    </div>
  );
}
