import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BookOpen, Brain, Zap, TrendingUp, Flame, Award } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

// Extended mock data with daily granularity for date range filtering
const allAccuracyData = [
  { date: "2026-04-01", accuracy: 58, questions: 12 },
  { date: "2026-04-03", accuracy: 61, questions: 18 },
  { date: "2026-04-05", accuracy: 63, questions: 15 },
  { date: "2026-04-07", accuracy: 60, questions: 20 },
  { date: "2026-04-10", accuracy: 65, questions: 22 },
  { date: "2026-04-12", accuracy: 68, questions: 14 },
  { date: "2026-04-14", accuracy: 66, questions: 25 },
  { date: "2026-04-17", accuracy: 70, questions: 30 },
  { date: "2026-04-19", accuracy: 72, questions: 18 },
  { date: "2026-04-21", accuracy: 74, questions: 28 },
  { date: "2026-04-24", accuracy: 73, questions: 22 },
  { date: "2026-04-26", accuracy: 76, questions: 35 },
  { date: "2026-04-28", accuracy: 78, questions: 20 },
  { date: "2026-05-01", accuracy: 77, questions: 32 },
  { date: "2026-05-03", accuracy: 80, questions: 25 },
  { date: "2026-05-05", accuracy: 79, questions: 28 },
  { date: "2026-05-08", accuracy: 82, questions: 30 },
  { date: "2026-05-10", accuracy: 81, questions: 22 },
  { date: "2026-05-12", accuracy: 83, questions: 35 },
  { date: "2026-05-15", accuracy: 82, questions: 28 },
  { date: "2026-05-17", accuracy: 84, questions: 40 },
  { date: "2026-05-19", accuracy: 83, questions: 32 },
  { date: "2026-05-22", accuracy: 85, questions: 25 },
  { date: "2026-05-24", accuracy: 86, questions: 38 },
  { date: "2026-05-26", accuracy: 84, questions: 30 },
  { date: "2026-05-28", accuracy: 87, questions: 42 },
  { date: "2026-05-30", accuracy: 85, questions: 35 },
  { date: "2026-06-01", accuracy: 88, questions: 28 },
  { date: "2026-06-02", accuracy: 86, questions: 45 },
  { date: "2026-06-03", accuracy: 85, questions: 32 },
];

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
function AccuracyTooltip({ active, payload, label }: any) {
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
        <div className="w-3 h-3 rounded-full bg-teal-500" />
        <span className="text-sm text-gray-700">Accuracy:</span>
        <span className="text-sm font-bold text-teal-700">{data.accuracy}%</span>
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

export default function DashboardRedesigned() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedExam, setSelectedExam] = useState("MRCGP AKT");
  const [dateRange, setDateRange] = useState<DateRange>("1M");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Filter accuracy data based on selected date range
  const filteredAccuracyData = useMemo(() => {
    const days = getDaysForRange(dateRange);
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return allAccuracyData
      .filter((d) => new Date(d.date) >= cutoff)
      .map((d) => ({
        ...d,
        label: formatDateLabel(d.date, dateRange),
      }));
  }, [dateRange]);

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

  const specialtyData = [
    { name: "Cardiology", value: 88 },
    { name: "Respiratory", value: 82 },
    { name: "GI", value: 75 },
    { name: "Neurology", value: 79 },
    { name: "Other", value: 71 },
  ];

  const COLORS = ["#14b8a6", "#8b5cf6", "#f97316", "#3b82f6", "#ec4899"];

  const exams = [
    { id: "MRCGP AKT", name: "MRCGP AKT", category: "UK" },
    { id: "MRCGP SCA", name: "MRCGP SCA", category: "UK" },
    { id: "PLAB 1", name: "PLAB 1", category: "UK" },
    { id: "PLAB 2", name: "PLAB 2", category: "UK" },
    { id: "USMLE Step 1", name: "USMLE Step 1", category: "International" },
    { id: "USMLE Step 2", name: "USMLE Step 2", category: "International" },
    { id: "MCCQE1", name: "MCCQE1", category: "International" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
            <p className="text-gray-600 mt-1">Keep up your learning momentum</p>
          </div>
          <Button onClick={() => navigate("/profile")} className="bg-teal-600 hover:bg-teal-700 text-white">
            Profile Settings
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Exam Selector */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Exam</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => setSelectedExam(exam.id)}
                className={`p-3 rounded-lg font-medium transition-all ${
                  selectedExam === exam.id
                    ? "bg-teal-600 text-white shadow-lg"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-teal-300"
                }`}
              >
                {exam.name}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Study Streak */}
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Study Streak</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">12 days</p>
                <p className="text-xs text-gray-600 mt-1">Keep it going!</p>
              </div>
              <Flame className="w-12 h-12 text-orange-500 opacity-30" />
            </div>
          </Card>

          {/* Accuracy */}
          <Card className="p-6 bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Accuracy</p>
                <p className="text-3xl font-bold text-teal-600 mt-2">85%</p>
                <p className="text-xs text-gray-600 mt-1">+3% this week</p>
              </div>
              <TrendingUp className="w-12 h-12 text-teal-500 opacity-30" />
            </div>
          </Card>

          {/* Questions Answered */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Questions</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">1,247</p>
                <p className="text-xs text-gray-600 mt-1">+42 today</p>
              </div>
              <BookOpen className="w-12 h-12 text-purple-500 opacity-30" />
            </div>
          </Card>

          {/* Pass Probability */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pass Probability</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">92%</p>
                <p className="text-xs text-gray-600 mt-1">Excellent progress</p>
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
              </div>
              {/* Date Range Filter */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {dateRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateRange(option.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                      dateRange === option.value
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-teal-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
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
                  domain={[50, 100]}
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
                <span className="w-3 h-0.5 bg-teal-500 rounded-full inline-block" />
                Your Accuracy
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-gray-300 rounded-full inline-block border-dashed" style={{ borderTop: "1px dashed #d1d5db" }} />
                Pass Threshold (80%)
              </span>
            </div>
          </Card>

          {/* Specialty Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Specialty Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={specialtyData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {specialtyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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
              <p className="text-teal-600 font-medium mt-4">Get Started →</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
