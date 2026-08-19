import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";

export default function TopicsLibrary() {
  const [, navigate] = useLocation();
  const { data: subjects, isLoading } = trpc.topics.getSubjects.useQuery();

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title="Topics Library"
        description="Interactive visual learning for Biology and Mathematics. Explore animated diagrams, interactive tools, and practice questions linked to JAMB exam topics."
        path="/topics"
      />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Topics Library</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Interactive visual learning with diagrams, explanations, and linked practice questions</p>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {[1,2].map(i => <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            {subjects?.map((s) => (
              <Card key={s.id} className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-2 hover:border-green-400" onClick={() => navigate(`/topics/${s.slug}`)}>
                <CardContent className="p-8">
                  <div className="text-5xl mb-4">{s.icon}</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{s.name}</h2>
                  <p className="text-gray-600 mb-4">{s.description}</p>
                  <div className="flex items-center text-green-600 font-medium">
                    Explore topics <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Spelling Bee Card */}
        <Card className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-2 hover:border-amber-400 max-w-md mx-auto" onClick={() => navigate("/topics/spelling-bee")}>
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4">🐝</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Spelling Bee</h2>
            <p className="text-gray-600 mb-4">Test your spelling across vocabulary, science, geography, and commonly misspelled words</p>
            <div className="flex items-center justify-center text-amber-600 font-medium">
              Start practising <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
