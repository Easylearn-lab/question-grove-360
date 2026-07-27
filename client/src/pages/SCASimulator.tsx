import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mic, MicOff, Send, Loader2, Play, Pause, RotateCcw, CheckCircle2, XCircle, MinusCircle, Clock, Volume2, BarChart3, Lock, Zap, Sparkles, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useStudySession } from "@/contexts/StudySessionContext";
import { ReconnectingBanner } from "@/components/ReconnectingBanner";
import { CrossSellGate } from "@/components/CrossSellGate";
import { useExamAccess } from "@/hooks/useExamAccess";
import { PatientAvatar, detectEmotion, getEmotionConfig, EmotionTimeline, calculateEmpathyScore, type EmotionalState, type EmotionHistoryEntry } from "@/components/PatientAvatar";

// ============================================================
// TYPES
// ============================================================
interface ScaCase {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  presentingComplaint: string;
  isFreeTrialCase?: boolean;
  createdAt?: string;
}

// Difficulty filter labels mapped to DB values
const DIFFICULTY_LABELS: Record<string, string> = {
  all: "All",
  Easy: "Foundation",
  Medium: "Standard",
  Hard: "Advanced",
};

interface FullCase extends ScaCase {
  backgroundContext: string;
  aiPatientPersona: any;
  markSheet: any;
  examinationFindings: any;
  investigationResults: any;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  audioUrl?: string;
}

type CompetencyScore = "well" | "partial" | "poor";

// ============================================================
// VOICE PROFILE MAPPING
// ============================================================
function getVoiceProfile(age: number, gender: string): { voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"; label: string } {
  const isFemale = gender?.toLowerCase() === "female";
  const isElderly = age >= 60;
  const isYoung = age <= 30;

  // Female profiles
  if (isFemale && isElderly) {
    return { voice: "shimmer", label: "Elderly female (concerned, gentle)" };
  }
  if (isFemale) {
    return { voice: "nova", label: "Middle-aged female (anxious, emotional)" };
  }
  // Male profiles
  if (isElderly) {
    return { voice: "onyx", label: "Elderly male (calm, stoic)" };
  }
  if (isYoung) {
    return { voice: "echo", label: "Young adult male (guarded, embarrassed)" };
  }
  return { voice: "alloy", label: "Middle-aged male (practical, direct)" };
}

