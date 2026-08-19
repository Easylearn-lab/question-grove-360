import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-red-100 text-red-800",
};

export default function TopicsSubject() {
  const [, navigate] = useLocation();
  const params = useParams<{ subject: string }>();
  const subjectSlug = params.subject || "";

  const { data: subject } = trpc.topics.getSubjectBySlug.useQuery({ slug: subjectSlug });
  const { data: topicsList, isLoading } = trpc.topics.getTopicsBySubjectSlug.useQuery({ slug: subjectSlug });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/topics")} className="mb-6 text-gray-600">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Topics Library
        </Button>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{subject?.icon}</span>
            <h1 className="text-3xl font-bold text-gray-900">{subject?.name || subjectSlug}</h1>
          </div>
          <p className="text-gray-600">{subject?.description}</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {topicsList?.map((topic, i) => (
              <Card key={topic.id} className="cursor-pointer hover:shadow-md transition-all hover:border-green-300" onClick={() => navigate(`/topics/${subjectSlug}/${topic.slug}`)}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">{i + 1}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{topic.name}</h3>
                      <p className="text-sm text-gray-500">{topic.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={difficultyColors[topic.difficultyLevel || "medium"]}>{topic.difficultyLevel}</Badge>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
