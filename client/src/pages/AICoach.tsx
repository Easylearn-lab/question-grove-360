import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

const SAMPLE_CONTEXT = {
  totalQuestionsAnswered: 2543,
  accuracy: 78.5,
  weakAreas: ["Pharmacology", "Microbiology"],
  strongAreas: ["Cardiology", "Respiratory"],
  recentMockScore: 82,
  studyStreak: 15,
};

export default function AICoach() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `Hello! I'm AI Coach360, your personal study companion. I have access to your complete learning profile:

**Your Performance:**
- Total questions answered: ${SAMPLE_CONTEXT.totalQuestionsAnswered}
- Overall accuracy: ${SAMPLE_CONTEXT.accuracy}%
- Recent mock exam score: ${SAMPLE_CONTEXT.recentMockScore}%
- Study streak: ${SAMPLE_CONTEXT.studyStreak} days 🔥

**Areas to focus on:** ${SAMPLE_CONTEXT.weakAreas.join(", ")}
**Your strengths:** ${SAMPLE_CONTEXT.strongAreas.join(", ")}

How can I help you today? I can:
- Explain difficult concepts
- Create personalized study plans
- Analyze your performance patterns
- Suggest high-yield topics
- Help with exam strategy`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses: Record<string, string> = {
        pharmacology: `Based on your performance data, I see pharmacology is a weak area (currently ${SAMPLE_CONTEXT.accuracy}% accuracy). Here's a personalized study plan:

**Week 1-2: Drug Classes**
- Review beta-blockers, ACE inhibitors, and statins
- Focus on mechanism of action and clinical applications

**Week 3-4: Drug Interactions**
- Study common drug-drug interactions
- Practice case-based questions

**Recommended resources:**
- Question Bank: Filter by "Pharmacology" and "Hard" difficulty
- Note360: Review high-yield pharmacology notes
- Pattern Recognition: Master 50 key drug interactions

You've been doing great with ${SAMPLE_CONTEXT.strongAreas[0]} (${SAMPLE_CONTEXT.accuracy}% accuracy), so apply that same approach here!`,
        
        strategy: `Great question! Based on your ${SAMPLE_CONTEXT.recentMockScore}% mock exam score, here's my recommendation:

**Your Strengths to Leverage:**
- ${SAMPLE_CONTEXT.strongAreas.join(" and ")} - these are your high-confidence areas
- Time management - you're completing exams efficiently

**Areas for Improvement:**
- ${SAMPLE_CONTEXT.weakAreas.join(" and ")} - focus 40% of study time here
- Review explanations for incorrect answers

**Daily Study Plan:**
- 30 min: Review weak areas
- 20 min: Practice 20 questions in tutor mode
- 15 min: SCA simulation for clinical reasoning
- 10 min: Pattern Recognition flashcards

Your ${SAMPLE_CONTEXT.studyStreak}-day streak shows great consistency! Keep it up! 🚀`,

        default: `That's a great question! Based on your learning profile, I can see you're particularly strong in ${SAMPLE_CONTEXT.strongAreas[0]} but could use more practice in ${SAMPLE_CONTEXT.weakAreas[0]}.

Here's what I recommend:
1. **Immediate action:** Take a focused mock exam on ${SAMPLE_CONTEXT.weakAreas[0]} topics
2. **Deep dive:** Review the Note360 materials for this specialty
3. **Practice:** Complete 50+ questions in tutor mode with explanations
4. **Reinforce:** Use Pattern Recognition flashcards for key concepts

Your current accuracy of ${SAMPLE_CONTEXT.accuracy}% is solid. With focused effort on these weak areas, you can reach 85%+ within 2 weeks!

Would you like me to create a specific study plan for ${SAMPLE_CONTEXT.weakAreas[0]}?`,
      };

      const response =
        Object.entries(responses).find(([key]) =>
          userMessage.toLowerCase().includes(key)
        )?.[1] || responses.default;

      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setIsLoading(false);
    }, 1500);
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-teal-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">AI Coach360</h1>
              <p className="text-xs text-slate-600">Powered by Claude AI</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
        <div className="space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-2xl px-6 py-4 rounded-lg ${
                  msg.role === "user"
                    ? "bg-teal-600 text-white"
                    : "bg-white border border-slate-200 text-slate-900"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Streamdown>{msg.content}</Streamdown>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 text-slate-900 px-6 py-4 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-slate-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-3">
            <Input
              placeholder="Ask me anything about your exam prep..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            AI Coach360 has access to your complete learning profile and can provide personalized recommendations.
          </p>
        </div>
      </footer>
    </div>
  );
}
