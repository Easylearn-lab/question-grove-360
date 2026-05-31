import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AICoachChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Simulate AI response with context injection
      const response = await new Promise<string>((resolve) => {
        setTimeout(() => {
          const responses = [
            "Based on your recent performance, I notice you're struggling with cardiology questions. Let's focus on the pathophysiology of heart failure. Here are the key concepts:\n\n1. **Systolic vs Diastolic Dysfunction** - The difference lies in ejection fraction\n2. **Compensatory Mechanisms** - Frank-Starling mechanism, neurohormonal activation\n3. **Clinical Presentation** - Orthopnea, PND, peripheral edema\n\nWould you like me to explain any of these in detail?",
            "Great question! Your accuracy on respiratory questions is 82%, which is above the platform average of 75%. To improve further, focus on:\n\n- **Obstructive vs Restrictive patterns** on spirometry\n- **Gas exchange abnormalities** in different lung diseases\n- **Ventilation-Perfusion mismatch** concepts\n\nI recommend practicing 20 more respiratory questions before your next mock exam.",
            "Your study streak is impressive! You've been consistent for 15 days. To maintain momentum:\n\n1. **Increase mock exam frequency** - Try one full-length exam per week\n2. **Focus on weak areas** - Gastroenterology needs attention (68% accuracy)\n3. **Review high-yield topics** - Spend 30 minutes daily on Note360\n\nYour pass probability for MRCGP is currently 78%. Keep it up!",
          ];
          resolve(responses[Math.floor(Math.random() * responses.length)]);
        }, 1500);
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Failed to get AI response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-teal-700 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">AI Coach360</h3>
            <p className="text-xs text-slate-600">Personalized study guidance powered by your performance</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Start a conversation with your AI Coach</p>
              <p className="text-sm text-slate-500 mt-1">Ask for study tips, performance insights, or exam strategies</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-teal-600 text-white rounded-br-none"
                    : "bg-slate-100 text-slate-900 rounded-bl-none"
                }`}
              >
                {message.role === "assistant" ? (
                  <Streamdown>{message.content}</Streamdown>
                ) : (
                  <p>{message.content}</p>
                )}
                <p className={`text-xs mt-2 ${message.role === "user" ? "text-teal-100" : "text-slate-500"}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-900 px-4 py-3 rounded-lg rounded-bl-none">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask your coach..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
