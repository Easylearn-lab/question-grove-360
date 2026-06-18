import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Brain, Zap, BarChart3, Settings, LogOut, Menu } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: profile } = trpc.profile.getProfile.useQuery();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">Question Grove 360</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user.name || user.email}</p>
              <p className="text-xs text-slate-500">{profile?.specialty || "Medical Student"}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center text-white font-bold">
              {(user.name?.[0] || user.email?.[0] || "U").toUpperCase()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="text-slate-600 hover:text-slate-900"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-slate-600 hover:text-slate-900"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome back, {user.name?.split(" ")[0]}!</h1>
          <p className="text-slate-600">Continue your journey to exam success</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Questions Answered", value: "0", icon: BookOpen },
            { label: "Current Streak", value: "0 days", icon: Zap },
            { label: "Accuracy", value: "—", icon: BarChart3 },
            { label: "Pass Probability", value: "—", icon: Brain }
          ].map((stat, idx) => (
            <Card key={idx} className="p-6 border-slate-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <stat.icon className="w-10 h-10 text-green-600 opacity-20" />
              </div>
            </Card>
          ))}
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Question Bank */}
          <Card className="p-8 border-slate-200 hover:shadow-lg transition-all cursor-pointer group" onClick={() => navigate("/questions")}>
            <div className="flex items-start justify-between mb-4">
              <BookOpen className="w-12 h-12 text-green-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">NEW</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Question Bank</h3>
            <p className="text-slate-600 mb-6">Practice with thousands of curated questions in tutor or exam mode</p>
            <Button className="bg-green-600 hover:bg-green-700 text-gray-900 w-full">
              Start Practicing
            </Button>
          </Card>

          {/* Mock Exams */}
          <Card className="p-8 border-slate-200 hover:shadow-lg transition-all cursor-pointer group" onClick={() => navigate("/mocks")}>
            <div className="flex items-start justify-between mb-4">
              <BarChart3 className="w-12 h-12 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Mock Exams</h3>
            <p className="text-slate-600 mb-6">Take full-length timed exams with detailed performance analysis</p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
              Start Mock
            </Button>
          </Card>

          {/* Note360 */}
          <Card className="p-8 border-slate-200 hover:shadow-lg transition-all cursor-pointer group" onClick={() => navigate("/notes")}>
            <div className="flex items-start justify-between mb-4">
              <BookOpen className="w-12 h-12 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Note360</h3>
            <p className="text-slate-600 mb-6">Access comprehensive, high-yield study notes organized by specialty</p>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full">
              View Notes
            </Button>
          </Card>

          {/* Pattern Recognition */}
          <Card className="p-8 border-slate-200 hover:shadow-lg transition-all cursor-pointer group" onClick={() => navigate("/flashcards")}>
            <div className="flex items-start justify-between mb-4">
              <Brain className="w-12 h-12 text-orange-600 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Pattern Recognition</h3>
            <p className="text-slate-600 mb-6">Master clinical patterns with spaced repetition flashcards</p>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white w-full">
              Start Cards
            </Button>
          </Card>
        </div>

        {/* SCA Simulator */}
        <Card className="mt-8 p-8 border-slate-200 bg-gradient-to-r from-green-50 to-blue-50 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/sca")}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6 text-green-600" />
                <span className="text-xs font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">PREMIUM</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">SCA Consultation Simulator</h3>
              <p className="text-slate-600 mb-4">Experience real-time voice-based patient consultations with instant feedback</p>
              <Button className="bg-green-600 hover:bg-green-700 text-gray-900">
                Start Simulation
              </Button>
            </div>
            <div className="hidden md:block w-32 h-32 bg-gradient-to-br from-green-200 to-blue-200 rounded-2xl opacity-20"></div>
          </div>
        </Card>

        {/* Coach360 */}
        <Card className="mt-8 p-8 border-slate-200 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/coach")}>
          <div className="flex items-start justify-between mb-4">
            <Zap className="w-12 h-12 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">AI Coach360</h3>
          <p className="text-slate-600 mb-6">Get personalized study guidance powered by your complete learning profile</p>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full">
            Chat with Coach
          </Button>
        </Card>

        {/* Pricing */}
        <Card className="mt-8 p-8 border-slate-200 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/pricing")}>
          <div className="flex items-start justify-between mb-4">
            <BarChart3 className="w-12 h-12 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Upgrade Your Plan</h3>
          <p className="text-slate-600 mb-6">Unlock premium features and accelerate your exam preparation</p>
          <Button className="bg-green-600 hover:bg-green-700 text-gray-900 w-full">
            View Plans
          </Button>
        </Card>
      </main>
    </div>
  );
}
