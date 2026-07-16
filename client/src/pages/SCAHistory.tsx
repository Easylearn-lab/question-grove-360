import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, TrendingUp, CheckCircle2, XCircle, BarChart3, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useExamAccess } from "@/hooks/useExamAccess";
import { CrossSellGate } from "@/components/CrossSellGate";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function SCAHistory() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const [, navigate] = useLocation();
  const { hasAccess: isPremium, isLoading: subLoading } = useExamAccess("SCA");
  const [selectedConsultation, setSelectedConsultation] = useState<number | null>(null);

  // Fetch consultation history
  const historyQuery = trpc.sca.getHistory.useQuery(undefined, {
    enabled: isReady && isAuthenticated,
  });

  // Fetch selected consultation detail
  const consultationDetail = trpc.sca.getConsultation.useQuery(
    { consultationId: selectedConsultation! },
    { enabled: !!selectedConsultation }
  );

  // Compute average scores for radar chart
  const averageScores = useMemo(() => {
    if (!historyQuery.data || historyQuery.data.length === 0) return null;
    const consultations = historyQuery.data;
    const total = consultations.length;
    const avgD1 = consultations.reduce((sum: number, c: any) => sum + (c.domain1Score || 0), 0) / total;
    const avgD2 = consultations.reduce((sum: number, c: any) => sum + (c.domain2Score || 0), 0) / total;
    const avgD3 = consultations.reduce((sum: number, c: any) => sum + (c.domain3Score || 0), 0) / total;
    const passRate = (consultations.filter((c: any) => c.passed).length / total) * 100;
    return { avgD1, avgD2, avgD3, passRate, total };
  }, [historyQuery.data]);

  // Radar chart data
  const radarData = useMemo(() => {
    if (!averageScores) return [];
    return [
      { domain: "Data Gathering", score: averageScores.avgD1, fullMark: 3 },
      { domain: "Clinical Management", score: averageScores.avgD2, fullMark: 3 },
      { domain: "Interpersonal Skills", score: averageScores.avgD3, fullMark: 3 },
    ];
  }, [averageScores]);

  if (loading || !isAuthenticated || !user || subLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Detail view for a specific consultation
  if (selectedConsultation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedConsultation(null)} className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold text-slate-900">Consultation Detail</h1>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {consultationDetail.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : consultationDetail.data ? (
            <ConsultationDetailView consultation={consultationDetail.data} />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-slate-600">Consultation not found.</p>
            </Card>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sca")} className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My SCA Progress</h1>
            <p className="text-sm text-slate-500">Track your consultation performance over time</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CrossSellGate hasAccess={isPremium} requiredTrack="SCA" featureName="SCA Progress History">
          {historyQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : !historyQuery.data || historyQuery.data.length === 0 ? (
            <Card className="p-12 text-center border-slate-200">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Consultations Yet</h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Complete your first SCA consultation to see your progress and performance analytics here.
              </p>
              <Button onClick={() => navigate("/sca")} className="bg-green-600 hover:bg-green-700 text-white">
                Start a Consultation
              </Button>
            </Card>
          ) : (
            <>
              {/* Summary Section with Radar Chart */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                {/* Radar Chart */}
                <Card className="lg:col-span-2 p-6 border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900 mb-1">Domain Performance</h2>
                  <p className="text-sm text-slate-500 mb-4">Average scores across all consultations (max 3 per domain)</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis
                          dataKey="domain"
                          tick={{ fill: "#475569", fontSize: 12 }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 3]}
                          tick={{ fill: "#94a3b8", fontSize: 10 }}
                          tickCount={4}
                        />
                        <Radar
                          name="Average Score"
                          dataKey="score"
                          stroke="#16a34a"
                          fill="#16a34a"
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                        <Tooltip
                          formatter={(value: number) => [value.toFixed(2), "Avg Score"]}
                          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Weakness indicator */}
                  {averageScores && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Weakest domain:</span>{" "}
                        <span className="text-red-600 font-semibold">
                          {getWeakestDomain(averageScores.avgD1, averageScores.avgD2, averageScores.avgD3)}
                        </span>
                      </p>
                    </div>
                  )}
                </Card>

                {/* Summary Stats */}
                <div className="space-y-4">
                  <Card className="p-5 border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Pass Rate</p>
                        <p className="text-2xl font-bold text-slate-900">{averageScores?.passRate.toFixed(0)}%</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-5 border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Consultations</p>
                        <p className="text-2xl font-bold text-slate-900">{averageScores?.total}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-5 border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Avg Total Score</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {averageScores ? ((averageScores.avgD1 + averageScores.avgD2 + averageScores.avgD3) / 3 * 3).toFixed(1) : "—"}/9
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Consultation History Table */}
              <Card className="border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900">Consultation History</h2>
                  <p className="text-sm text-slate-500">Your past SCA consultations with domain scores</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-5 py-3 font-medium text-slate-600">Case</th>
                        <th className="text-left px-5 py-3 font-medium text-slate-600">Date</th>
                        <th className="text-center px-3 py-3 font-medium text-slate-600">D1</th>
                        <th className="text-center px-3 py-3 font-medium text-slate-600">D2</th>
                        <th className="text-center px-3 py-3 font-medium text-slate-600">D3</th>
                        <th className="text-center px-3 py-3 font-medium text-slate-600">Total</th>
                        <th className="text-center px-3 py-3 font-medium text-slate-600">Result</th>
                        <th className="text-right px-5 py-3 font-medium text-slate-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyQuery.data.map((consultation: any) => (
                        <tr key={consultation.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-medium text-slate-900 line-clamp-1">{consultation.caseTitle || `Case #${consultation.caseId}`}</span>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {formatDate(consultation.completedAt)}
                            </div>
                          </td>
                          <td className="text-center px-3 py-4">
                            <ScoreBadge score={consultation.domain1Score} />
                          </td>
                          <td className="text-center px-3 py-4">
                            <ScoreBadge score={consultation.domain2Score} />
                          </td>
                          <td className="text-center px-3 py-4">
                            <ScoreBadge score={consultation.domain3Score} />
                          </td>
                          <td className="text-center px-3 py-4">
                            <span className="font-semibold text-slate-900">{consultation.totalScore}/9</span>
                          </td>
                          <td className="text-center px-3 py-4">
                            {consultation.passed ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">Pass</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 border-red-200">Fail</Badge>
                            )}
                          </td>
                          <td className="text-right px-5 py-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedConsultation(consultation.id)}
                              className="gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </CrossSellGate>
      </main>
    </div>
  );
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 3 ? "text-green-700 bg-green-50" : score >= 2 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50";
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${color}`}>
      {score}
    </span>
  );
}

function ConsultationDetailView({ consultation }: { consultation: any }) {
  const transcript = consultation.transcript || [];
  const aiFeedback = consultation.aiFeedback || {};

  return (
    <div className="space-y-6">
      {/* Score Summary Card */}
      <Card className="p-6 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{consultation.caseTitle || `Case #${consultation.caseId}`}</h2>
            <p className="text-sm text-slate-500 mt-1">
              Completed {formatDate(consultation.completedAt)} • Duration: {formatDuration(consultation.duration)}
            </p>
          </div>
          {consultation.passed ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-base px-4 py-1.5">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Pass
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700 border-red-200 text-base px-4 py-1.5">
              <XCircle className="w-4 h-4 mr-1.5" /> Fail
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Data Gathering</p>
            <p className="text-2xl font-bold text-slate-900">{consultation.domain1Score}<span className="text-sm text-slate-400">/3</span></p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Clinical Management</p>
            <p className="text-2xl font-bold text-slate-900">{consultation.domain2Score}<span className="text-sm text-slate-400">/3</span></p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Interpersonal Skills</p>
            <p className="text-2xl font-bold text-slate-900">{consultation.domain3Score}<span className="text-sm text-slate-400">/3</span></p>
          </div>
        </div>
      </Card>

      {/* Competency Feedback */}
      {Object.keys(aiFeedback).length > 0 && (
        <Card className="p-6 border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Competency Breakdown</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(aiFeedback).map(([competency, score]) => (
              <div key={competency} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-700 capitalize">{competency.replace(/([A-Z])/g, " $1").trim()}</span>
                <CompetencyBadge score={score as string} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Transcript */}
      <Card className="p-6 border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Consultation Transcript</h3>
        {transcript.length === 0 ? (
          <p className="text-slate-500 text-sm">No transcript recorded for this consultation.</p>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {transcript.map((msg: any, idx: number) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-green-600 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}>
                  <p className="text-xs font-medium mb-1 opacity-75">
                    {msg.role === "user" ? "Doctor (You)" : "Patient"}
                  </p>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function CompetencyBadge({ score }: { score: string }) {
  if (score === "well") return <Badge className="bg-green-100 text-green-700 border-green-200">Done Well</Badge>;
  if (score === "partial") return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Partially</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200">Poor</Badge>;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function getWeakestDomain(d1: number, d2: number, d3: number): string {
  const min = Math.min(d1, d2, d3);
  if (min === d1) return "Data Gathering";
  if (min === d2) return "Clinical Management";
  return "Interpersonal Skills";
}
