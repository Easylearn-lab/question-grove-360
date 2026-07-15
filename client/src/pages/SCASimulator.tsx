import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mic, MicOff, Send, Loader2, Play, Pause, RotateCcw, CheckCircle2, XCircle, MinusCircle, Clock, Volume2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { useSubscription } from "@/hooks/useSubscription";

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
}

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
}

type CompetencyScore = "well" | "partial" | "poor";

// ============================================================
// VOICE PROFILE MAPPING
// ============================================================
function getVoiceProfile(age: number, gender: string): { voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"; label: string } {
  if (gender?.toLowerCase() === "female") {
    return { voice: "nova", label: "Middle-aged female (anxious, emotional)" };
  }
  if (age >= 60) {
    return { voice: "onyx", label: "Elderly male (calm, stoic)" };
  }
  if (age <= 30) {
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
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [, navigate] = useLocation();
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [phase, setPhase] = useState<"browse" | "case" | "consultation" | "scoring" | "debrief">("browse");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch all cases
  const casesQuery = trpc.sca.getCases.useQuery();

  // Fetch full case when selected
  const fullCaseQuery = trpc.sca.getCaseById.useQuery(
    { caseId: selectedCaseId! },
    { enabled: !!selectedCaseId && isAuthenticated }
  );

  const categories = useMemo(() => {
    if (!casesQuery.data) return [];
    const cats = Array.from(new Set(casesQuery.data.map((c: ScaCase) => c.category)));
    return cats.sort();
  }, [casesQuery.data]);

  const filteredCases = useMemo(() => {
    if (!casesQuery.data) return [];
    if (categoryFilter === "all") return casesQuery.data;
    return casesQuery.data.filter((c: ScaCase) => c.category === categoryFilter);
  }, [casesQuery.data, categoryFilter]);

  const handleSelectCase = (caseId: number) => {
    if (!isAuthenticated) {
      toast.error("Please log in to access SCA cases");
      return;
    }
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">SCA Consultation Simulator</h1>
              <p className="text-sm text-slate-500">30 RCGP-mapped cases with AI patient roleplay</p>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SubscriptionGate isPremium={isPremium} featureName="SCA Consultation Simulator">
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
                {filteredCases.map((caseItem: ScaCase) => (
                  <Card
                    key={caseItem.id}
                    className="p-6 border-slate-200 hover:shadow-lg hover:border-green-200 transition-all cursor-pointer group"
                    onClick={() => handleSelectCase(caseItem.id)}
                  >
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
                ))}
              </div>
            )}
          </SubscriptionGate>
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
}: {
  caseData: FullCase;
  phase: "case" | "consultation" | "scoring" | "debrief";
  onStartConsultation: () => void;
  onFinishConsultation: () => void;
  onFinishScoring: () => void;
  onBack: () => void;
  userId?: number;
}) {
  const [activeTab, setActiveTab] = useState("briefing");
  const [messages, setMessages] = useState<Message[]>([]);
  const [competencyScores, setCompetencyScores] = useState<Record<string, CompetencyScore>>({});
  const [consultationDuration, setConsultationDuration] = useState(0);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(720); // 12 minutes
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
  onFinish: () => void;
}) {
  const [manualInput, setManualInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const generateResponseMutation = trpc.sca.generatePatientResponse.useMutation();
  const uploadAudioMutation = trpc.voice.uploadAudio.useMutation();
  const transcribeMutation = trpc.voice.transcribe.useMutation();
  const synthesizeMutation = trpc.voice.synthesize.useMutation();

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get opening statement on first render
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
      // Start timer automatically
      onTimerStart();
      // Speak the opening
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
        speed: 1.0,
      });
      if (audioRef.current) {
        audioRef.current.src = result.url;
        audioRef.current.onended = () => setIsSpeaking(false);
        audioRef.current.play().catch(() => setIsSpeaking(false));
      } else {
        setIsSpeaking(false);
      }
    } catch {
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || manualInput;
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setManualInput("");
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          if (!base64) return;
          try {
            const upload = await uploadAudioMutation.mutateAsync({ audioBase64: base64, mimeType: "audio/webm" });
            const transcription = await transcribeMutation.mutateAsync({ audioUrl: upload.url, language: "en" });
            if (transcription.text) {
              handleSendMessage(transcription.text);
            }
          } catch (err: any) {
            toast.error(err.message || "Transcription failed");
          }
        };
        reader.readAsDataURL(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Unable to access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{caseData.title}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Volume2 className="w-3 h-3" />
              <span>{voiceProfile.label}</span>
            </div>
          </div>
          <Button onClick={onFinish} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
            End & Score
          </Button>
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
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            placeholder="Type your response..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !isLoading) handleSendMessage(); }}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant="outline"
            size="icon"
            className={isRecording ? "bg-red-50 border-red-300 text-red-600" : ""}
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
            {isSpeaking && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Volume2 className="w-3 h-3 animate-pulse" /> Speaking
              </span>
            )}
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
function DebriefView({
  caseData,
  competencyScores,
  messages,
  duration,
  userId,
  onBack,
}: {
  caseData: FullCase;
  competencyScores: Record<string, CompetencyScore>;
  messages: Message[];
  duration: number;
  userId?: number;
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

  // Save consultation
  useEffect(() => {
    if (!saved && userId) {
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

        {/* Back to Cases */}
        <div className="text-center pt-4">
          <Button onClick={onBack} className="bg-green-600 hover:bg-green-700 text-white">
            Back to Case Browser
          </Button>
        </div>
      </main>
    </div>
  );
}
