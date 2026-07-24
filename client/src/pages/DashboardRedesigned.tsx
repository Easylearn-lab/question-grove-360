import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, Settings } from "lucide-react";

export default function DashboardRedesigned() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [selectedExam, setSelectedExam] = useState("MRCGP AKT");
  const [dateRange, setDateRange] = useState("1M");

  // Fetch exams and stats
  const examsQuery = trpc.dashboard.getExams.useQuery();
  const statsQuery = trpc.dashboard.getStats.useQuery(
    { examCode: "MRCGP-AKT" },
    { enabled: isAuthenticated }
  );

  const stats = statsQuery.data;

  // Define UK exams only
  const allExamsDefinition = [
    { id: "MRCGP AKT", name: "MRCGP AKT", category: "UK" },
    { id: "MRCGP SCA", name: "MRCGP SCA", category: "UK" },
    { id: "MSRA", name: "MSRA", category: "UK" },
    { id: "PLAB 1", name: "PLAB 1", category: "UK" },
    { id: "PLAB 2", name: "PLAB 2", category: "UK" },
    { id: "UKMLA", name: "UKMLA", category: "UK" },
    { id: "MRCP", name: "MRCP", category: "UK" },
  ];

  // Merge database results with fallback definitions
  const baseExams = useMemo(() => {
    const dbExamMap = new Map(
      (examsQuery.data || []).map((e) => [
        e.name,
        { ...e, id: e.name, category: e.category || "UK" },
      ])
    );

    return allExamsDefinition.map((exam) => {
      const dbExam = dbExamMap.get(exam.name);
      return {
        ...exam,
        questionCount: dbExam?.questionCount || 0,
      };
    });
  }, [examsQuery.data]);

  // Only show UK exams
  const exams = baseExams.filter((e) => e.category === "UK");

  const selectedExamData = exams.find((e) => e.id === selectedExam);
  const hasNoData = !stats || stats.totalQuestions === 0;
  const isStatsLoading = statsQuery.isLoading;

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
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name || "User"}!
            </h1>
            <p className="text-sm text-gray-600">Keep up your learning momentum</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/pricing")}
              className="text-gray-700"
            >
              Pricing
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                  {user?.name}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* UK Exams */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">UK Exams</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6">
            {exams.map((exam: any) => {
              const isMRCGPAKT = exam.id === "MRCGP AKT";
              const isMRCGPSCA = exam.id === "MRCGP SCA";
              const isMSRA = exam.id === "MSRA";
              const isActiveExam = isMRCGPAKT || isMRCGPSCA || isMSRA;
              return (
                <button
                  key={exam.id}
                  onClick={() => {
                    if (isMRCGPAKT) {
                      navigate("/mrcgp-akt");
                    } else if (isMRCGPSCA) {
                      navigate("/sca");
                    } else if (isMSRA) {
                      navigate("/msra");
                    } else {
                      setSelectedExam(exam.id);
                    }
                  }}
                  className={`p-3 rounded-lg font-medium transition-all ${
                    selectedExam === exam.id && !isActiveExam
                      ? "bg-green-600 text-gray-900 shadow-lg"
                      : "bg-white text-gray-700 border border-green-300 hover:border-green-400 hover:bg-green-50"
                  }`}
                >
                  <span className="block text-sm">{exam.name}</span>
                  {exam.questionCount === 0 &&
                    selectedExam !== exam.id &&
                    !isActiveExam && (
                      <span className="block text-[10px] text-gray-400 mt-0.5">
                        Coming soon
                      </span>
                    )}
                  {isMSRA && (
                    <span className="block text-[10px] text-gray-400 mt-0.5">
                      Coming soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>



        {/* Coming Soon state for exams with no questions */}
        {selectedExamData && selectedExamData.questionCount === 0 && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-amber-900 font-medium">
              {selectedExamData.name} is coming soon. Check back later!
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 bg-orange-50 border-orange-200">
            <div className="text-sm text-gray-600 mb-2">Study Streak</div>
            <div className="text-4xl font-bold text-orange-600">
              {isStatsLoading ? "-" : stats?.studyStreak || 0}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {isStatsLoading ? "Loading..." : "days"}
            </div>
          </Card>

          <Card className="p-6 bg-green-50 border-green-200">
            <div className="text-sm text-gray-600 mb-2">Accuracy</div>
            <div className="text-4xl font-bold text-green-600">
              {isStatsLoading ? "-" : stats?.accuracy ? `${stats.accuracy}%` : "-"}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {isStatsLoading ? "Loading..." : "overall"}
            </div>
          </Card>

          <Card className="p-6 bg-purple-50 border-purple-200">
            <div className="text-sm text-gray-600 mb-2">Questions</div>
            <div className="text-4xl font-bold text-purple-600">
              {isStatsLoading ? "-" : stats?.totalQuestions || 0}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {isStatsLoading ? "Loading..." : "today"}
            </div>
          </Card>

          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="text-sm text-gray-600 mb-2">Pass Probability</div>
            <div className="text-4xl font-bold text-blue-600">
              {isStatsLoading
                ? "-"
                : stats?.passProbability
                ? `${stats.passProbability}%`
                : "Not enough data"}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {isStatsLoading ? "Loading..." : "estimated"}
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Accuracy Trend
            </h3>
            <div className="flex gap-2 mb-6">
              {["1W", "2W", "1M", "3M", "All"].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                    dateRange === range
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <div className="h-48 flex items-center justify-center text-gray-400">
              <p>No accuracy data yet</p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Specialty Breakdown
            </h3>
            <div className="h-48 flex items-center justify-center text-gray-400">
              <p>No specialty data yet</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
