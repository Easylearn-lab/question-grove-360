import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function LiveQuiz() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [joinCode, setJoinCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Create session form state
  const [title, setTitle] = useState("");
  const [examSource, setExamSource] = useState("questions");
  const [specialty, setSpecialty] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(30);
  const [isPublic, setIsPublic] = useState(false);

  const publicSessions = trpc.liveQuiz.getPublicSessions.useQuery();
  const globalLeaderboard = trpc.liveQuiz.getGlobalLeaderboard.useQuery();
  const createSession = trpc.liveQuiz.createSession.useMutation({
    onSuccess: (data) => navigate(`/live/host/${data.sessionId}`),
  });

  const handleJoin = () => {
    if (joinCode.length === 6) navigate(`/live/play?code=${joinCode.toUpperCase()}`);
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    createSession.mutate({
      title: title.trim(),
      examSource: examSource as any,
      specialtyFilter: specialty || undefined,
      questionCount,
      timeLimitSeconds: timeLimit,
      isPublic,
    });
  };

  const examSourceLabels: Record<string, string> = {
    questions: "AKT (MRCGP)",
    plab1_questions: "PLAB 1",
    msra_cps_questions: "MSRA CPS",
    jamb_questions: "JAMB",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            <span className="text-[#32CD32]">Live</span> Quiz
          </h1>
          <p className="text-gray-400 text-lg">Host or join real-time interactive quizzes powered by our question banks</p>
        </div>

        {/* Join / Host Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Join Card */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <span className="text-2xl">🎯</span> Join a Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">Enter the 6-character code shown by your host</p>
              <div className="flex gap-2">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ABC123"
                  className="text-2xl text-center tracking-[0.3em] font-mono bg-gray-700 border-gray-600 text-white uppercase"
                  maxLength={6}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />
                <Button onClick={handleJoin} disabled={joinCode.length !== 6} className="bg-[#32CD32] hover:bg-[#28a428] text-black font-bold px-6">
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Host Card */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <span className="text-2xl">🎙️</span> Host a Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">Create a live quiz from any question bank</p>
              {!showCreate ? (
                <Button onClick={() => setShowCreate(true)} className="w-full bg-[#32CD32] hover:bg-[#28a428] text-black font-bold">
                  Create New Session
                </Button>
              ) : (
                <div className="space-y-3">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Session title (e.g. Cardiology Revision)" className="bg-gray-700 border-gray-600 text-white" />
                  <Select value={examSource} onValueChange={setExamSource}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="questions">AKT (MRCGP)</SelectItem>
                      <SelectItem value="plab1_questions">PLAB 1</SelectItem>
                      <SelectItem value="msra_cps_questions">MSRA CPS</SelectItem>
                      <SelectItem value="jamb_questions">JAMB</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Specialty filter (optional)" className="bg-gray-700 border-gray-600 text-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400">Questions</label>
                      <Input type="number" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} min={5} max={50} className="bg-gray-700 border-gray-600 text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Time per Q (sec)</label>
                      <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} min={10} max={120} className="bg-gray-700 border-gray-600 text-white" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded" />
                    Make session publicly joinable
                  </label>
                  <Button onClick={handleCreate} disabled={createSession.isPending || !title.trim()} className="w-full bg-[#32CD32] hover:bg-[#28a428] text-black font-bold">
                    {createSession.isPending ? "Creating..." : "Create & Start Hosting"}
                  </Button>
                  {createSession.error && <p className="text-red-400 text-sm">{createSession.error.message}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Public Sessions / Leaderboard */}
        <Tabs defaultValue="public" className="w-full">
          <TabsList className="bg-gray-800 border-gray-700 mb-4">
            <TabsTrigger value="public" className="data-[state=active]:bg-[#32CD32] data-[state=active]:text-black">Public Sessions</TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-[#32CD32] data-[state=active]:text-black">Global Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="public">
            {publicSessions.data?.length === 0 && (
              <p className="text-gray-500 text-center py-8">No public sessions available right now. Create one!</p>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicSessions.data?.map((s: any) => (
                <Card key={s.id} className="bg-gray-800/50 border-gray-700 hover:border-[#32CD32]/50 transition-colors cursor-pointer" onClick={() => navigate(`/live/play?code=${s.sessionCode}`)}>
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-1">{s.title}</h3>
                    <p className="text-gray-400 text-sm mb-2">Hosted by {s.hostName}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="border-[#32CD32] text-[#32CD32]">{examSourceLabels[s.examSource] || s.examSource}</Badge>
                      <Badge variant="outline" className="border-gray-500 text-gray-400">{s.questionCount} Qs</Badge>
                      <Badge variant="outline" className="border-yellow-500 text-yellow-400">Waiting</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Individual Leaderboard */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader><CardTitle className="text-white text-lg">Top Players</CardTitle></CardHeader>
                <CardContent>
                  {(globalLeaderboard.data?.individuals as any[])?.length === 0 && <p className="text-gray-500">No data yet. Play some public sessions!</p>}
                  <div className="space-y-2">
                    {(globalLeaderboard.data?.individuals as any[])?.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700/50">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${i < 3 ? "text-[#32CD32]" : "text-gray-400"}`}>#{i + 1}</span>
                          <span className="text-white">{p.displayName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#32CD32] font-bold">{p.totalScore?.toLocaleString()}</span>
                          <span className="text-gray-500 text-xs ml-2">({p.sessionsPlayed} sessions)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Team Leaderboard */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader><CardTitle className="text-white text-lg">Top Teams</CardTitle></CardHeader>
                <CardContent>
                  {(globalLeaderboard.data?.teams as any[])?.length === 0 && <p className="text-gray-500">No team data yet.</p>}
                  <div className="space-y-2">
                    {(globalLeaderboard.data?.teams as any[])?.map((t: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700/50">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${i < 3 ? "text-[#32CD32]" : "text-gray-400"}`}>#{i + 1}</span>
                          <span className="text-white">{t.teamName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#32CD32] font-bold">{t.totalScore?.toLocaleString()}</span>
                          <span className="text-gray-500 text-xs ml-2">({t.members} members)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
