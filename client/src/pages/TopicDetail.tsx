import { useState, useMemo, lazy, Suspense } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, BookOpen, Target, CheckCircle2 } from "lucide-react";

// Dynamic diagram/tool loader
const diagramComponents: Record<string, React.LazyExoticComponent<any>> = {
  CardiovascularDiagram: lazy(() => import("@/components/topics/CardiovascularDiagram")),
  RespiratoryDiagram: lazy(() => import("@/components/topics/RespiratoryDiagram")),
  DigestiveDiagram: lazy(() => import("@/components/topics/DigestiveDiagram")),
  NervousDiagram: lazy(() => import("@/components/topics/NervousDiagram")),
  CellDiagram: lazy(() => import("@/components/topics/CellDiagram")),
  ReproductionDiagram: lazy(() => import("@/components/topics/ReproductionDiagram")),
  GeneticsDiagram: lazy(() => import("@/components/topics/GeneticsDiagram")),
  EcologyDiagram: lazy(() => import("@/components/topics/EcologyDiagram")),
  AlgebraTool: lazy(() => import("@/components/topics/AlgebraTool")),
  NumberBasesTool: lazy(() => import("@/components/topics/NumberBasesTool")),
  IndicesLogsTool: lazy(() => import("@/components/topics/IndicesLogsTool")),
  GeometryTool: lazy(() => import("@/components/topics/GeometryTool")),
  TrigonometryTool: lazy(() => import("@/components/topics/TrigonometryTool")),
  StatisticsTool: lazy(() => import("@/components/topics/StatisticsTool")),
  CalculusTool: lazy(() => import("@/components/topics/CalculusTool")),
  SetsProbabilityTool: lazy(() => import("@/components/topics/SetsProbabilityTool")),
};

type Tab = "visualize" | "learn" | "practice";

export default function TopicDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ subject: string; topic: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("visualize");

  const { data: topicData, isLoading } = trpc.topics.getTopicBySlug.useQuery({
    subjectSlug: params.subject || "",
    topicSlug: params.topic || "",
  });

  const linkedTag = topicData?.linkedQuestionTopicTag;
  const { data: linkedQuestions } = trpc.topics.getLinkedQuestions.useQuery(
    { topicTag: linkedTag || "", limit: 10 },
    { enabled: !!linkedTag && activeTab === "practice" }
  );

  const keyPoints = useMemo(() => {
    if (!topicData?.content?.keyPointsJson) return [];
    const kp = topicData.content.keyPointsJson;
    return Array.isArray(kp) ? kp : [];
  }, [topicData]);

  const DiagramComponent = topicData?.visualizeComponent ? diagramComponents[topicData.visualizeComponent] : null;

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;
  }

  if (!topicData) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Topic not found</p></div>;
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "visualize", label: "Visualize", icon: Eye },
    { key: "learn", label: "Learn", icon: BookOpen },
    { key: "practice", label: "Practice", icon: Target },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(`/topics/${params.subject}`)} className="mb-6 text-gray-600">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to {topicData.subject?.name}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{topicData.name}</h1>
          <p className="text-gray-600">{topicData.description}</p>
          <Badge className="mt-2" variant="outline">{topicData.difficultyLevel}</Badge>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-8 max-w-md">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Visualize tab */}
        {activeTab === "visualize" && (
          <Card>
            <CardContent className="p-6">
              {DiagramComponent ? (
                <Suspense fallback={<div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>}>
                  <DiagramComponent />
                </Suspense>
              ) : (
                <div className="h-96 flex items-center justify-center text-gray-400">
                  <p>Interactive diagram coming soon</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Learn tab */}
        {activeTab === "learn" && (
          <div className="space-y-6">
            {/* Key Points */}
            {keyPoints.length > 0 && (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-green-800 mb-4">Key Points</h3>
                  <div className="space-y-3">
                    {keyPoints.map((point: string, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-gray-700">{point}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Learn content */}
            <Card>
              <CardContent className="p-6 prose prose-gray max-w-none">
                {topicData.content?.learnContentMarkdown ? (
                  <div dangerouslySetInnerHTML={{ __html: topicData.content.learnContentMarkdown.replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^- (.+)$/gm, '<li>$1</li>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>') }} />
                ) : (
                  <p className="text-gray-400">Content coming soon</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Practice tab */}
        {activeTab === "practice" && (
          <div>
            {linkedTag ? (
              linkedQuestions && linkedQuestions.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-gray-600 mb-4">Practice questions related to <strong>{topicData.name}</strong> from the JAMB question bank:</p>
                  {linkedQuestions.map((q: any, i: number) => (
                    <Card key={q.id} className="hover:shadow-md transition-all">
                      <CardContent className="p-6">
                        <p className="font-medium text-gray-900 mb-3">Q{i+1}. {q.questionText || q.question_text}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {["A", "B", "C", "D"].map((letter) => (
                            <div key={letter} className="p-2 bg-gray-50 rounded text-sm text-gray-700">
                              {letter}. {q[`option${letter.toLowerCase()}`] || q[`option_${letter.toLowerCase()}`]}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button onClick={() => navigate(`/international/nigeria/jamb/biology`)} className="bg-green-600 hover:bg-green-700 text-white mt-4">
                    Go to Full Practice Mode →
                  </Button>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-gray-400">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No practice questions available for this topic yet.</p>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-gray-400">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Practice questions for Mathematics topics are coming soon.</p>
                  <p className="text-sm mt-2">Check back after more JAMB Mathematics questions are added.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
