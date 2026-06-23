import { useLocation, useRoute } from "wouter";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trophy, XCircle, CheckCircle2, Clock, Mail, BarChart3, BookOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function MockExamResults() {
  const { user, isAuthenticated, loading } = useProtectedRoute();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/mock-results/:id");
  const resultId = params?.id ? Number(params.id) : 0;

  const resultQuery = trpc.mockExams.getResult.useQuery(
    { resultId },
    { enabled: !!resultId && isAuthenticated }
  );

  const sendEmailMutation = trpc.mockExams.sendEmailReport.useMutation({
    onSuccess: () => toast.success("Results emailed to you!"),
    onError: (err) => toast.error(err.message || "Failed to send email"),
  });

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (resultQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-slate-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (resultQuery.error || !resultQuery.data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Result Not Found</h2>
          <p className="text-slate-600 mb-6">This result may not exist or you don't have access.</p>
          <Button onClick={() => navigate("/mocks")} className="bg-green-600 hover:bg-green-700 text-white">
            Back to Mock Exams
          </Button>
        </Card>
      </div>
    );
  }

  const result = resultQuery.data;
  const specialtyBreakdown = result.specialtyBreakdown || {};
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/mocks")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Exam Results</h1>
            <p className="text-sm text-slate-600">{result.mockName}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Score Card */}
        <Card className={`p-8 mb-8 border-2 ${result.passed ? "border-green-300 bg-gradient-to-br from-green-50 to-emerald-50" : "border-red-200 bg-gradient-to-br from-red-50 to-orange-50"}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${result.passed ? "bg-green-100" : "bg-red-100"}`}>
                {result.passed ? (
                  <Trophy className="w-10 h-10 text-green-600" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-500" />
                )}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900">{result.percentage.toFixed(1)}%</h2>
                <p className={`text-lg font-semibold ${result.passed ? "text-green-700" : "text-red-600"}`}>
                  {result.passed ? "PASSED" : "NOT PASSED"}
                </p>
                <p className="text-sm text-slate-600">
                  {result.score}/{result.totalQuestions} correct (Pass mark: 70%)
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Time: {formatTime(result.timeTaken)}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendEmailMutation.mutate({ resultId })}
                  disabled={sendEmailMutation.isPending}
                  className="gap-1.5"
                >
                  <Mail className="w-4 h-4" />
                  {sendEmailMutation.isPending ? "Sending..." : "Email Report"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate(`/mock-review/${resultId}`)}
                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  Review Questions
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Specialty Breakdown */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Specialty Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(specialtyBreakdown)
              .sort(([, a]: any, [, b]: any) => (b.correct / b.total) - (a.correct / a.total))
              .map(([specialty, data]: [string, any]) => {
                const pct = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                const passed = pct >= 70;
                return (
                  <div key={specialty} className="flex items-center gap-4">
                    <div className="w-40 sm:w-52 text-sm font-medium text-slate-700 truncate">{specialty}</div>
                    <div className="flex-1">
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${passed ? "bg-green-500" : "bg-red-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      <span className={`text-sm font-bold ${passed ? "text-green-700" : "text-red-600"}`}>
                        {pct.toFixed(0)}%
                      </span>
                      <span className="text-xs text-slate-500 ml-1">
                        ({data.correct}/{data.total})
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate(`/mock-review/${resultId}`)}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Review All Questions
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/mocks")}
            className="gap-2"
          >
            Back to Mock Exams
          </Button>
        </div>
      </main>
    </div>
  );
}
