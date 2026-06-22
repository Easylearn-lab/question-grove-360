import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2, Sparkles, Copy, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

export default function AICoach() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const [, navigate] = useLocation();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `Hello! I'm AI Coach360, your personal study companion. I'm here to help you prepare for your medical exams with personalized guidance.

How can I help you today? I can:
- Explain difficult clinical concepts
- Create personalized study plans
- Help with exam strategy and time management
- Discuss high-yield topics
- Answer questions about medical knowledge

Feel free to ask me anything about your exam preparation!`,
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

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error("Failed to get AI response");
      const data = await response.json();
      
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
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
            <Sparkles className="w-6 h-6 text-green-600" />
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
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
              <div
                className={`max-w-2xl px-6 py-4 rounded-lg ${
                  msg.role === "user"
                    ? "bg-green-600 text-gray-900"
                    : "bg-white border border-slate-200 text-slate-900"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Streamdown>{msg.content}</Streamdown>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
              {msg.role === "assistant" && (
                <button
                  onClick={() => handleCopyMessage(msg.content, idx)}
                  className="self-start mt-1 p-2 rounded hover:bg-slate-100 transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedIdx === idx ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  )}
                </button>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 text-slate-900 px-6 py-4 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-green-600" />
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
              className="bg-green-600 hover:bg-green-700 text-gray-900"
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
