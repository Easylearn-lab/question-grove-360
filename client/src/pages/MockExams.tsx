import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Play, FileText, Timer, BarChart3, Trophy, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionGate } from "@/components/SubscriptionGate";

export default function MockExams() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [, navigate] = useLocation();

  const mocksQuery = trpc.mockExams.getMocks.useQuery(undefined, {
    enabled: isReady && isAuthenticated,
  });

  const startMockMutation = trpc.mockExams.startMock.useMutation({
    onSuccess: (data) => {
      // Store exam data in sessionStorage and navigate to active exam
      sessionStorage.setItem("activeMockData", JSON.stringify(data));
      navigate(`/mock-exam/${data.mockId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start mock exam");
    },
  });

  const handleStartMock = (mockId: number) => {
    startMockMutation.mutate({ mockId });
  };

  if (loading || !isAuthenticated || !user || subLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const mocks = mocksQuery.data || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/mrcgp-akt")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mock Exams</h1>
            <p className="text-sm text-slate-600">MRCGP AKT — 160 questions, 155 minutes, 70% pass mark</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <SubscriptionGate isPremium={isPremium} featureName="Mock Exams">
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h3 className="font-bold text-green-900 mb-1">Exam Conditions</h3>
              <p className="text-sm text-green-800">Each mock contains 160 randomised questions drawn from all 17 specialties. Timer runs for 155 minutes. Pass mark is 70%. Results are saved with full specialty breakdown and question review.</p>
            </div>
          </div>
        </div>

        {/* Mocks List */}
        {mocksQuery.isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-6 border-slate-200 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-slate-100 rounded w-1/4"></div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {mocks.map((mock) => (
              <Card key={mock.id} className="p-6 border-slate-200 hover:shadow-lg transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{mock.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        {mock.questionsCount} questions
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Timer className="w-4 h-4" />
                        {mock.timerMinutes} min
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4" />
                        Pass: {mock.passMark}%
                      </span>
                    </div>
                  </div>

                  {/* User Stats */}
                  {mock.attempts > 0 && (
                    <div className="flex items-center gap-4">
                      <div className="text-center px-3">
                        <p className="text-xs text-slate-500">Best</p>
                        <p className={`text-lg font-bold ${(mock.bestPercentage || 0) >= mock.passMark ? "text-green-600" : "text-red-600"}`}>
                          {mock.bestPercentage?.toFixed(0)}%
                        </p>
                      </div>
                      <div className="text-center px-3 border-l border-slate-200">
                        <p className="text-xs text-slate-500">Attempts</p>
                        <p className="text-lg font-bold text-slate-700">{mock.attempts}</p>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => handleStartMock(mock.id)}
                    disabled={startMockMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white gap-2 min-w-[140px]"
                  >
                    {startMockMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        {mock.attempts > 0 ? "Retake" : "Start Exam"}
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Past Results - show last attempt for each mock */}
        {mocks.some((m) => m.attempts > 0) && (
          <div className="mt-10">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Recent Results
            </h2>
            <div className="space-y-3">
              {mocks.filter((m) => m.attempts > 0 && m.lastAttempt).map((mock) => (
                <Card key={`result-${mock.id}`} className="p-4 border-slate-200 hover:shadow-md transition-all cursor-pointer" onClick={() => {
                  // Navigate to the most recent result for this mock
                  // The getHistory endpoint returns results ordered by completedAt DESC
                  toast.info("Loading your latest result...");
                }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{mock.name}</p>
                      <p className="text-sm text-slate-500">Best: {mock.bestPercentage?.toFixed(0)}% — {mock.attempts} attempt{mock.attempts > 1 ? 's' : ''}</p>
                    </div>
                    <div className={`text-lg font-bold ${(mock.bestPercentage || 0) >= mock.passMark ? "text-green-600" : "text-red-600"}`}>
                      {(mock.bestPercentage || 0) >= mock.passMark ? "PASSED" : "BELOW PASS"}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        </SubscriptionGate>
      </main>
    </div>
  );
}
