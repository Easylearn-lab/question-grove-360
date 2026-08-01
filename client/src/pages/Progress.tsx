import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, ChevronDown, ChevronRight } from "lucide-react";

type DateRange = "7" | "14" | "30" | "90" | "all";
type ExamFilter = "all" | "akt" | "plab1";

export default function Progress() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState<DateRange>("30");
  const [examFilter, setExamFilter] = useState<ExamFilter>("all");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const days = dateRange === "all" ? 365 : parseInt(dateRange);

  const { data: mockTrends, isLoading: mockLoading } = trpc.progress.getMockExamTrends.useQuery(
    { days },
    { enabled: isAuthenticated }
  );
  const { data: flashcardStats, isLoading: flashLoading } = trpc.progress.getFlashcardStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: flashcardTrend, isLoading: trendLoading } = trpc.progress.getFlashcardTrend.useQuery(
    { days },
    { enabled: isAuthenticated }
  );
  const { data: specialtyBreakdown, isLoading: specLoading } = trpc.progress.getSpecialtyBreakdown.useQuery(
    { days },
    { enabled: isAuthenticated }
  );
  const topicExamId = examFilter === "plab1" ? 60001 : examFilter === "akt" ? undefined : undefined;
  const { data: topicBreakdown, isLoading: topicLoading } = trpc.progress.getTopicBreakdown.useQuery(
    { days, ...(topicExamId ? { examId: topicExamId } : {}) },
    { enabled: isAuthenticated }
  );
  // Also fetch PLAB1 topic breakdown when "all" is selected
  const { data: plab1TopicBreakdown } = trpc.progress.getTopicBreakdown.useQuery(
    { days, examId: 60001 },
    { enabled: isAuthenticated && examFilter === "all" }
  );

  // Track which specialties are expanded for topic breakdown
  const [expandedSpecialties, setExpandedSpecialties] = useState<Set<string>>(new Set());

  const toggleSpecialty = (specialty: string) => {
    setExpandedSpecialties((prev) => {
      const next = new Set(prev);
      if (next.has(specialty)) {
        next.delete(specialty);
      } else {
        next.add(specialty);
      }
      return next;
    });
  };

  // Helper to get topic data for a specific specialty
  const getTopicsForSpecialty = (specialty: string) => {
    if (!topicBreakdown) return [];
    const found = topicBreakdown.find((s: any) => s.specialty === specialty);
    return found ? found.topics : [];
  };

  // Chart dimensions
  const chartWidth = 700;
  const chartHeight = 200;
  const chartPadding = { top: 20, right: 20, bottom: 30, left: 40 };

  // Mock exam score trend SVG path
  const mockChartPath = useMemo(() => {
    if (!mockTrends || mockTrends.length === 0) return null;
    const innerW = chartWidth - chartPadding.left - chartPadding.right;
    const innerH = chartHeight - chartPadding.top - chartPadding.bottom;
    const maxScore = 100;
    const minScore = 0;

    const points = mockTrends.map((d: any, i: number) => {
      const x = chartPadding.left + (i / Math.max(mockTrends.length - 1, 1)) * innerW;
      const y = chartPadding.top + innerH - ((d.score - minScore) / (maxScore - minScore)) * innerH;
      return { x, y, ...d };
    });

    const pathD = points.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = pathD + ` L ${points[points.length - 1].x} ${chartPadding.top + innerH} L ${points[0].x} ${chartPadding.top + innerH} Z`;

    return { points, pathD, areaD };
  }, [mockTrends]);

  // Flashcard trend SVG path
  const flashChartPath = useMemo(() => {
    if (!flashcardTrend || flashcardTrend.length === 0) return null;
    const innerW = chartWidth - chartPadding.left - chartPadding.right;
    const innerH = chartHeight - chartPadding.top - chartPadding.bottom;

    const points = flashcardTrend.map((d: any, i: number) => {
      const x = chartPadding.left + (i / Math.max(flashcardTrend.length - 1, 1)) * innerW;
      const y = chartPadding.top + innerH - (d.mastered / Math.max(d.total, 1)) * innerH;
      return { x, y, ...d };
    });

    const pathD = points.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return { points, pathD };
  }, [flashcardTrend]);

  // Compute overall stats
  const overallStats = useMemo(() => {
    if (!mockTrends || mockTrends.length === 0) return null;
    const scores = mockTrends.map((d: any) => d.score);
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    const best = Math.max(...scores);
    const latest = scores[scores.length - 1];
    const improvement = scores.length > 1 ? latest - scores[0] : 0;
    return { avg: avg.toFixed(1), best, latest, improvement: improvement.toFixed(1), total: scores.length };
  }, [mockTrends]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: "7", label: "1W" },
    { value: "14", label: "2W" },
    { value: "30", label: "1M" },
    { value: "90", label: "3M" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              ← Back
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Progress Tracker</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-gray-600"
              onClick={() => {
                const rows = ["Date,Score,Exam"];
                if (mockTrends) {
                  mockTrends.forEach((d: any) => rows.push(`${d.date},${d.score},${d.examName || "Mock"}`));
                }
                const blob = new Blob([rows.join("\n")], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `progress-${dateRange}-days.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {dateRangeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    dateRange === opt.value
                      ? "bg-green-600 text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {mockLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : overallStats ? (
            <>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Exams Taken</p>
                  <p className="text-2xl font-bold text-gray-900">{overallStats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Average Score</p>
                  <p className="text-2xl font-bold text-green-600">{overallStats.avg}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Best Score</p>
                  <p className="text-2xl font-bold text-green-600">{overallStats.best}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Improvement</p>
                  <p className={`text-2xl font-bold ${Number(overallStats.improvement) >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {Number(overallStats.improvement) >= 0 ? "+" : ""}{overallStats.improvement}%
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="col-span-4">
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No mock exam data yet. Complete your first mock exam to see progress.</p>
                <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={() => navigate("/mocks")}>
                  Start a Mock Exam
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mock Exam Score Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mock Exam Score Trends</CardTitle>
            <CardDescription>Track your performance over time across all mock exams</CardDescription>
          </CardHeader>
          <CardContent>
            {mockLoading ? (
              <Skeleton className="h-[230px] w-full" />
            ) : mockChartPath ? (
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-[700px] mx-auto" preserveAspectRatio="xMidYMid meet">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((val) => {
                    const innerH = chartHeight - chartPadding.top - chartPadding.bottom;
                    const y = chartPadding.top + innerH - (val / 100) * innerH;
                    return (
                      <g key={val}>
                        <line
                          x1={chartPadding.left}
                          y1={y}
                          x2={chartWidth - chartPadding.right}
                          y2={y}
                          stroke="#e5e7eb"
                          strokeDasharray="4 4"
                        />
                        <text x={chartPadding.left - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="#9ca3af">
                          {val}%
                        </text>
                      </g>
                    );
                  })}
                  {/* Pass threshold line */}
                  <line
                    x1={chartPadding.left}
                    y1={chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) * 0.29}
                    x2={chartWidth - chartPadding.right}
                    y2={chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) * 0.29}
                    stroke="#f59e0b"
                    strokeDasharray="6 3"
                    strokeWidth="1.5"
                  />
                  <text
                    x={chartWidth - chartPadding.right + 4}
                    y={chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) * 0.29 + 4}
                    className="text-[9px]"
                    fill="#f59e0b"
                  >
                    Pass
                  </text>
                  {/* Area fill */}
                  <path d={mockChartPath.areaD} fill="url(#mockGradient)" opacity="0.3" />
                  {/* Line */}
                  <path d={mockChartPath.pathD} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Data points with tooltips */}
                  {mockChartPath.points.map((p: any, i: number) => (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="5"
                          fill="white"
                          stroke="#0d9488"
                          strokeWidth="2"
                          className="cursor-pointer hover:r-[7] transition-all"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-semibold">{p.score}%</p>
                          <p className="text-gray-500">{p.date}</p>
                          {p.examName && <p className="text-xs text-gray-400">{p.examName}</p>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="mockGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm">No exam data yet</p>
                  <p className="text-xs mt-1">Complete mock exams to see your score trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Flashcard Mastery */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Flashcard Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Flashcard Mastery</CardTitle>
              <CardDescription>Your spaced repetition progress</CardDescription>
            </CardHeader>
            <CardContent>
              {flashLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : flashcardStats ? (
                <div className="space-y-4">
                  {/* Mastery breakdown */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-green-700 font-medium">Mastered</span>
                        <span className="text-gray-600">{flashcardStats.mastered || 0}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${flashcardStats.total ? ((flashcardStats.mastered || 0) / flashcardStats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-amber-700 font-medium">Reviewing</span>
                        <span className="text-gray-600">{flashcardStats.reviewing || 0}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${flashcardStats.total ? ((flashcardStats.reviewing || 0) / flashcardStats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-blue-700 font-medium">Learning</span>
                        <span className="text-gray-600">{flashcardStats.learning || 0}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full transition-all duration-500"
                          style={{ width: `${flashcardStats.total ? ((flashcardStats.learning || 0) / flashcardStats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 font-medium">Not Started</span>
                        <span className="text-gray-600">{Math.max(0, (flashcardStats.total || 0) - (flashcardStats.mastered || 0) - (flashcardStats.reviewing || 0) - (flashcardStats.learning || 0))}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-300 rounded-full transition-all duration-500"
                          style={{ width: `${flashcardStats.total ? (Math.max(0, (flashcardStats.total || 0) - (flashcardStats.mastered || 0) - (flashcardStats.reviewing || 0) - (flashcardStats.learning || 0)) / flashcardStats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Total */}
                  <div className="pt-3 border-t border-gray-100 flex justify-between">
                    <span className="text-sm text-gray-500">Total Cards</span>
                    <span className="text-sm font-semibold">{flashcardStats.total || 0}</span>
                  </div>
                  {/* Mastery percentage */}
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-700">
                      {flashcardStats.total ? Math.round(((flashcardStats.mastered || 0) / flashcardStats.total) * 100) : 0}%
                    </p>
                    <p className="text-sm text-green-600 mt-1">Overall Mastery</p>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-sm">No flashcard data yet</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/flashcards")}>
                      Start Flashcards
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flashcard Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mastery Over Time</CardTitle>
              <CardDescription>Cards mastered per day</CardDescription>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <Skeleton className="h-[230px] w-full" />
              ) : flashChartPath ? (
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                    const innerH = chartHeight - chartPadding.top - chartPadding.bottom;
                    const y = chartPadding.top + innerH * (1 - frac);
                    const maxTotal = flashcardTrend ? Math.max(...flashcardTrend.map((d: any) => d.total || 1)) : 1;
                    return (
                      <g key={frac}>
                        <line
                          x1={chartPadding.left}
                          y1={y}
                          x2={chartWidth - chartPadding.right}
                          y2={y}
                          stroke="#e5e7eb"
                          strokeDasharray="4 4"
                        />
                        <text x={chartPadding.left - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="#9ca3af">
                          {Math.round(frac * maxTotal)}
                        </text>
                      </g>
                    );
                  })}
                  {/* Line */}
                  <path d={flashChartPath.pathD} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Data points */}
                  {flashChartPath.points.map((p: any, i: number) => (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          fill="white"
                          stroke="#8b5cf6"
                          strokeWidth="2"
                          className="cursor-pointer"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-semibold">{p.mastered} mastered</p>
                          <p className="text-gray-500">{p.date}</p>
                          <p className="text-xs text-gray-400">{p.total} total reviewed</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </svg>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-sm">No trend data yet</p>
                    <p className="text-xs mt-1">Review flashcards daily to see your mastery grow</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Specialty Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Performance by Specialty</CardTitle>
                <CardDescription>Your accuracy across different medical specialties</CardDescription>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {(["all", "akt", "plab1"] as ExamFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setExamFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      examFilter === f
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {f === "all" ? "All" : f === "akt" ? "AKT" : "PLAB 1"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {specLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : specialtyBreakdown && specialtyBreakdown.length > 0 ? (
              <div className="space-y-1">
                {specialtyBreakdown.map((spec: any, i: number) => {
                  const topics = getTopicsForSpecialty(spec.specialty);
                  const isExpanded = expandedSpecialties.has(spec.specialty);
                  const hasTopics = topics.length > 0;

                  return (
                    <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
                      {/* Specialty row - clickable to expand */}
                      <button
                        className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                          hasTopics ? "cursor-pointer" : "cursor-default"
                        }`}
                        onClick={() => hasTopics && toggleSpecialty(spec.specialty)}
                        type="button"
                      >
                        {hasTopics && (
                          <span className="text-gray-400 w-4 flex-shrink-0">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </span>
                        )}
                        {!hasTopics && <span className="w-4 flex-shrink-0" />}
                        <span className="text-sm font-medium text-gray-700 w-40 truncate text-left">{spec.specialty}</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              spec.accuracy >= 80
                                ? "bg-green-500"
                                : spec.accuracy >= 60
                                ? "bg-amber-400"
                                : "bg-red-400"
                            }`}
                            style={{ width: `${spec.accuracy}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-12 text-right">{spec.accuracy}%</span>
                        <Badge variant="outline" className="text-xs">
                          {spec.total || spec.questionsAttempted} Qs
                        </Badge>
                      </button>

                      {/* Topic breakdown - collapsible */}
                      {isExpanded && hasTopics && (
                        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2 space-y-2">
                          {topics.map((topic: any, j: number) => (
                            <div key={j} className="flex items-center gap-3 pl-5">
                              <span className="text-xs text-gray-600 w-44 truncate" title={topic.topic}>
                                {topic.topic}
                              </span>
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    topic.accuracy >= 80
                                      ? "bg-emerald-400"
                                      : topic.accuracy >= 60
                                      ? "bg-amber-300"
                                      : "bg-red-300"
                                  }`}
                                  style={{ width: `${topic.accuracy}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium w-10 text-right ${
                                topic.accuracy >= 80
                                  ? "text-emerald-600"
                                  : topic.accuracy >= 60
                                  ? "text-amber-600"
                                  : "text-red-600"
                              }`}>
                                {topic.accuracy}%
                              </span>
                              <span className="text-xs text-gray-400 w-10 text-right">
                                {topic.total} Qs
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const basePath = examFilter === "plab1" ? "/plab1/questions" : "/questions";
                                  navigate(`${basePath}?specialty=${encodeURIComponent(spec.specialty)}&topic=${encodeURIComponent(topic.topic)}`);
                                }}
                              >
                                Practise
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-sm">No specialty data yet</p>
                  <p className="text-xs mt-1">Answer questions to see your performance breakdown</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
