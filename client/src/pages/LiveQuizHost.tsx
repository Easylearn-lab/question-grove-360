import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function LiveQuizHost() {
  const params = useParams<{ id: string }>();
  const sessionId = parseInt(params.id || "0");
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [revealData, setRevealData] = useState<any>(null);
  const [responseCount, setResponseCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const session = trpc.liveQuiz.getSession.useQuery({ sessionId }, { refetchInterval: 5000 });
  const currentQuestion = trpc.liveQuiz.getCurrentQuestion.useQuery(
    { sessionId, includeAnswer: true },
    { enabled: session.data?.status === "active", refetchInterval: false }
  );
  const leaderboard = trpc.liveQuiz.getLeaderboard.useQuery(sessionId, { refetchInterval: 5000 });
  const qrCode = trpc.liveQuiz.getQRCode.useQuery(
    { sessionCode: session.data?.sessionCode || "", baseUrl: window.location.origin },
    { enabled: !!session.data?.sessionCode }
  );
  const analytics = trpc.liveQuiz.getSessionAnalytics.useQuery(sessionId, {
    enabled: session.data?.status === "ended",
  });

  const startSession = trpc.liveQuiz.startSession.useMutation({
    onSuccess: () => { session.refetch(); currentQuestion.refetch(); setAnswerRevealed(false); setResponseCount(0); },
  });
  const nextQuestion = trpc.liveQuiz.nextQuestion.useMutation({
    onSuccess: () => { session.refetch(); currentQuestion.refetch(); setAnswerRevealed(false); setRevealData(null); setResponseCount(0); },
  });
  const revealAnswer = trpc.liveQuiz.revealAnswer.useMutation({
    onSuccess: (data) => { setAnswerRevealed(true); setRevealData(data); },
  });

  // SSE connection
  useEffect(() => {
    if (!session.data?.sessionCode) return;
    const es = new EventSource(`/api/live-quiz/events/${session.data.sessionCode}`);
    eventSourceRef.current = es;
    es.addEventListener("response_count", (e) => {
      const data = JSON.parse(e.data);
      setResponseCount(data.count);
    });
    es.addEventListener("participant_joined", () => { session.refetch(); });
    return () => { es.close(); };
  }, [session.data?.sessionCode]);

  const s = session.data;
  if (!s) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

  const participantCount = s.participants?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{s.title}</h1>
            <p className="text-gray-400">Session Code: <span className="text-[#32CD32] font-mono text-xl tracking-wider">{s.sessionCode}</span></p>
          </div>
          <Badge className={s.status === "waiting" ? "bg-yellow-500" : s.status === "active" ? "bg-[#32CD32]" : "bg-gray-500"}>
            {s.status === "waiting" ? "Waiting for players" : s.status === "active" ? "Live" : "Ended"}
          </Badge>
        </div>

        {/* WAITING STATE */}
        {s.status === "waiting" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* QR Code */}
            <Card className="bg-gray-800/50 border-gray-700 text-center">
              <CardHeader><CardTitle className="text-white">Scan to Join</CardTitle></CardHeader>
              <CardContent>
                {qrCode.data?.qrDataUrl && <img src={qrCode.data.qrDataUrl} alt="QR Code" className="mx-auto w-64 h-64 rounded-lg" />}
                <p className="text-gray-400 mt-3 text-sm">or go to <span className="text-[#32CD32]">{window.location.origin}/live/join</span></p>
                <p className="text-3xl font-mono font-bold text-[#32CD32] mt-2 tracking-[0.4em]">{s.sessionCode}</p>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader><CardTitle className="text-white">{participantCount} Players Joined</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {s.participants?.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center py-2 px-3 bg-gray-700/50 rounded">
                      <span className="text-white">{p.displayName}</span>
                      {p.teamName && <Badge variant="outline" className="border-blue-400 text-blue-400 text-xs">{p.teamName}</Badge>}
                    </div>
                  ))}
                </div>
                <Button onClick={() => startSession.mutate(sessionId)} disabled={participantCount < 1 || startSession.isPending} className="w-full mt-4 bg-[#32CD32] hover:bg-[#28a428] text-black font-bold text-lg py-6">
                  {startSession.isPending ? "Starting..." : `Start Quiz (${participantCount} players)`}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ACTIVE STATE */}
        {s.status === "active" && currentQuestion.data && (
          <div className="space-y-6">
            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">Q{(currentQuestion.data.questionIndex || 0) + 1}/{currentQuestion.data.totalQuestions}</span>
              <Progress value={((currentQuestion.data.questionIndex || 0) + 1) / (currentQuestion.data.totalQuestions || 1) * 100} className="flex-1 h-2" />
              <span className="text-gray-400 text-sm">{responseCount} answers</span>
            </div>

            {/* Question */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <p className="text-white text-lg leading-relaxed mb-6">{currentQuestion.data.stem}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {["A", "B", "C", "D", "E"].map((letter) => {
                    const optionText = (currentQuestion.data as any)?.[`option${letter}`];
                    if (!optionText) return null;
                    const isCorrect = answerRevealed && currentQuestion.data?.correctAnswer === letter;
                    const distItem = revealData?.distribution?.find((d: any) => d.selectedAnswer === letter);
                    const distCount = distItem ? parseInt(distItem.cnt) : 0;
                    const maxCount = revealData?.distribution?.reduce((max: number, d: any) => Math.max(max, parseInt(d.cnt) || 0), 0) || 1;

                    return (
                      <div key={letter} className={`p-3 rounded-lg border ${isCorrect ? "border-[#32CD32] bg-[#32CD32]/10" : "border-gray-600 bg-gray-700/50"} relative overflow-hidden`}>
                        {answerRevealed && (
                          <div className="absolute inset-0 bg-[#32CD32]/5 transition-all" style={{ width: `${(distCount / maxCount) * 100}%` }} />
                        )}
                        <div className="relative flex items-center gap-2">
                          <span className={`font-bold ${isCorrect ? "text-[#32CD32]" : "text-gray-300"}`}>{letter}.</span>
                          <span className="text-white text-sm flex-1">{optionText}</span>
                          {answerRevealed && <span className="text-gray-400 text-sm font-mono">{distCount}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {answerRevealed && revealData?.explanation && (
                  <div className="mt-4 p-3 bg-[#32CD32]/10 border border-[#32CD32]/30 rounded-lg">
                    <p className="text-[#32CD32] font-semibold text-sm mb-1">Explanation:</p>
                    <p className="text-gray-300 text-sm">{revealData.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex gap-3 justify-center">
              {!answerRevealed ? (
                <Button onClick={() => revealAnswer.mutate(sessionId)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3">
                  Reveal Answer
                </Button>
              ) : (
                <Button onClick={() => nextQuestion.mutate(sessionId)} className="bg-[#32CD32] hover:bg-[#28a428] text-black font-bold px-8 py-3">
                  Next Question →
                </Button>
              )}
            </div>

            {/* Live Leaderboard (top 5) */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader><CardTitle className="text-white text-sm">Live Leaderboard (Top 5)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {leaderboard.data?.individuals?.slice(0, 5).map((p: any, i: number) => (
                    <div key={p.id} className="flex justify-between items-center py-1">
                      <span className="text-white text-sm"><span className="text-[#32CD32] font-bold">#{i + 1}</span> {p.displayName}</span>
                      <span className="text-[#32CD32] font-mono text-sm">{p.totalScore?.toLocaleString()} pts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ENDED STATE */}
        {s.status === "ended" && (
          <div className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader><CardTitle className="text-white text-xl">Final Leaderboard</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboard.data?.individuals?.map((p: any, i: number) => (
                    <div key={p.id} className={`flex justify-between items-center py-3 px-4 rounded-lg ${i < 3 ? "bg-[#32CD32]/10 border border-[#32CD32]/30" : "bg-gray-700/30"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-500"}`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </span>
                        <span className="text-white font-semibold">{p.displayName}</span>
                        {p.teamName && <Badge variant="outline" className="border-blue-400 text-blue-400 text-xs">{p.teamName}</Badge>}
                      </div>
                      <span className="text-[#32CD32] font-bold text-lg">{p.totalScore?.toLocaleString()} pts</span>
                    </div>
                  ))}
                </div>

                {/* Team scores */}
                {leaderboard.data?.teams && leaderboard.data.teams.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-white font-semibold mb-3">Team Scores</h3>
                    {leaderboard.data.teams.map((t: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700/50">
                        <span className="text-white">#{i + 1} {t.teamName} ({t.members} members)</span>
                        <span className="text-[#32CD32] font-bold">{t.totalScore?.toLocaleString()} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analytics */}
            {analytics.data && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader><CardTitle className="text-white">Session Analytics</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#32CD32]">{analytics.data.participantCount}</p>
                      <p className="text-gray-400 text-sm">Players</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#32CD32]">{analytics.data.questionStats.length}</p>
                      <p className="text-gray-400 text-sm">Questions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">{analytics.data.hardestQuestion?.accuracyPercent}%</p>
                      <p className="text-gray-400 text-sm">Hardest Q accuracy</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{analytics.data.easiestQuestion?.accuracyPercent}%</p>
                      <p className="text-gray-400 text-sm">Easiest Q accuracy</p>
                    </div>
                  </div>

                  <h4 className="text-white font-semibold mb-3">Per-Question Breakdown</h4>
                  <div className="space-y-2">
                    {analytics.data.questionStats.map((q: any) => (
                      <div key={q.orderIndex} className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm w-8">Q{q.orderIndex + 1}</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                          <div className={`h-full rounded-full ${q.accuracyPercent >= 70 ? "bg-[#32CD32]" : q.accuracyPercent >= 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${q.accuracyPercent}%` }} />
                        </div>
                        <span className="text-white text-sm w-12 text-right">{q.accuracyPercent}%</span>
                        <span className="text-gray-500 text-xs w-16 text-right">{q.avgResponseTimeMs ? `${(q.avgResponseTimeMs / 1000).toFixed(1)}s` : "-"}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
