import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Mail, ArrowLeft } from "lucide-react";

interface ExamResultsProps {
  score: number;
  totalQuestions: number;
  specialty: string;
  duration: number;
  specialtyBreakdown: Array<{ specialty: string; correct: number; total: number }>;
  previousAttempts: Array<{ date: string; score: number }>;
  platformAverage: number;
  onDownloadPDF: () => void;
  onEmailReport: () => void;
  onBack: () => void;
}

export default function ExamResults({
  score,
  totalQuestions,
  specialty,
  duration,
  specialtyBreakdown,
  previousAttempts,
  platformAverage,
  onDownloadPDF,
  onEmailReport,
  onBack,
}: ExamResultsProps) {
  const percentage = Math.round((score / totalQuestions) * 100);
  const passed = percentage >= 70;
  const minutes = Math.floor(duration / 60);

  const pieData = specialtyBreakdown.map((item) => ({
    name: item.specialty,
    value: (item.correct / item.total) * 100,
  }));

  const COLORS = ["#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <Button variant="ghost" onClick={onBack} className="mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      {/* Score Card */}
      <Card className={`p-12 mb-8 text-center border-2 ${passed ? "border-teal-500 bg-gradient-to-br from-teal-50 to-blue-50" : "border-red-500 bg-gradient-to-br from-red-50 to-orange-50"}`}>
        <h1 className={`text-6xl font-bold mb-2 ${passed ? "text-teal-600" : "text-red-600"}`}>{percentage}%</h1>
        <p className={`text-2xl font-semibold mb-4 ${passed ? "text-teal-700" : "text-red-700"}`}>{passed ? "PASS ✓" : "FAIL"}</p>
        <p className="text-slate-600 mb-6">
          You answered {score} out of {totalQuestions} questions correctly in {minutes} minutes
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={onDownloadPDF} className="bg-teal-600 hover:bg-teal-700 gap-2">
            <Download className="w-4 h-4" />
            Download PDF Report
          </Button>
          <Button onClick={onEmailReport} variant="outline" className="gap-2">
            <Mail className="w-4 h-4" />
            Email Report
          </Button>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 border-slate-200">
          <p className="text-sm text-slate-600 mb-2">Your Score</p>
          <p className="text-3xl font-bold text-teal-600">{percentage}%</p>
        </Card>
        <Card className="p-6 border-slate-200">
          <p className="text-sm text-slate-600 mb-2">Platform Average</p>
          <p className="text-3xl font-bold text-blue-600">{platformAverage}%</p>
        </Card>
        <Card className="p-6 border-slate-200">
          <p className="text-sm text-slate-600 mb-2">Difference</p>
          <p className={`text-3xl font-bold ${percentage >= platformAverage ? "text-teal-600" : "text-red-600"}`}>
            {percentage >= platformAverage ? "+" : ""}{percentage - platformAverage}%
          </p>
        </Card>
        <Card className="p-6 border-slate-200">
          <p className="text-sm text-slate-600 mb-2">Time Taken</p>
          <p className="text-3xl font-bold text-purple-600">{minutes}m</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Specialty Breakdown */}
        <Card className="p-6 border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Score by Specialty</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={specialtyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="specialty" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="correct" fill="#14b8a6" name="Correct" />
              <Bar dataKey="total" fill="#e2e8f0" name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Performance Pie Chart */}
        <Card className="p-6 border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Performance Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Previous Attempts */}
        <Card className="p-6 border-slate-200 md:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Your Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={previousAttempts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#14b8a6" name="Your Score" strokeWidth={2} />
              <Line type="monotone" dataKey="platformAverage" stroke="#94a3b8" name="Platform Average" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card className="mt-8 p-6 border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Detailed Breakdown</h3>
        <div className="space-y-3">
          {specialtyBreakdown.map((item) => {
            const percentage = Math.round((item.correct / item.total) * 100);
            return (
              <div key={item.specialty} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{item.specialty}</p>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                    <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <p className="font-bold text-slate-900">{percentage}%</p>
                  <p className="text-xs text-slate-500">
                    {item.correct}/{item.total}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
