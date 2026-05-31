import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Play } from "lucide-react";
import { trpc } from "@/lib/trpc";

const MOCK_EXAMS = [
  {
    id: 1,
    name: "MRCGP AKT - Full Mock 1",
    exam: "MRCGP AKT",
    questions: 200,
    duration: 180,
    passMark: 72,
    completed: true,
    score: 156,
    percentage: 78,
    passed: true,
  },
  {
    id: 2,
    name: "MRCGP AKT - Full Mock 2",
    exam: "MRCGP AKT",
    questions: 200,
    duration: 180,
    passMark: 72,
    completed: false,
    score: null,
    percentage: null,
    passed: null,
  },
  {
    id: 3,
    name: "PLAB 2 - Full Mock 1",
    exam: "PLAB 2",
    questions: 150,
    duration: 120,
    passMark: 75,
    completed: true,
    score: 118,
    percentage: 79,
    passed: true,
  },
  {
    id: 4,
    name: "USMLE Step 1 - Full Mock 1",
    exam: "USMLE Step 1",
    questions: 280,
    duration: 420,
    passMark: 70,
    completed: false,
    score: null,
    percentage: null,
    passed: null,
  },
];

export default function MockExams() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Mock Exams</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Mocks Completed", value: "3", icon: CheckCircle2 },
            { label: "Average Score", value: "78.7%", icon: AlertCircle },
            { label: "Pass Rate", value: "100%", icon: CheckCircle2 },
            { label: "Total Time Spent", value: "9 hrs", icon: Clock }
          ].map((stat, idx) => (
            <Card key={idx} className="p-6 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <stat.icon className="w-10 h-10 text-teal-600 opacity-20" />
              </div>
            </Card>
          ))}
        </div>

        {/* Mocks List */}
        <div className="space-y-4">
          {MOCK_EXAMS.map((mock) => (
            <Card key={mock.id} className="p-6 border-slate-200 hover:shadow-lg transition-all">
              <div className="grid md:grid-cols-5 gap-4 items-center">
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{mock.name}</h3>
                  <p className="text-sm text-slate-600">{mock.exam}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-1">Questions</p>
                  <p className="font-bold text-slate-900">{mock.questions}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-1">Duration</p>
                  <p className="font-bold text-slate-900">{mock.duration} min</p>
                </div>
                <div className="text-center">
                  {mock.completed ? (
                    <>
                      <p className="text-sm text-slate-600 mb-1">Score</p>
                      <p className={`font-bold text-lg ${mock.passed ? "text-green-600" : "text-red-600"}`}>
                        {mock.percentage}%
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {mock.score}/{mock.questions}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600 mb-1">Status</p>
                      <p className="font-bold text-slate-900">Not Started</p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  {mock.completed ? (
                    <Button
                      onClick={() => navigate(`/mock-review/${mock.id}`)}
                      variant="outline"
                      className="w-full"
                    >
                      Review
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate(`/mock-exam/${mock.id}`)}
                      className="bg-teal-600 hover:bg-teal-700 text-white w-full gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
