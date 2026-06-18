import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BookOpen, Brain, Zap, TrendingUp, Flame, Award, LogOut, BarChart3 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useMemo, useEffect } from "react";

type DateRange = "1W" | "2W" | "1M" | "3M" | "All";

const dateRangeOptions: { label: string; value: DateRange }[] = [
  { label: "1W", value: "1W" },
  { label: "2W", value: "2W" },
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "All", value: "All" },
];

function getDaysForRange(range: DateRange): number {
  switch (range) {
    case "1W": return 7;
    case "2W": return 14;
    case "1M": return 30;
    case "3M": return 90;
    case "All": return 9999;
  }
}

function formatDateLabel(dateStr: string, range: DateRange): string {
  const date = new Date(dateStr);
  if (range === "1W" || range === "2W") {
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  if (range === "1M") {
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

// Custom tooltip component for the accuracy trend chart
function AccuracyTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const date = new Date(data.date);
  const formattedDate = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 min-w-[200px]">
      <p className="text-xs text-gray-500 font-medium mb-2">{formattedDate}</p>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-sm text-gray-700">Accuracy:</span>
        <span className="text-sm font-bold text-green-700">{data.accuracy}%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-purple-500" />
        <span className="text-sm text-gray-700">Questions:</span>
        <span className="text-sm font-bold text-purple-700">{data.questions}</span>
      </div>
      {data.accuracy >= 80 && (
        <p className="text-xs text-emerald-600 mt-2 font-medium border-t border-gray-100 pt-2">
          ✓ Above pass threshold
        </p>
      )}
      {data.accuracy < 80 && data.accuracy >= 70 && (
        <p className="text-xs text-amber-600 mt-2 font-medium border-t border-gray-100 pt-2">
          ⚠ Approaching pass threshold
        </p>
      )}
      {data.accuracy < 70 && (
        <p className="text-xs text-red-500 mt-2 font-medium border-t border-gray-100 pt-2">
          ✗ Below pass threshold
        </p>
      )}
    </div>
  );
}

// Map exam names to their codes for the backend query
const EXAM_CODE_MAP: Record<string, string> = {
  "MRCGP AKT": "MRCGP-AKT",
  "MRCGP SCA": "MRCGP-SCA",
  "PLAB 1": "PLAB-1",
  "PLAB 2": "PLAB-2",
  "USMLE Step 1": "USMLE-STEP1",
  "USMLE Step 2": "USMLE-STEP2",
  "MCCQE1": "MCCQE1",
};

const COLORS = ["#14b8a6", "#8b5cf6", "#f97316", "#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#6366f1"];

export default function DashboardRedesigned() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [selectedExam, setSelectedExam] = useState("MRCGP AKT");
  const [dateRange, setDateRange] = useState<DateRange>("1M");

  // Fetch available exams from the database
  const examsQuery = trpc.dashboard.getExams.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Fetch real per-user stats based on selected exam
  const statsQuery = trpc.dashboard.getStats.useQuery(
    { examCode: EXAM_CODE_MAP[selectedExam] },
    { enabled: isAuthenticated }
  );

  const stats = statsQuery.data;

  // Filter accuracy trend data based on selected date range
  const filteredAccuracyData = useMemo(() => {
    if (!stats?.accuracyTrend || stats.accuracyTrend.length === 0) return [];
    const days = getDaysForRange(dateRange);
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return stats.accuracyTrend
      .filter((d) => new Date(d.date) >= cutoff)
      .map((d) => ({
        ...d,
        label: formatDateLabel(d.date, dateRange),
      }));
  }, [stats?.accuracyTrend, dateRange]);

  // Calculate trend from filtered data
  const trend = useMemo(() => {
    if (filteredAccuracyData.length < 2) return { value: 0, direction: "flat" as const };
    const first = filteredAccuracyData[0].accuracy;
    const last = filteredAccuracyData[filteredAccuracyData.length - 1].accuracy;
    const diff = last - first;
    return {
      value: Math.abs(diff),
      direction: diff > 0 ? ("up" as const) : diff < 0 ? ("down" as const) : ("flat" as const),
    };
  }, [filteredAccuracyData]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Build exam list from database or fallback
  const exams = examsQuery.data && examsQuery.data.length > 0
    ? examsQuery.data.map((e) => ({ id: e.name, name: e.name, category: e.category || "UK", questionCount: e.questionCount }))
    : [
        { id: "MRCGP AKT", name: "MRCGP AKT", category: "UK", questionCount: 0 },
        { id: "MRCGP SCA", name: "MRCGP SCA", category: "UK", questionCount: 0 },
        { id: "PLAB 1", name: "PLAB 1", category: "UK", questionCount: 0 },
        { id: "PLAB 2", name: "PLAB 2", category: "UK", questionCount: 0 },
        { id: "USMLE Step 1", name: "USMLE Step 1", category: "International", questionCount: 0 },
        { id: "USMLE Step 2", name: "USMLE Step 2", category: "International", questionCount: 0 },
        { id: "MCCQE1", name: "MCCQE1", category: "International", questionCount: 0 },
      ];

  const selectedExamData = exams.find((e) => e.id === selectedExam);
  const hasNoData = !stats || stats.totalQuestions === 0;
  const isStatsLoading = statsQuery.isLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
            <p className="text-gray-600 mt-1">Keep up your learning momentum</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/pricing")}>Pricing</Button>
            <Button variant="outline" size="sm" onClick={() => logout()} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <LogOut className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <span className="hidden md:inline">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/profile")}>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/payments")}>Subscription</DropdownMenuItem>
                {user?.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>Admin Panel</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Exam Selector */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Exam</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {exams.map((exam) => {
              const isMRCGPAKT = exam.id === "MRCGP AKT";
              return (
                <button
                  key={exam.id}
                  onClick={() => {
                    if (isMRCGPAKT) {
                      navigate("/mrcgp-akt");
                    } else {
                      setSelectedExam(exam.id);
                    }
                  }}
                  className={`p-3 rounded-lg font-medium transition-all ${
                    selectedExam === exam.id && !isMRCGPAKT
                      ? "bg-green-600 text-gray-900 shadow-lg"
                      : "bg-white text-gray-700 border border-green-300 hover:border-green-400 hover:bg-green-50"
                  }`}
                >
                  <span className="block text-sm">{exam.name}</span>
                  {isMRCGPAKT && (
                    <span className="block text-[10px] text-green-600 mt-0.5 font-semibold">60 Q</span>
                  )}
                  {exam.questionCount === 0 && selectedExam !== exam.id && !isMRCGPAKT && (
                    <span className="block text-[10px] text-gray-400 mt-0.5">Coming soon</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Coming Soon state for exams with no questions */}
        {selectedExamData && selectedExamData.questionCount === 0 && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <BarChart3 className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedExam} — Coming Soon</h3>
            <p className="text-sm text-gray-600">
              Questions for this exam are being prepared. Check back soon or switch to another exam to start practicing.
            </p>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Study Streak */}
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Study Streak</p>
                {isStatsLoading ? (
                  <div className="h-9 w-24 bg-orange-200/50 rounded animate-pulse mt-2" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-orange-600 mt-2">
                      {stats?.studyStreak ?? 0} {stats?.studyStreak === 1 ? "day" : "days"}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {(stats?.studyStreak ?? 0) > 0 ? "Keep it going!" : "Start practicing today!"}
                    </p>
                  </>
                )}
              </div>
              <Flame className="w-12 h-12 text-orange-500 opacity-30" />
            </div>
          </Card>

          {/* Accuracy */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Accuracy</p>
                {isStatsLoading ? (
                  <div className="h-9 w-20 bg-green-200/50 rounded animate-pulse mt-2" />
                ) : hasNoData ? (
                  <>
                    <p className="text-2xl font-bold text-green-600 mt-2">—</p>
                    <p className="text-xs text-gray-600 mt-1">No data yet</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-green-600 mt-2">{stats?.accuracy}%</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {stats?.accuracyChange !== null && stats?.accuracyChange !== undefined
                        ? `${stats.accuracyChange >= 0 ? "+" : ""}${stats.accuracyChange}% this week`
                        : "Keep practicing for trends"}
                    </p>
                  </>
                )}
              </div>
              <TrendingUp className="w-12 h-12 text-green-500 opacity-30" />
            </div>
          </Card>

          {/* Questions Answered */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Questions</p>
                {isStatsLoading ? (
                  <div className="h-9 w-20 bg-purple-200/50 rounded animate-pulse mt-2" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-purple-600 mt-2">
                      {(stats?.totalQuestions ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {(stats?.questionsToday ?? 0) > 0
                        ? `+${stats?.questionsToday} today`
                        : "None today — start now!"}
                    </p>
                  </>
                )}
              </div>
              <BookOpen className="w-12 h-12 text-purple-500 opacity-30" />
            </div>
          </Card>

          {/* Pass Probability */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pass Probability</p>
                {isStatsLoading ? (
                  <div className="h-9 w-20 bg-blue-200/50 rounded animate-pulse mt-2" />
                ) : stats?.passProbability !== null && stats?.passProbability !== undefined ? (
                  <>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats.passProbability}%</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {stats.passProbability >= 80 ? "Excellent progress" : stats.passProbability >= 60 ? "Good progress" : "Keep practicing"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-blue-600 mt-2">Not enough data</p>
                    <p className="text-xs text-gray-600 mt-1">Answer 20+ questions</p>
                  </>
                )}
              </div>
              <Award className="w-12 h-12 text-blue-500 opacity-30" />
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Accuracy Trend with Date Range Filter */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Accuracy Trend</h3>
                {filteredAccuracyData.length >= 2 && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {trend.direction === "up" && (
                      <span className="text-emerald-600">↑ +{trend.value}% improvement</span>
                    )}
                    {trend.direction === "down" && (
                      <span className="text-red-500">↓ -{trend.value}% decline</span>
                    )}
                    {trend.direction === "flat" && (
                      <span className="text-gray-500">→ No change</span>
                    )}
                    <span className="text-gray-400 ml-1">
                      ({filteredAccuracyData.length} sessions)
                    </span>
                  </p>
                )}
              </div>
              {/* Date Range Filter */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {dateRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateRange(option.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                      dateRange === option.value
                        ? "bg-green-600 text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-green-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {filteredAccuracyData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredAccuracyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      content={<AccuracyTooltip />}
                      cursor={{ stroke: "#14b8a6", strokeWidth: 1, strokeDasharray: "4 4" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#14b8a6"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#14b8a6", stroke: "#fff", strokeWidth: 2 }}
                      activeDot={{
                        r: 7,
                        fill: "#14b8a6",
                        stroke: "#fff",
                        strokeWidth: 3,
                        className: "drop-shadow-md",
                      }}
                      fill="url(#accuracyGradient)"
                    />
                    {/* Pass threshold reference line */}
                    <Line
                      type="monotone"
                      dataKey={() => 80}
                      stroke="#d1d5db"
                      strokeWidth={1}
                      strokeDasharray="6 4"
                      dot={false}
                      activeDot={false}
                      name="Pass Threshold"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-green-500 rounded-full inline-block" />
                    Your Accuracy
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-gray-300 rounded-full inline-block" style={{ borderTop: "1px dashed #d1d5db" }} />
                    Pass Threshold (80%)
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <TrendingUp className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No accuracy data yet</p>
                <p className="text-sm text-gray-400 mt-1">Start answering questions to see your progress over time</p>
              </div>
            )}
          </Card>

          {/* Specialty Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Specialty Breakdown</h3>
            {stats?.specialtyBreakdown && stats.specialtyBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.specialtyBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.specialtyBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {stats.specialtyBreakdown.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-gray-700">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{item.value}%</span>
                        <span className="text-gray-400 text-xs">({item.total} Qs)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <Brain className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No specialty data yet</p>
                <p className="text-sm text-gray-400 mt-1">Answer questions across different specialties to see your breakdown</p>
              </div>
            )}
          </Card>
        </div>

        {/* Quick Access */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: BookOpen, title: "Question Bank", desc: "Continue practicing", color: "teal", action: () => navigate("/questions") },
            { icon: Zap, title: "Mock Exams", desc: "Take a full-length exam", color: "purple", action: () => navigate("/mocks") },
            { icon: Brain, title: "AI Coach360", desc: "Get personalized help", color: "orange", action: () => navigate("/coach") },
          ].map((item, i) => (
            <Card key={i} className="p-6 hover:shadow-lg transition-all cursor-pointer" onClick={item.action}>
              <div className={`inline-flex p-3 rounded-lg bg-${item.color}-100 mb-4`}>
                <item.icon className={`w-6 h-6 text-${item.color}-600`} />
              </div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
              <p className="text-green-600 font-medium mt-4">Get Started →</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