// ============================================================
// CATEGORY COLORS
// ============================================================
const CATEGORY_COLORS: Record<string, string> = {
  "Mental Health": "bg-purple-100 text-purple-700 border-purple-200",
  "Cardiovascular Health": "bg-red-100 text-red-700 border-red-200",
  "Musculoskeletal Health": "bg-orange-100 text-orange-700 border-orange-200",
  "Respiratory Health": "bg-blue-100 text-blue-700 border-blue-200",
  "Gynaecology and Breast": "bg-pink-100 text-pink-700 border-pink-200",
  "Neurology": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Dermatology": "bg-amber-100 text-amber-700 border-amber-200",
  "Endocrinology": "bg-teal-100 text-teal-700 border-teal-200",
  "Gastroenterology": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Paediatrics": "bg-green-100 text-green-700 border-green-200",
  "ENT": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Ophthalmology": "bg-sky-100 text-sky-700 border-sky-200",
  "Renal and Urology": "bg-lime-100 text-lime-700 border-lime-200",
  "Urgent and Unscheduled Care": "bg-rose-100 text-rose-700 border-rose-200",
  "Metabolic Problems and Endocrinology": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Smoking, Alcohol and Substance Misuse": "bg-slate-100 text-slate-700 border-slate-200",
  "Allergy and Clinical Immunology": "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "Ear, Nose and Throat, Speech and Hearing": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Eyes and Vision": "bg-sky-100 text-sky-700 border-sky-200",
  "Genomic Medicine": "bg-violet-100 text-violet-700 border-violet-200",
  "Haematology": "bg-red-100 text-red-700 border-red-200",
  "Infectious Diseases and Travel Health": "bg-amber-100 text-amber-700 border-amber-200",
  "Learning Disability": "bg-teal-100 text-teal-700 border-teal-200",
  "Maternity and Reproductive Health": "bg-pink-100 text-pink-700 border-pink-200",
  "Neurodevelopmental Conditions and Neurodiversity": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Sexual Health": "bg-rose-100 text-rose-700 border-rose-200",
  "LGBTQ+ Health": "bg-violet-100 text-violet-700 border-violet-200",
  "Long COVID": "bg-orange-100 text-orange-700 border-orange-200",
  "Transgender Health": "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "Refugee Health": "bg-amber-100 text-amber-700 border-amber-200",
  "Occupational Health": "bg-lime-100 text-lime-700 border-lime-200",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-green-100 text-green-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Hard: "bg-red-100 text-red-700",
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SCASimulator() {
  const { user, isAuthenticated } = useAuth();
  const { hasAccess: isPremium, isLoading: subLoading } = useExamAccess("SCA");
  const [, navigate] = useLocation();
  const { startStudySession, endStudySession } = useStudySession();

  // Register study session to prevent auth redirects during consultation
  useEffect(() => {
    startStudySession("sca-simulator");
    return () => { endStudySession(); };
  }, []);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [phase, setPhase] = useState<"browse" | "case" | "consultation" | "scoring" | "debrief">("browse");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [isFreeTrial, setIsFreeTrial] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Show success toast when returning from Stripe payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success("Welcome to SCA Simulator — your subscription is active. Start practising now.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    // Handle retry deep-link from history page
    const retryCaseId = params.get("retry");
    if (retryCaseId) {
      const caseId = parseInt(retryCaseId, 10);
      if (!isNaN(caseId)) {
        setSelectedCaseId(caseId);
        setPhase("case");
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  // Auto-trigger Stripe checkout if returning from login with pending purchase
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();
  useEffect(() => {
    const pendingPlan = localStorage.getItem("sca_pending_purchase");
    if (pendingPlan && isAuthenticated && !subLoading) {
      localStorage.removeItem("sca_pending_purchase");
      toast.info("Resuming your purchase...");
      createCheckout.mutateAsync({ planKey: pendingPlan })
        .then((result) => {
          if (result.url) {
            window.location.href = result.url;
          }
        })
        .catch((err) => {
          console.error("Auto-checkout failed:", err);
          toast.error("Failed to resume checkout. Please try subscribing again from the Pricing page.");
        });
    }
  }, [isAuthenticated, subLoading]);

  // Fetch all cases
  const casesQuery = trpc.sca.getCases.useQuery();

  // Fetch attempted case IDs for completion tracking (subscribers only)
  const attemptedQuery = trpc.sca.getAttemptedCaseIds.useQuery(undefined, {
    enabled: isPremium && isAuthenticated,
  });
  const attemptedCaseIds = useMemo(() => new Set(attemptedQuery.data || []), [attemptedQuery.data]);

  // Fetch full case when selected
  const fullCaseQuery = trpc.sca.getCaseById.useQuery(
    { caseId: selectedCaseId!, isFreeTrial },
    { enabled: !!selectedCaseId && isAuthenticated }
  );

  const categories = useMemo(() => {
    if (!casesQuery.data) return [];
    const cats = Array.from(new Set(casesQuery.data.map((c: ScaCase) => c.category)));
    return cats.sort();
  }, [casesQuery.data]);

  const filteredCases = useMemo(() => {
    if (!casesQuery.data) return [];
    let cases = casesQuery.data;
    if (categoryFilter !== "all") {
      cases = cases.filter((c: ScaCase) => c.category === categoryFilter);
    }
    if (difficultyFilter !== "all") {
      cases = cases.filter((c: ScaCase) => c.difficulty === difficultyFilter);
    }
    return cases;
  }, [casesQuery.data, categoryFilter, difficultyFilter]);

  // Check if a case is "new" (created in last 14 days)
  const isNewCase = useCallback((createdAt?: string) => {
    if (!createdAt) return false;
    const created = new Date(createdAt);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return created > fourteenDaysAgo;
  }, []);

  const handleSelectCase = (caseId: number, freeTrialCase?: boolean) => {
    if (!isAuthenticated) {
      toast.error("Please log in to access SCA cases");
      return;
    }
    // If user doesn't have premium and this isn't a free trial case, block
    if (!isPremium && !freeTrialCase) {
      toast.error("Subscribe to unlock all cases");
      return;
    }
    setIsFreeTrial(!isPremium && !!freeTrialCase);
    setSelectedCaseId(caseId);
    setPhase("case");
  };

  const handleStartConsultation = () => {
    setPhase("consultation");
  };

  const handleFinishConsultation = () => {
    setPhase("scoring");
  };

  const handleFinishScoring = () => {
    setPhase("debrief");
  };

  const handleBackToBrowse = () => {
    setSelectedCaseId(null);
    setPhase("browse");
  };

  // ============================================================
  // BROWSE PHASE - Case Grid
  // ============================================================
  if (phase === "browse") {
    // Determine if user is in "free trial preview" mode (logged in, no SCA subscription)
    const isFreeTrialPreview = isAuthenticated && !isPremium && !subLoading;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <ReconnectingBanner />
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">SCA Consultation Simulator</h1>
                <p className="text-sm text-slate-500">60 RCGP-mapped cases with AI patient roleplay</p>
              </div>
            </div>
            {isPremium ? (
              <Button variant="outline" size="sm" onClick={() => navigate("/sca/history")} className="gap-1.5 text-slate-700">
                <BarChart3 className="w-4 h-4" />
                My Progress
              </Button>
            ) : (
              <FreeTrialSubscribeButtons />
            )}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* For non-subscribers who are logged in: show the case grid with free trial logic */}
          {isFreeTrialPreview ? (
            <>
              {/* Preview banner */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  You are previewing the free trial case. Subscribe to unlock all 60 cases and track your progress.
                </p>
              </div>

              {/* Difficulty Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={difficultyFilter === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDifficultyFilter(key)}
                    className={difficultyFilter === key ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-8">
                <Button
                  variant={categoryFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("all")}
                  className={categoryFilter === "all" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  All ({casesQuery.data?.length || 0})
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={categoryFilter === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter(cat)}
                    className={categoryFilter === cat ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {cat} ({casesQuery.data?.filter((c: ScaCase) => c.category === cat).length})
                  </Button>
                ))}
              </div>

              {/* Cases Grid with free trial logic */}
              {casesQuery.isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCases.map((caseItem: ScaCase) => {
                    const isTrial = !!caseItem.isFreeTrialCase;
                    const isNew = isNewCase(caseItem.createdAt);
                    return (
                      <Card
                        key={caseItem.id}
                        className={`p-6 transition-all relative ${
                          isTrial
                            ? "border-green-300 hover:shadow-lg hover:border-green-400 cursor-pointer group bg-white"
                            : "border-slate-200 opacity-60 cursor-not-allowed bg-slate-50"
                        }`}
                        onClick={() => isTrial ? handleSelectCase(caseItem.id, true) : toast.error("Subscribe to unlock this case")}
                      >
                        {isNew && (
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">New</Badge>
                          </div>
                        )}
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-mono text-slate-400">#{caseItem.id}</span>
                            <Badge variant="outline" className={DIFFICULTY_COLORS[caseItem.difficulty] || ""}>
                              {caseItem.difficulty}
                            </Badge>
                            {isTrial ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                <Sparkles className="w-3 h-3 mr-1" /> Try Free
                              </Badge>
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                          <h3 className={`text-lg font-bold mb-2 transition-colors ${
                            isTrial ? "text-slate-900 group-hover:text-green-700" : "text-slate-500"
                          }`}>
                            {caseItem.title}
                          </h3>
                          <Badge variant="outline" className={CATEGORY_COLORS[caseItem.category] || "bg-slate-100 text-slate-700"}>
                            {caseItem.category}
                          </Badge>
                        </div>
                        <p className={`text-sm mb-4 line-clamp-2 ${isTrial ? "text-slate-600" : "text-slate-400"}`}>
                          {caseItem.presentingComplaint}
                        </p>
                        <div className={`flex items-center gap-2 text-xs ${isTrial ? "text-slate-500" : "text-slate-400"}`}>
                          <span>{caseItem.patientName}</span>
                          <span>•</span>
                          <span>{caseItem.patientAge}y {caseItem.patientGender}</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* For subscribers: full access grid wrapped in CrossSellGate (handles AKT-only users) */
            <CrossSellGate hasAccess={isPremium} requiredTrack="SCA" featureName="SCA Consultation Simulator">
              {/* Progress Counter */}
              {isPremium && casesQuery.data && (
                <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{attemptedCaseIds.size} of {casesQuery.data.length} cases attempted</span>
                </div>
              )}

              {/* Difficulty Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={difficultyFilter === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDifficultyFilter(key)}
                    className={difficultyFilter === key ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-8">
                <Button
                  variant={categoryFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("all")}
                  className={categoryFilter === "all" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  All ({casesQuery.data?.length || 0})
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={categoryFilter === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter(cat)}
                    className={categoryFilter === cat ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {cat} ({casesQuery.data?.filter((c: ScaCase) => c.category === cat).length})
                  </Button>
                ))}
              </div>

              {/* Cases Grid */}
              {casesQuery.isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCases.map((caseItem: ScaCase) => {
                    const isAttempted = attemptedCaseIds.has(caseItem.id);
                    const isNew = isNewCase(caseItem.createdAt);
                    return (
                      <Card
                        key={caseItem.id}
                        className={`p-6 border-slate-200 hover:shadow-lg hover:border-green-200 transition-all cursor-pointer group relative ${
                          isAttempted ? "border-green-100 bg-green-50/30" : ""
                        }`}
                        onClick={() => handleSelectCase(caseItem.id)}
                      >
                        {/* New badge */}
                        {isNew && (
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">New</Badge>
                          </div>
                        )}
                        {/* Completion checkmark */}
                        {isAttempted && !isNew && (
                          <div className="absolute top-3 right-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          </div>
                        )}
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-mono text-slate-400">#{caseItem.id}</span>
                            <Badge variant="outline" className={DIFFICULTY_COLORS[caseItem.difficulty] || ""}>
                              {caseItem.difficulty}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-green-700 transition-colors">
                            {caseItem.title}
                          </h3>
                          <Badge variant="outline" className={CATEGORY_COLORS[caseItem.category] || "bg-slate-100 text-slate-700"}>
                            {caseItem.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{caseItem.presentingComplaint}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{caseItem.patientName}</span>
                          <span>•</span>
                          <span>{caseItem.patientAge}y {caseItem.patientGender}</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CrossSellGate>
          )}
        </main>
      </div>
    );
  }

  // ============================================================
  // CASE / CONSULTATION / SCORING / DEBRIEF PHASES
  // ============================================================
  if (!fullCaseQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <CaseView
      caseData={fullCaseQuery.data as FullCase}
      phase={phase}
      onStartConsultation={handleStartConsultation}
      onFinishConsultation={handleFinishConsultation}
      onFinishScoring={handleFinishScoring}
      onBack={handleBackToBrowse}
      userId={user?.id}
      isFreeTrial={isFreeTrial}
    />
  );
}

// ============================================================
// CASE VIEW - 5-tab interface + consultation + scoring + debrief
// ============================================================
function CaseView({
  caseData,
  phase,
  onStartConsultation,
  onFinishConsultation,
  onFinishScoring,
  onBack,
  userId,
  isFreeTrial = false,
}: {
  caseData: FullCase;
  phase: "case" | "consultation" | "scoring" | "debrief";
  onStartConsultation: () => void;
  onFinishConsultation: () => void;
  onFinishScoring: () => void;
  onBack: () => void;
  userId?: number;
  isFreeTrial?: boolean;
}) {
  const SCA_STORAGE_KEY = `sca-consultation-${caseData.id}`;
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [activeTab, setActiveTab] = useState("briefing");
  const [messages, setMessages] = useState<Message[]>([]);
  const [competencyScores, setCompetencyScores] = useState<Record<string, CompetencyScore>>({});
  const [consultationDuration, setConsultationDuration] = useState(0);
  const [emotionHistory, setEmotionHistory] = useState<EmotionHistoryEntry[]>([]);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(720); // 12 minutes
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [resumedFromStorage, setResumedFromStorage] = useState(false);

  // ---- SCA TRANSCRIPT PERSISTENCE ----
  // Check for saved consultation on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SCA_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        // Only offer resume if there are actual messages and it's less than 4 hours old
        if (data.messages?.length > 0 && Date.now() - (data.savedAt || 0) < 4 * 60 * 60 * 1000) {
          setShowResumePrompt(true);
        } else {
          localStorage.removeItem(SCA_STORAGE_KEY);
        }
      }
    } catch {}
  }, []);

  // Save consultation state to localStorage on every message change
  useEffect(() => {
    if (messages.length > 0 && (phase === "consultation" || phase === "scoring")) {
      try {
        localStorage.setItem(SCA_STORAGE_KEY, JSON.stringify({
          messages,
          timerSeconds,
          emotionHistory,
          consultationDuration,
          phase,
          savedAt: Date.now(),
        }));
      } catch {}
    }
  }, [messages, timerSeconds, emotionHistory, phase]);

  // Also save on beforeunload
  useEffect(() => {
    const handleUnload = () => {
      if (messages.length > 0 && (phase === "consultation" || phase === "scoring")) {
        try {
          localStorage.setItem(SCA_STORAGE_KEY, JSON.stringify({
            messages,
            timerSeconds,
            emotionHistory,
            consultationDuration,
            phase,
            savedAt: Date.now(),
          }));
        } catch {}
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [messages, timerSeconds, emotionHistory, phase]);

  // Clear saved state when debrief is reached (consultation completed)
  useEffect(() => {
    if (phase === "debrief") {
      try { localStorage.removeItem(SCA_STORAGE_KEY); } catch {}
    }
  }, [phase]);

  const handleResumeSCA = () => {
    try {
      const saved = localStorage.getItem(SCA_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setMessages(data.messages || []);
        setTimerSeconds(data.timerSeconds ?? 720);
        setEmotionHistory(data.emotionHistory || []);
        setConsultationDuration(data.consultationDuration || 0);
        setResumedFromStorage(true);
        // Move to consultation phase if we were mid-consultation
        if (data.phase === "consultation" || data.phase === "scoring") {
          onStartConsultation();
        }
      }
    } catch {}
    setShowResumePrompt(false);
  };

  const handleStartFreshSCA = () => {
    try { localStorage.removeItem(SCA_STORAGE_KEY); } catch {}
    setShowResumePrompt(false);
  };

  // Voice state
  const voiceProfile = getVoiceProfile(caseData.patientAge, caseData.patientGender);

  // Timer logic
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            toast.info("Time's up! Please proceed to the Mark Scheme to score your consultation.", { duration: 5000 });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerSeconds]);

  // Track consultation duration
  useEffect(() => {
    if (phase === "consultation" && timerRunning) {
      setConsultationDuration(720 - timerSeconds);
    }
  }, [phase, timerRunning, timerSeconds]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleTimerStart = () => setTimerRunning(true);
  const handleTimerPause = () => setTimerRunning(false);
  const handleTimerReset = () => {
    setTimerRunning(false);
    setTimerSeconds(720);
  };

  // ============================================================
  // CASE PREPARATION PHASE (5 tabs)
  // ============================================================
  if (phase === "case") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{caseData.title}</h1>
                <p className="text-sm text-slate-500">{caseData.category} • {caseData.difficulty}</p>
              </div>
            </div>
            <Button onClick={onStartConsultation} className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <Play className="w-4 h-4" /> Start Consultation
            </Button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-8">
              <TabsTrigger value="briefing">Doctor Briefing</TabsTrigger>
              <TabsTrigger value="patient">Patient Script</TabsTrigger>
              <TabsTrigger value="markscheme">Mark Scheme</TabsTrigger>
              <TabsTrigger value="keyissues">Key Issues</TabsTrigger>
              <TabsTrigger value="management">Management</TabsTrigger>
            </TabsList>

            <TabsContent value="briefing">
              <DoctorBriefingTab caseData={caseData} />
            </TabsContent>
            <TabsContent value="patient">
              <PatientScriptTab persona={caseData.aiPatientPersona} />
            </TabsContent>
            <TabsContent value="markscheme">
              <MarkSchemeViewTab markSheet={caseData.markSheet} />
            </TabsContent>
            <TabsContent value="keyissues">
              <KeyIssuesTab markSheet={caseData.markSheet} caseData={caseData} />
            </TabsContent>
            <TabsContent value="management">
              <ManagementTab caseData={caseData} />
            </TabsContent>
          </Tabs>
        </main>

        {/* Resume prompt for interrupted SCA consultations */}
        {showResumePrompt && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="p-8 max-w-md w-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <RotateCcw className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Resume Previous Consultation?</h3>
                <p className="text-slate-600 mb-6">
                  You have a saved consultation for this case. Would you like to resume where you left off?
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleStartFreshSCA}
                    className="flex-1"
                  >
                    Start Fresh
                  </Button>
                  <Button
                    onClick={handleResumeSCA}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Resume
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // CONSULTATION PHASE
  // ============================================================
  if (phase === "consultation") {
    return (
      <ConsultationView
        caseData={caseData}
        messages={messages}
        setMessages={setMessages}
        voiceProfile={voiceProfile}
        timerSeconds={timerSeconds}
        timerRunning={timerRunning}
        onTimerStart={handleTimerStart}
        onTimerPause={handleTimerPause}
        onTimerReset={handleTimerReset}
        formatTime={formatTime}
        emotionHistory={emotionHistory}
        setEmotionHistory={setEmotionHistory}
        onFinish={() => {
          setConsultationDuration(720 - timerSeconds);
          onFinishConsultation();
        }}
      />
    );
  }

  // ============================================================
  // SCORING PHASE
  // ============================================================
  if (phase === "scoring") {
    return (
      <ScoringView
        caseData={caseData}
        competencyScores={competencyScores}
        setCompetencyScores={setCompetencyScores}
        onFinish={onFinishScoring}
        onBack={() => {/* can't go back from scoring */}}
      />
    );
  }

  // ============================================================
  // DEBRIEF PHASE
  // ============================================================
  return (
    <DebriefView
      caseData={caseData}
      competencyScores={competencyScores}
      messages={messages}
      duration={consultationDuration}
      userId={userId}
      isFreeTrial={isFreeTrial}
      emotionHistory={emotionHistory}
      onBack={onBack}
    />
  );
}

// ============================================================
// TAB: Doctor Briefing
// ============================================================
function DoctorBriefingTab({ caseData }: { caseData: FullCase }) {
  return (
    <div className="space-y-6">
      <Card className="p-6 border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Patient Information</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Name</p>
            <p className="font-semibold text-slate-900">{caseData.patientName}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Age</p>
            <p className="font-semibold text-slate-900">{caseData.patientAge} years</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Gender</p>
            <p className="font-semibold text-slate-900">{caseData.patientGender}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-3">Presenting Complaint</h3>
        <p className="text-slate-700">{caseData.presentingComplaint}</p>
      </Card>

      <Card className="p-6 border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-3">Background Context</h3>
        <p className="text-slate-700 whitespace-pre-wrap">{caseData.backgroundContext}</p>
      </Card>

      {caseData.examinationFindings && (
        <Card className="p-6 border-blue-100 bg-blue-50">
          <h3 className="text-lg font-bold text-blue-900 mb-3">Examination Findings</h3>
          <p className="text-blue-800">{caseData.examinationFindings?.offered || JSON.stringify(caseData.examinationFindings)}</p>
        </Card>
      )}

      {caseData.investigationResults && (
        <Card className="p-6 border-amber-100 bg-amber-50">
          <h3 className="text-lg font-bold text-amber-900 mb-3">Investigation Results</h3>
          <p className="text-amber-800">{caseData.investigationResults?.available || JSON.stringify(caseData.investigationResults)}</p>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// TAB: Patient Script
// ============================================================
function PatientScriptTab({ persona }: { persona: any }) {
  if (!persona) return <Card className="p-6"><p className="text-slate-500">No patient persona data available.</p></Card>;

  // Extract opening sentence from character
  const characterText = persona.character || "";
  const openingSentenceMatch = characterText.match(/Opening sentence:\s*(.+?)(?:"|$)/i);
  const openingSentence = openingSentenceMatch ? openingSentenceMatch[1].trim() : "";

  // Extract ICE from character text
  const iceMatch = characterText.match(/ICE:[\s\S]*?(.+?)(?:Opening sentence|$)/i);
  const iceText = iceMatch ? iceMatch[1].trim() : "";

  return (
    <div className="space-y-6">
      {openingSentence && (
        <Card className="p-6 border-green-200 bg-green-50">
          <h3 className="text-lg font-bold text-green-900 mb-2">Opening Sentence</h3>
          <p className="text-green-800 italic text-lg">"{openingSentence}"</p>
        </Card>
      )}

      <Card className="p-6 border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-3">Character & Behaviour</h3>
        <p className="text-slate-700 whitespace-pre-wrap">{characterText}</p>
      </Card>

      <Card className="p-6 border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-3">What Patient Will Share Openly</h3>
        <p className="text-slate-700 whitespace-pre-wrap">{persona.openHistory}</p>
      </Card>

      {persona.historyIfAsked && (
        <Card className="p-6 border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-3">History If Asked</h3>
          <div className="space-y-3">
            {Object.entries(persona.historyIfAsked).map(([key, value]) => (
              <div key={key} className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1 font-semibold">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p className="text-slate-700">{value as string}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {iceText && (
        <Card className="p-6 border-purple-100 bg-purple-50">
          <h3 className="text-lg font-bold text-purple-900 mb-3">ICE (Ideas, Concerns, Expectations)</h3>
          <p className="text-purple-800 whitespace-pre-wrap">{iceText}</p>
        </Card>
      )}

      <Card className="p-6 border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-3">Social History</h3>
        <p className="text-slate-700">{persona.socialHistory}</p>
      </Card>

      <Card className="p-6 border-orange-100 bg-orange-50">
        <h3 className="text-lg font-bold text-orange-900 mb-3">How to React</h3>
        <p className="text-orange-800 whitespace-pre-wrap">{persona.howToReact}</p>
      </Card>
    </div>
  );
}

// ============================================================
// TAB: Mark Scheme (View only - before consultation)
// ============================================================
function MarkSchemeViewTab({ markSheet }: { markSheet: any }) {
  if (!markSheet) return <Card className="p-6"><p className="text-slate-500">No mark scheme data available.</p></Card>;

  const domains = [markSheet.domain1, markSheet.domain2, markSheet.domain3].filter(Boolean);

  return (
    <div className="space-y-6">
      {domains.map((domain: any, idx: number) => (
        <Card key={idx} className="p-6 border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Domain {idx + 1}: {domain.name}
          </h3>
          <div className="space-y-4">
            {domain.competencies?.map((comp: any) => (
              <div key={comp.id} className="border border-slate-100 rounded-lg p-4">
                <p className="text-xs font-mono text-slate-400 mb-2">{comp.id}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-green-600 font-semibold mb-1">Done Well</p>
                    <p className="text-sm text-green-800">{comp.doneWell}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <p className="text-xs text-red-600 font-semibold mb-1">Done Poorly</p>
                    <p className="text-sm text-red-800">{comp.donePoorly}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// TAB: Key Issues
// ============================================================
function KeyIssuesTab({ markSheet, caseData }: { markSheet: any; caseData: FullCase }) {
  if (!markSheet) return <Card className="p-6"><p className="text-slate-500">No key issues data available.</p></Card>;

  const domains = [markSheet.domain1, markSheet.domain2, markSheet.domain3].filter(Boolean);

  return (
    <div className="space-y-6">
      <Card className="p-6 border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Key Issues & RCGP Mapping</h3>
        <p className="text-sm text-slate-600 mb-6">
          This case maps to the RCGP Clinical Assessment curriculum. Below are the key issues the examiner is looking for.
        </p>
        <div className="space-y-4">
          {domains.map((domain: any, idx: number) => (
            <div key={idx} className="border border-slate-100 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">
                Domain {idx + 1}: {domain.name}
              </h4>
              <div className="space-y-2">
                {domain.competencies?.map((comp: any) => (
                  <div key={comp.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                    <Badge variant="outline" className="text-xs shrink-0">{comp.id}</Badge>
                    <p className="text-sm text-slate-700">{comp.doneWell}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 border-indigo-100 bg-indigo-50">
        <h3 className="text-lg font-bold text-indigo-900 mb-3">RCGP Curriculum Relevance</h3>
        <p className="text-indigo-800">
          <strong>Category:</strong> {caseData.category}<br />
          <strong>Difficulty:</strong> {caseData.difficulty}<br />
          <strong>Key presentation:</strong> {caseData.presentingComplaint}
        </p>
      </Card>
    </div>
  );
}

// ============================================================
// TAB: Management
// ============================================================
function ManagementTab({ caseData }: { caseData: FullCase }) {
  return (
    <div className="space-y-6">
      {caseData.investigationResults && (
        <Card className="p-6 border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-3">Investigation Results</h3>
          {typeof caseData.investigationResults === "object" ? (
            <div className="space-y-3">
              {Object.entries(caseData.investigationResults).map(([key, value]) => (
                <div key={key} className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1 font-semibold">{key}</p>
                  <p className="text-slate-700">{value as string}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-700">{String(caseData.investigationResults)}</p>
          )}
        </Card>
      )}

      {caseData.examinationFindings && (
        <Card className="p-6 border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-3">Examination Findings</h3>
          {typeof caseData.examinationFindings === "object" ? (
            <div className="space-y-3">
              {Object.entries(caseData.examinationFindings).map(([key, value]) => (
                <div key={key} className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1 font-semibold">{key}</p>
                  <p className="text-slate-700">{value as string}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-700">{String(caseData.examinationFindings)}</p>
          )}
        </Card>
      )}

      <Card className="p-6 border-green-100 bg-green-50">
        <h3 className="text-lg font-bold text-green-900 mb-3">Consultation Pointers</h3>
        <ul className="space-y-2 text-green-800">
          <li>• Establish rapport and set the agenda collaboratively</li>
          <li>• Use open questions before closed questions</li>
          <li>• Explore the patient's ICE (Ideas, Concerns, Expectations)</li>
          <li>• Safety-net appropriately with clear follow-up instructions</li>
          <li>• Summarise and check understanding before closing</li>
        </ul>
      </Card>
    </div>
  );
}

// ============================================================
// CONSULTATION VIEW
// ============================================================
function ConsultationView({
  caseData,
  messages,
  setMessages,
  voiceProfile,
  timerSeconds,
  timerRunning,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  formatTime,
  emotionHistory,
  setEmotionHistory,
  onFinish,
}: {
  caseData: FullCase;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  voiceProfile: { voice: string; label: string };
  timerSeconds: number;
  timerRunning: boolean;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerReset: () => void;
  formatTime: (s: number) => string;
  emotionHistory: EmotionHistoryEntry[];
  setEmotionHistory: React.Dispatch<React.SetStateAction<EmotionHistoryEntry[]>>;
  onFinish: () => void;
}) {
  const [manualInput, setManualInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);
  const [speechSpeed, setSpeechSpeed] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("sca-speech-speed") || "1.0") || 1.0; } catch { return 1.0; }
  });
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [voiceMode, setVoiceMode] = useState<boolean>(() => {
    try { return localStorage.getItem("sca-voice-mode") === "true"; } catch { return false; }
  });

  const toggleMode = () => {
    const newMode = !voiceMode;
    setVoiceMode(newMode);
    try { localStorage.setItem("sca-voice-mode", String(newMode)); } catch {}
  };

  // Detect emotional state from last assistant message
  const [currentEmotion, setCurrentEmotion] = useState<EmotionalState>("neutral");
  const consultationStartRef = useRef<number>(Date.now());

  useEffect(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    if (lastAssistant) {
      const newEmotion = detectEmotion(lastAssistant.content);
      if (newEmotion !== currentEmotion) {
        const elapsedSeconds = Math.floor((Date.now() - consultationStartRef.current) / 1000);
        setEmotionHistory(prev => [
          ...prev,
          { emotion: newEmotion, timestamp: elapsedSeconds, messageIndex: messages.length - 1 }
        ]);
        // Show body language cue as a 3-second toast notification
        const newConfig = getEmotionConfig(newEmotion);
        toast(newConfig.bodyLanguage, {
          duration: 3000,
          icon: "👁️",
          style: { borderLeft: `4px solid ${newConfig.color}` },
        });
      }
      setCurrentEmotion(newEmotion);
    }
  }, [messages]);
  const emotionConfig = getEmotionConfig(currentEmotion);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const webSpeechSupported = useRef<boolean>(false);

  const generateResponseMutation = trpc.sca.generatePatientResponse.useMutation();
  const uploadAudioMutation = trpc.voice.uploadAudio.useMutation();
  const transcribeMutation = trpc.voice.transcribe.useMutation();
  const synthesizeMutation = trpc.voice.synthesize.useMutation();

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    webSpeechSupported.current = !!SpeechRecognition;
  }, []);

  // Unlock audio on first user interaction (mobile requirement)
  useEffect(() => {
    const unlock = () => {
      if (audioRef.current && !audioUnlocked) {
        // Play a silent buffer to unlock audio context on mobile
        audioRef.current.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+1DEAAAB8ANoAAAAACIADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+1DEQQAADIAAAAAAAAADIAAAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";
        audioRef.current.play().then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
          setAudioUnlocked(true);
        }).catch(() => {});
      }
    };
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("click", unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
  }, [audioUnlocked]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Get opening statement on first render (skip if resumed from localStorage)
  useEffect(() => {
    if (messages.length === 0) {
      getOpeningStatement();
    }
  }, []);

  const getOpeningStatement = async () => {
    setIsLoading(true);
    try {
      const response = await generateResponseMutation.mutateAsync({
        caseId: caseData.id,
        userMessage: "",
        conversationHistory: [],
        isFirstMessage: true,
      });
      setMessages([{ role: "assistant", content: response.response, timestamp: Date.now() }]);
      onTimerStart();
      speakText(response.response);
    } catch (err) {
      toast.error("Failed to start consultation");
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      setIsSpeaking(true);
      const result = await synthesizeMutation.mutateAsync({
        text,
        voice: voiceProfile.voice as any,
        speed: speechSpeed,
      });
      setLastAudioUrl(result.url);
      // Store audioUrl on the last assistant message for replay
      setMessages((prev) => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].role === "assistant" && updated[i].content === text) {
            updated[i] = { ...updated[i], audioUrl: result.url };
            break;
          }
        }
        return updated;
      });
      if (audioRef.current) {
        audioRef.current.src = result.url;
        audioRef.current.onended = () => setIsSpeaking(false);
        audioRef.current.onerror = () => setIsSpeaking(false);
        const playPromise = audioRef.current.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Auto-play blocked (mobile) — show replay button
            setIsSpeaking(false);
            toast.info("Tap the speaker icon to hear the patient's response");
          });
        }
      } else {
        setIsSpeaking(false);
      }
    } catch {
      setIsSpeaking(false);
    }
  };

  const replayLastAudio = () => {
    if (audioRef.current && lastAudioUrl) {
      audioRef.current.src = lastAudioUrl;
      audioRef.current.onended = () => setIsSpeaking(false);
      setIsSpeaking(true);
      audioRef.current.play().catch(() => setIsSpeaking(false));
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || manualInput;
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setManualInput("");
    setLiveTranscript("");
    setIsLoading(true);

    try {
      const response = await generateResponseMutation.mutateAsync({
        caseId: caseData.id,
        userMessage: messageText.trim(),
        conversationHistory: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        isFirstMessage: false,
      });
      const assistantMsg: Message = { role: "assistant", content: response.response, timestamp: Date.now() };
      setMessages((prev) => [...prev, assistantMsg]);
      speakText(response.response);
    } catch (err: any) {
      toast.error(err.message || "Failed to get patient response");
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Web Speech API (browser-native, real-time) ----
  const startWebSpeechRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      setLiveTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      console.warn("[WebSpeech] Error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Please allow microphone permissions.");
      }
      setIsRecording(false);
      setLiveTranscript("");
    };

    recognition.onend = () => {
      // Only send if we have a final transcript and recording was intentionally stopped
      if (finalTranscript.trim() && !isRecording) {
        handleSendMessage(finalTranscript.trim());
      }
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    return true;
  };

  const stopWebSpeechRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(false); // Set before stop so onend knows it was intentional
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  // ---- Whisper fallback (MediaRecorder → upload → transcribe) ----
  const startWhisperRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(",")[1];
            if (!base64) { setIsTranscribing(false); return; }
            try {
              const upload = await uploadAudioMutation.mutateAsync({ audioBase64: base64, mimeType: "audio/webm" });
              const transcription = await transcribeMutation.mutateAsync({ audioUrl: upload.url, language: "en" });
              if (transcription.text) {
                handleSendMessage(transcription.text);
              } else {
                toast.error("No speech detected. Please try again.");
              }
            } catch (err: any) {
              toast.error(err.message || "Transcription failed");
            } finally {
              setIsTranscribing(false);
            }
          };
          reader.readAsDataURL(audioBlob);
        } catch {
          setIsTranscribing(false);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Unable to access microphone. Please check permissions.");
    }
  };

  const stopWhisperRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ---- Unified start/stop recording ----
  const startRecording = () => {
    // Try Web Speech API first (faster, real-time)
    if (webSpeechSupported.current) {
      const started = startWebSpeechRecording();
      if (started) return;
    }
    // Fallback to Whisper
    startWhisperRecording();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      stopWebSpeechRecording();
    } else {
      stopWhisperRecording();
    }
  };

  // Last assistant message for Voice Mode display
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");
  const lastUserMessage = [...messages].reverse().find(m => m.role === "user");

  // Voice Mode UI
  if (voiceMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        {/* Voice Mode Header */}
        <header className="px-4 py-4 flex items-center justify-between z-40">
          <div>
            <h1 className="text-lg font-bold text-white">{caseData.title}</h1>
            <p className="text-sm text-slate-400">{caseData.patientName} • {voiceProfile.label}</p>
            {emotionConfig.label && (
              <p className="text-xs mt-0.5" style={{ color: emotionConfig.color }}>{caseData.patientName} — {emotionConfig.label}</p>
            )}
            <p className="text-xs italic text-slate-400 mt-0.5 transition-all duration-[600ms] ease-in-out">{emotionConfig.bodyLanguage}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleMode}
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-700 gap-1.5"
              title="Switch to Chat Mode"
            >
              <MessageSquare className="w-4 h-4" /> Chat
            </Button>
            <Button onClick={onFinish} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              End & Score
            </Button>
          </div>
        </header>

        {/* Timer */}
        <div className="px-4 flex items-center justify-center gap-3 py-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className={`font-mono text-2xl font-bold ${timerSeconds <= 60 ? "text-red-400" : timerSeconds <= 180 ? "text-yellow-400" : "text-white"}`}>
            {formatTime(timerSeconds)}
          </span>
          <div className="flex items-center gap-1">
            {!timerRunning ? (
              <Button size="sm" variant="ghost" onClick={onTimerStart} className="text-slate-400 hover:text-green-400 hover:bg-slate-700">
                <Play className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={onTimerPause} className="text-slate-400 hover:text-yellow-400 hover:bg-slate-700">
                <Pause className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Speech Speed Control */}
        <div className="px-6 flex items-center justify-center gap-3 py-1">
          <span className="text-xs text-slate-400 whitespace-nowrap">Speech Speed</span>
          <Slider
            value={[speechSpeed]}
            min={0.75}
            max={1.5}
            step={0.25}
            onValueChange={(val) => {
              const newSpeed = val[0];
              setSpeechSpeed(newSpeed);
              try { localStorage.setItem("sca-speech-speed", String(newSpeed)); } catch {}
            }}
            className="w-28 [&_[data-slot=slider-track]]:bg-slate-700 [&_[data-slot=slider-range]]:bg-green-500 [&_[data-slot=slider-thumb]]:border-green-500"
          />
          <span className="text-xs text-slate-300 font-mono w-8">{speechSpeed}x</span>
        </div>

        {/* Main Voice Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          {/* Large centered avatar */}
          <PatientAvatar
            patientName={caseData.patientName}
            emotion={currentEmotion}
            size="lg"
            isSpeaking={isSpeaking}
          />

          {/* Patient speaking waveform / last message */}
          <div className="text-center max-w-md">
            {isSpeaking ? (
              <div className="flex flex-col items-center gap-4">
                {/* Animated waveform */}
                <div className="flex items-center justify-center gap-1 h-16">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-green-400 rounded-full"
                      style={{
                        animation: `voiceWave 1.2s ease-in-out infinite`,
                        animationDelay: `${i * 0.08}s`,
                        height: "8px",
                      }}
                    />
                  ))}
                </div>
                <p className="text-green-400 text-sm font-medium">Patient speaking...</p>
                {lastAssistantMessage && (
                  <p className="text-slate-300 text-base leading-relaxed mt-2">{lastAssistantMessage.content}</p>
                )}
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                <p className="text-slate-400 text-sm">Patient is thinking...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {lastAssistantMessage && (
                  <p className="text-slate-200 text-base leading-relaxed">{lastAssistantMessage.content}</p>
                )}
                {lastAudioUrl && !isSpeaking && (
                  <Button
                    onClick={replayLastAudio}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-green-400 hover:bg-slate-700 gap-1.5 mt-2"
                  >
                    <Volume2 className="w-4 h-4" /> Replay
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Live transcript while recording */}
          {(liveTranscript || isTranscribing) && (
            <div className="bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 max-w-sm text-center">
              {isTranscribing ? (
                <span className="flex items-center justify-center gap-2 text-slate-300 text-sm">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Transcribing...
                </span>
              ) : (
                <span className="text-slate-200 text-sm italic">{liveTranscript}</span>
              )}
            </div>
          )}

          {/* Your last message */}
          {lastUserMessage && !isRecording && !liveTranscript && (
            <div className="bg-green-600/20 border border-green-500/30 rounded-xl px-4 py-2 max-w-sm text-center">
              <p className="text-green-300 text-sm">You: {lastUserMessage.content}</p>
            </div>
          )}
        </div>

        {/* Large Mic Button */}
        <div className="pb-12 pt-6 flex flex-col items-center gap-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading || isTranscribing}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
              isRecording
                ? "bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)] scale-110"
                : "bg-white shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95"
            } ${(isLoading || isTranscribing) ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isRecording ? (
              <MicOff className="w-10 h-10 text-white" />
            ) : (
              <Mic className="w-10 h-10 text-slate-900" />
            )}
          </button>
          <p className="text-slate-400 text-sm">
            {isRecording ? "Tap to stop" : isTranscribing ? "Processing..." : "Tap to speak"}
          </p>
          {/* Message count indicator */}
          <p className="text-slate-500 text-xs">{messages.length} messages in this consultation</p>
        </div>

        <audio ref={audioRef} className="hidden" />

        {/* Voice waveform animation keyframes */}
        <style>{`
          @keyframes voiceWave {
            0%, 100% { height: 8px; }
            25% { height: ${Math.random() * 20 + 24}px; }
            50% { height: ${Math.random() * 30 + 40}px; }
            75% { height: ${Math.random() * 20 + 20}px; }
          }
        `}</style>
      </div>
    );
  }

  // Chat Mode UI (existing)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PatientAvatar
              patientName={caseData.patientName}
              emotion={currentEmotion}
              size="sm"
              isSpeaking={isSpeaking}
            />
            <div>
              <h1 className="text-lg font-bold text-slate-900">{caseData.title}</h1>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Volume2 className="w-3 h-3" />
                <span>{voiceProfile.label}</span>
              </div>
              {emotionConfig.label && (
                <p className="text-xs mt-0.5" style={{ color: emotionConfig.color }}>{caseData.patientName} — {emotionConfig.label}</p>
              )}
              <p className="text-xs italic text-slate-400 mt-0.5 transition-all duration-[600ms] ease-in-out">{emotionConfig.bodyLanguage}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleMode}
              variant="outline"
              size="sm"
              className="gap-1.5"
              title="Switch to Voice Mode"
            >
              <Mic className="w-4 h-4" /> Voice
            </Button>
            <Button onClick={onFinish} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
              End & Score
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4 min-h-[60vh]">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                msg.role === "user"
                  ? "bg-green-600 text-white rounded-br-md"
                  : "bg-white border border-slate-200 text-slate-900 rounded-bl-md shadow-sm"
              }`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => {
                      if (msg.audioUrl) {
                        // Replay from stored audio URL
                        if (audioRef.current) {
                          setIsSpeaking(true);
                          audioRef.current.src = msg.audioUrl;
                          audioRef.current.onended = () => setIsSpeaking(false);
                          audioRef.current.onerror = () => setIsSpeaking(false);
                          audioRef.current.play().catch(() => setIsSpeaking(false));
                        }
                      } else {
                        // Re-synthesize if no stored audio
                        speakText(msg.content);
                      }
                    }}
                    className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-green-600 transition-colors"
                    title="Replay this response"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Replay</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-30">
        {/* Live transcript preview */}
        {(liveTranscript || isTranscribing) && (
          <div className="max-w-4xl mx-auto mb-2">
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
              {isTranscribing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Transcribing your speech...
                </span>
              ) : (
                <span className="italic">{liveTranscript}</span>
              )}
            </div>
          </div>
        )}
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            placeholder="Type your response or tap the mic..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !isLoading) handleSendMessage(); }}
            disabled={isLoading || isRecording}
            className="flex-1"
          />
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant="outline"
            size="icon"
            disabled={isLoading || isTranscribing}
            className={isRecording ? "bg-red-50 border-red-300 text-red-600 animate-pulse" : ""}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !manualInput.trim()}
            size="icon"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Floating Timer Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white px-4 py-2 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className={`font-mono text-lg font-bold ${timerSeconds <= 60 ? "text-red-400" : timerSeconds <= 180 ? "text-yellow-400" : "text-white"}`}>
              {formatTime(timerSeconds)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!timerRunning ? (
              <Button size="sm" variant="ghost" onClick={onTimerStart} className="text-white hover:text-green-400 hover:bg-slate-800">
                <Play className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={onTimerPause} className="text-white hover:text-yellow-400 hover:bg-slate-800">
                <Pause className="w-4 h-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onTimerReset} className="text-white hover:text-slate-300 hover:bg-slate-800">
              <RotateCcw className="w-4 h-4" />
            </Button>
            {isSpeaking ? (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Volume2 className="w-3 h-3 animate-pulse" /> Patient speaking...
              </span>
            ) : lastAudioUrl ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={replayLastAudio}
                className="text-white hover:text-green-400 hover:bg-slate-800 gap-1 text-xs"
                title="Replay last patient response"
              >
                <Volume2 className="w-3 h-3" /> Replay
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

// ============================================================
// SCORING VIEW
// ============================================================
function ScoringView({
  caseData,
  competencyScores,
  setCompetencyScores,
  onFinish,
}: {
  caseData: FullCase;
  competencyScores: Record<string, CompetencyScore>;
  setCompetencyScores: React.Dispatch<React.SetStateAction<Record<string, CompetencyScore>>>;
  onFinish: () => void;
  onBack: () => void;
}) {
  const markSheet = caseData.markSheet;
  if (!markSheet) return <div className="p-8 text-center text-slate-500">No mark scheme available for scoring.</div>;

  const domains = [markSheet.domain1, markSheet.domain2, markSheet.domain3].filter(Boolean);

  const getScore = (compId: string) => competencyScores[compId];
  const setScore = (compId: string, score: CompetencyScore) => {
    setCompetencyScores((prev) => ({ ...prev, [compId]: score }));
  };

  // Calculate domain scores
  const calculateDomainScore = (domain: any) => {
    if (!domain?.competencies) return { score: 0, max: 0, percentage: 0 };
    const max = domain.competencies.length * 2;
    let score = 0;
    domain.competencies.forEach((comp: any) => {
      const s = competencyScores[comp.id];
      if (s === "well") score += 2;
      else if (s === "partial") score += 1;
    });
    return { score, max, percentage: max > 0 ? Math.round((score / max) * 100) : 0 };
  };

  const domainScores = domains.map(calculateDomainScore);
  const totalScore = domainScores.reduce((sum, d) => sum + d.score, 0);
  const totalMax = domainScores.reduce((sum, d) => sum + d.max, 0);
  const totalPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  // Count scored competencies
  const totalCompetencies = domains.reduce((sum: number, d: any) => sum + (d.competencies?.length || 0), 0);
  const scoredCount = Object.keys(competencyScores).length;
  const allScored = scoredCount >= totalCompetencies;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Mark Scheme — {caseData.title}</h1>
            <p className="text-sm text-slate-500">Score each competency: Done Well (2) / Partially (1) / Poorly (0)</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{scoredCount}/{totalCompetencies} scored</span>
            <Button
              onClick={onFinish}
              disabled={!allScored}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              View Debrief
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Score Summary */}
        <Card className="p-6 border-slate-200">
          <div className="grid grid-cols-4 gap-4 text-center">
            {domainScores.map((ds, idx) => (
              <div key={idx}>
                <p className="text-xs text-slate-500 mb-1">Domain {idx + 1}</p>
                <p className={`text-2xl font-bold ${ds.percentage >= 50 ? "text-green-600" : "text-red-600"}`}>
                  {ds.percentage}%
                </p>
                <p className="text-xs text-slate-400">{ds.score}/{ds.max}</p>
              </div>
            ))}
            <div>
              <p className="text-xs text-slate-500 mb-1">Total</p>
              <p className={`text-2xl font-bold ${totalPercentage >= 50 ? "text-green-600" : "text-red-600"}`}>
                {totalPercentage}%
              </p>
              <p className="text-xs text-slate-400">{totalScore}/{totalMax}</p>
            </div>
          </div>
        </Card>

        {/* Competency Scoring */}
        {domains.map((domain: any, idx: number) => (
          <Card key={idx} className="p-6 border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">
              Domain {idx + 1}: {domain.name}
            </h3>
            <div className="space-y-6">
              {domain.competencies?.map((comp: any) => {
                const currentScore = getScore(comp.id);
                return (
                  <div key={comp.id} className={`border rounded-lg p-4 transition-colors ${
                    currentScore === "well" ? "border-green-200 bg-green-50/50" :
                    currentScore === "poor" ? "border-red-200 bg-red-50/50" :
                    currentScore === "partial" ? "border-yellow-200 bg-yellow-50/50" :
                    "border-slate-100"
                  }`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <Badge variant="outline" className="text-xs shrink-0">{comp.id}</Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={currentScore === "well" ? "default" : "outline"}
                          onClick={() => setScore(comp.id, "well")}
                          className={currentScore === "well" ? "bg-green-600 hover:bg-green-700 text-white" : "text-green-700 border-green-200 hover:bg-green-50"}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Well
                        </Button>
                        <Button
                          size="sm"
                          variant={currentScore === "partial" ? "default" : "outline"}
                          onClick={() => setScore(comp.id, "partial")}
                          className={currentScore === "partial" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "text-yellow-700 border-yellow-200 hover:bg-yellow-50"}
                        >
                          <MinusCircle className="w-3 h-3 mr-1" /> Partial
                        </Button>
                        <Button
                          size="sm"
                          variant={currentScore === "poor" ? "default" : "outline"}
                          onClick={() => setScore(comp.id, "poor")}
                          className={currentScore === "poor" ? "bg-red-600 hover:bg-red-700 text-white" : "text-red-700 border-red-200 hover:bg-red-50"}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Poor
                        </Button>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="text-sm">
                        <p className="text-xs text-green-600 font-semibold mb-1">Done Well looks like:</p>
                        <p className="text-slate-700">{comp.doneWell}</p>
                      </div>
                      <div className="text-sm">
                        <p className="text-xs text-red-600 font-semibold mb-1">Done Poorly looks like:</p>
                        <p className="text-slate-700">{comp.donePoorly}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </main>
    </div>
  );
}

// ============================================================
// DEBRIEF VIEW
// ============================================================
// ============================================================
// FREE TRIAL SUBSCRIBE BUTTONS
// ============================================================
function FreeTrialSubscribeButtons() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleCheckout = async (planKey: string) => {
    if (!isAuthenticated) {
      navigate("/pricing");
      return;
    }
    setLoadingPlan(planKey);
    try {
      const result = await createCheckout.mutateAsync({ planKey });
      if (result.url) {
        toast.info("Redirecting to checkout...");
        window.location.href = result.url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error?.message || "Failed to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button
        onClick={() => handleCheckout("SCA_3MONTH")}
        disabled={!!loadingPlan}
        className="bg-green-600 hover:bg-green-700 text-white gap-2"
      >
        {loadingPlan === "SCA_3MONTH" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        Subscribe — £20 / 3 months
      </Button>
      <Button
        onClick={() => handleCheckout("SCA_6MONTH")}
        disabled={!!loadingPlan}
        variant="outline"
        className="border-green-300 text-green-700 hover:bg-green-50 gap-2"
      >
        {loadingPlan === "SCA_6MONTH" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        Subscribe — £35 / 6 months
      </Button>
    </div>
  );
}

function DebriefView({
  caseData,
  competencyScores,
  messages,
  duration,
  userId,
  isFreeTrial = false,
  emotionHistory = [],
  onBack,
}: {
  caseData: FullCase;
  competencyScores: Record<string, CompetencyScore>;
  messages: Message[];
  duration: number;
  userId?: number;
  isFreeTrial?: boolean;
  emotionHistory?: EmotionHistoryEntry[];
  onBack: () => void;
}) {
  const markSheet = caseData.markSheet;
  const persona = caseData.aiPatientPersona;
  const saveConsultation = trpc.sca.saveConsultation.useMutation();
  const [saved, setSaved] = useState(false);

  const domains = [markSheet?.domain1, markSheet?.domain2, markSheet?.domain3].filter(Boolean);

  // Calculate scores
  const calculateDomainScore = (domain: any) => {
    if (!domain?.competencies) return { score: 0, max: 0, percentage: 0 };
    const max = domain.competencies.length * 2;
    let score = 0;
    domain.competencies.forEach((comp: any) => {
      const s = competencyScores[comp.id];
      if (s === "well") score += 2;
      else if (s === "partial") score += 1;
    });
    return { score, max, percentage: max > 0 ? Math.round((score / max) * 100) : 0 };
  };

  const domainScores = domains.map(calculateDomainScore);
  const totalScore = domainScores.reduce((sum, d) => sum + d.score, 0);
  const totalMax = domainScores.reduce((sum, d) => sum + d.max, 0);
  const totalPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const passed = domainScores.every(d => d.percentage >= 50);

  // Empathy Score
  const empathyResult = calculateEmpathyScore(emotionHistory, duration);

  // Poorly scored competencies
  const poorCompetencies = Object.entries(competencyScores)
    .filter(([, score]) => score === "poor")
    .map(([id]) => {
      for (const domain of domains) {
        const comp = domain.competencies?.find((c: any) => c.id === id);
        if (comp) return { ...comp, domainName: domain.name };
      }
      return null;
    })
    .filter(Boolean);

  // Save consultation (skip for free trial users)
  useEffect(() => {
    if (!saved && userId && !isFreeTrial) {
      saveConsultation.mutateAsync({
        caseId: caseData.id,
        caseTitle: caseData.title,
        mode: "practice",
        transcript: messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
        duration,
        domain1Score: domainScores[0]?.percentage || 0,
        domain2Score: domainScores[1]?.percentage || 0,
        domain3Score: domainScores[2]?.percentage || 0,
        totalScore: totalPercentage,
        passed,
        competencyScores,
        empathyScore: empathyResult.score,
        isFreeTrial,
      }).then(() => setSaved(true)).catch(() => {});
    }
  }, []);

  // Radar chart using SVG
  const radarSize = 200;
  const radarCenter = radarSize / 2;
  const radarRadius = 80;
  const radarAngles = domainScores.map((_, i) => (Math.PI * 2 * i) / domainScores.length - Math.PI / 2);
  const radarPoints = domainScores.map((d, i) => {
    const r = (d.percentage / 100) * radarRadius;
    return {
      x: radarCenter + r * Math.cos(radarAngles[i]),
      y: radarCenter + r * Math.sin(radarAngles[i]),
    };
  });
  const radarPath = radarPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Debrief — {caseData.title}</h1>
              <p className="text-sm text-slate-500">Post-consultation analysis</p>
            </div>
          </div>
          <Badge className={passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
            {passed ? "PASS" : "FAIL"} — {totalPercentage}%
          </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Score Overview with Radar */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Domain Scores</h3>
            <div className="flex justify-center mb-4">
              <svg width={radarSize} height={radarSize} className="overflow-visible">
                {/* Grid lines */}
                {[0.25, 0.5, 0.75, 1].map((scale) => (
                  <polygon
                    key={scale}
                    points={radarAngles.map((a) => `${radarCenter + radarRadius * scale * Math.cos(a)},${radarCenter + radarRadius * scale * Math.sin(a)}`).join(" ")}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                ))}
                {/* Axis lines */}
                {radarAngles.map((a, i) => (
                  <line key={i} x1={radarCenter} y1={radarCenter} x2={radarCenter + radarRadius * Math.cos(a)} y2={radarCenter + radarRadius * Math.sin(a)} stroke="#e2e8f0" strokeWidth="1" />
                ))}
                {/* Score polygon */}
                <path d={radarPath} fill="rgba(34, 197, 94, 0.2)" stroke="#22c55e" strokeWidth="2" />
                {/* Score points */}
                {radarPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="4" fill="#22c55e" />
                ))}
                {/* Labels */}
                {radarAngles.map((a, i) => (
                  <text
                    key={i}
                    x={radarCenter + (radarRadius + 20) * Math.cos(a)}
                    y={radarCenter + (radarRadius + 20) * Math.sin(a)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-slate-600"
                  >
                    D{i + 1}: {domainScores[i].percentage}%
                  </text>
                ))}
              </svg>
            </div>
            <div className="space-y-2">
              {domains.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{d.name}</span>
                  <span className={`font-bold ${domainScores[i].percentage >= 50 ? "text-green-600" : "text-red-600"}`}>
                    {domainScores[i].percentage}%
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Consultation Summary</h3>
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Duration</p>
                <p className="font-semibold">{Math.floor(duration / 60)}m {duration % 60}s</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Messages exchanged</p>
                <p className="font-semibold">{messages.length}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Overall result</p>
                <p className={`font-bold text-lg ${passed ? "text-green-600" : "text-red-600"}`}>
                  {passed ? "PASS" : "FAIL"} ({totalPercentage}%)
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Patient Emotional Journey Timeline */}
        {emotionHistory.length > 0 && (
          <EmotionTimeline history={emotionHistory} totalDuration={duration} />
        )}

        {/* Empathy Score */}
        <Card className="p-6 border-purple-200 bg-purple-50">
          <h3 className="text-lg font-bold text-purple-900 mb-4">Empathy Score</h3>
          <div className="flex items-center gap-6 mb-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e9d5ff"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={empathyResult.score >= 70 ? "#10B981" : empathyResult.score >= 50 ? "#F59E0B" : "#EF4444"}
                  strokeWidth="3"
                  strokeDasharray={`${empathyResult.score}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-900">{empathyResult.score}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-purple-800 mb-3">{empathyResult.explanation}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2 rounded border border-purple-100 text-center">
                  <p className="text-purple-500">Resolution</p>
                  <p className="font-bold text-purple-900">{empathyResult.breakdown.resolutionSpeed}/40</p>
                </div>
                <div className="bg-white p-2 rounded border border-purple-100 text-center">
                  <p className="text-purple-500">Final State</p>
                  <p className="font-bold text-purple-900">{empathyResult.breakdown.finalState}/30</p>
                </div>
                <div className="bg-white p-2 rounded border border-purple-100 text-center">
                  <p className="text-purple-500">De-escalation</p>
                  <p className="font-bold text-purple-900">{empathyResult.breakdown.distressEscalation}/30</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Empathy Tips (shown when score < 60%) */}
        {empathyResult.score < 60 && (
          <Card className="p-6 border-amber-200 bg-amber-50">
            <h3 className="text-lg font-bold text-amber-900 mb-3">Empathy Improvement Tips</h3>
            <p className="text-sm text-amber-700 mb-4">Based on your lowest-scoring empathy components, here are specific actions to improve:</p>
            <div className="space-y-3">
              {empathyResult.breakdown.resolutionSpeed <= empathyResult.breakdown.finalState && empathyResult.breakdown.resolutionSpeed <= empathyResult.breakdown.distressEscalation && (
                <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-amber-100">
                  <span className="text-amber-500 mt-0.5 shrink-0">💡</span>
                  <div>
                    <p className="font-medium text-amber-900 text-sm">Acknowledge feelings earlier</p>
                    <p className="text-xs text-amber-700 mt-1">Try acknowledging the patient's feelings before moving to clinical questions. Phrases like "I can see this is really worrying you" help the patient feel heard and reduce distress faster.</p>
                  </div>
                </div>
              )}
              {empathyResult.breakdown.finalState <= empathyResult.breakdown.resolutionSpeed && empathyResult.breakdown.finalState <= empathyResult.breakdown.distressEscalation && (
                <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-amber-100">
                  <span className="text-amber-500 mt-0.5 shrink-0">💡</span>
                  <div>
                    <p className="font-medium text-amber-900 text-sm">Check in before closing</p>
                    <p className="text-xs text-amber-700 mt-1">Check in with how the patient is feeling before closing the consultation. Ask "How are you feeling about what we've discussed?" to ensure they leave reassured rather than still anxious.</p>
                  </div>
                </div>
              )}
              {empathyResult.breakdown.distressEscalation <= empathyResult.breakdown.resolutionSpeed && empathyResult.breakdown.distressEscalation <= empathyResult.breakdown.finalState && (
                <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-amber-100">
                  <span className="text-amber-500 mt-0.5 shrink-0">💡</span>
                  <div>
                    <p className="font-medium text-amber-900 text-sm">Pause and reflect during distress</p>
                    <p className="text-xs text-amber-700 mt-1">When the patient becomes distressed, pause and reflect their emotion before continuing. Say "I can hear that's really upsetting for you" rather than immediately moving to the next question.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Poorly Scored Competencies */}
        {poorCompetencies.length > 0 && (
          <Card className="p-6 border-red-200 bg-red-50">
            <h3 className="text-lg font-bold text-red-900 mb-4">Areas for Improvement</h3>
            <div className="space-y-4">
              {poorCompetencies.map((comp: any) => (
                <div key={comp.id} className="bg-white p-4 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs border-red-200 text-red-700">{comp.id}</Badge>
                    <span className="text-xs text-red-600">{comp.domainName}</span>
                  </div>
                  <p className="text-sm text-slate-700 mb-2"><strong>What was expected:</strong> {comp.doneWell}</p>
                  <p className="text-sm text-red-700"><strong>What went wrong:</strong> {comp.donePoorly}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Examiner Debrief */}
        <Card className="p-6 border-blue-100 bg-blue-50">
          <h3 className="text-lg font-bold text-blue-900 mb-4">Examiner Debrief</h3>
          <p className="text-blue-800 mb-4">What the examiner was looking for in this case:</p>
          <div className="space-y-3">
            {domains.map((domain: any, idx: number) => (
              <div key={idx}>
                <p className="font-semibold text-blue-900 text-sm mb-1">Domain {idx + 1}: {domain.name}</p>
                <ul className="space-y-1">
                  {domain.competencies?.slice(0, 3).map((comp: any) => (
                    <li key={comp.id} className="text-sm text-blue-800 pl-4">• {comp.doneWell}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        {/* Patient Debrief */}
        {persona && (
          <Card className="p-6 border-purple-100 bg-purple-50">
            <h3 className="text-lg font-bold text-purple-900 mb-4">Patient Debrief</h3>
            <p className="text-purple-800 mb-4">What the patient was thinking but did not say:</p>
            <div className="space-y-4">
              {persona.howToReact && (
                <div>
                  <p className="font-semibold text-purple-900 text-sm mb-1">Internal reactions:</p>
                  <p className="text-sm text-purple-800">{persona.howToReact}</p>
                </div>
              )}
              {persona.historyIfAsked && (
                <div>
                  <p className="font-semibold text-purple-900 text-sm mb-1">Hidden information (only if asked):</p>
                  <div className="grid md:grid-cols-2 gap-2">
                    {Object.entries(persona.historyIfAsked).map(([key, value]) => (
                      <div key={key} className="bg-white/50 p-2 rounded text-sm">
                        <span className="font-medium text-purple-700">{key}:</span>{" "}
                        <span className="text-purple-800">{value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Footer: Subscribe prompt for free trial OR back button for subscribers */}
        {isFreeTrial ? (
          <Card className="p-8 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              You scored {totalPercentage}%{passed ? " — Pass!" : " — Keep practising"}
            </h3>
            <p className="text-slate-600 mb-6 max-w-lg mx-auto">
              Subscribe to SCA Simulator to access all 60 cases, save your progress and export your portfolio PDF. From £20 for 3 months.
            </p>
            <FreeTrialSubscribeButtons />
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500">
                Back to Case Browser
              </Button>
            </div>
          </Card>
        ) : (
          <div className="text-center pt-4">
            <Button onClick={onBack} className="bg-green-600 hover:bg-green-700 text-white">
              Back to Case Browser
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
