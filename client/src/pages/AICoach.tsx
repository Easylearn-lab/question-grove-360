import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2, Sparkles, Copy, Check, X, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

export default function AICoach() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const [, navigate] = useLocation();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<any | null>(null);
  const [sourcePreviewContent, setSourcePreviewContent] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; sources?: Array<any>; followUpQuestions?: string[] }>>([
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

  const handleOpenSourcePreview = async (source: any) => {
    setSelectedSource(source);
    setIsLoadingPreview(true);
    try {
      const response = await fetch(source.url);
      if (response.ok) {
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const text = doc.body.innerText || html.substring(0, 1000);
        setSourcePreviewContent(text.substring(0, 2000));
      } else {
        setSourcePreviewContent("Unable to load preview. Click the link to view in a new tab.");
      }
    } catch (error) {
      setSourcePreviewContent("Unable to load preview. Click the link to view in a new tab.");
    } finally {
      setIsLoadingPreview(false);
    }
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
      
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, sources: data.sources, followUpQuestions: data.followUpQuestions }]);
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
              <h1 className="text-lg font-semibold text-slate-900">AI Coach360</h1>
              <p className="text-xs text-slate-500">Medical exam preparation assistant</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
        <div className="space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx}>
              <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
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
              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <div className="w-full max-w-2xl mx-auto mt-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs font-semibold text-slate-600 mb-2">📚 Sources</p>
                  <div className="space-y-2">
                    {msg.sources.map((source: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenSourcePreview(source)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline text-left flex-1 truncate"
                          title={source.title}
                        >
                          [{i + 1}] {source.source} — {source.title}
                        </button>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {msg.role === "assistant" && msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                <div className="w-full max-w-2xl mx-auto mt-3 flex flex-wrap gap-2">
                  {msg.followUpQuestions.map((question: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(question);
                        setTimeout(() => {
                          const inputEl = document.querySelector('input[placeholder]') as HTMLInputElement;
                          inputEl?.focus();
                        }, 100);
                      }}
                      className="text-xs px-3 py-2 bg-white border border-green-200 text-green-700 rounded-full hover:bg-green-50 hover:border-green-300 transition-all duration-150 active:scale-95"
                    >
                      {question}
                    </button>
                  ))}
                </div>
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
            AI Coach360 searches live medical databases (NICE Guidelines, PubMed) to provide accurate, cited answers.
          </p>
        </div>
      </footer>

      {/* Source Preview Modal */}
      {selectedSource && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-lg sm:rounded-lg w-full sm:w-2/3 lg:w-1/2 max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-500 mb-1">{selectedSource.source}</p>
                <h3 className="text-sm font-semibold text-slate-900 truncate">{selectedSource.title}</h3>
              </div>
              <button
                onClick={() => setSelectedSource(null)}
                className="flex-shrink-0 ml-2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                </div>
              ) : (
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                  {sourcePreviewContent}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 p-4 flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSource(null)}
                className="flex-1"
              >
                Close
              </Button>
              <a
                href={selectedSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-gray-900">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Full Page
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
