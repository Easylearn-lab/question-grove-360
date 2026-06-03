import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BookOpen, Brain, Zap, TrendingUp, Calendar, Target, Flame, Award } from "lucide-react";
import { useState } from "react";

export default function DashboardRedesigned() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [selectedExam, setSelectedExam] = useState("MRCGP AKT");

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  // Mock data for charts
  const accuracyData = [
    { week: "Week 1", accuracy: 65 },
    { week: "Week 2", accuracy: 72 },
    { week: "Week 3", accuracy: 78 },
    { week: "Week 4", accuracy: 82 },
    { week: "Week 5", accuracy: 85 },
  ];

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
          {/* Accuracy Trend */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Accuracy Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="#14b8a6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
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
