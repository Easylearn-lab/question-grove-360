import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, X, MessageCircle } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AICoachWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessageMutation = trpc.aiCoach.sendMessage.useMutation();
  const getChatHistoryQuery = trpc.aiCoach.getChatHistory.useQuery(
    { limit: 50 },
    { enabled: isOpen }
  );

  // Load chat history when widget opens
  useEffect(() => {
    if (isOpen && getChatHistoryQuery.data) {
      const historyMessages = getChatHistoryQuery.data.map((msg, idx) => ({
        id: `history-${idx}`,
        role: msg.role as "user" | "assistant",
        content: msg.message,
        timestamp: msg.createdAt,
      }));
      setMessages(historyMessages);
    }
  }, [isOpen, getChatHistoryQuery.data]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendMessageMutation.mutateAsync({
        message: input,
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.message,
        timestamp: response.timestamp,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast.error("Failed to get response from AI Coach");
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-gray-900 shadow-lg transition-all hover:scale-110"
        title="Open AI Coach360"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-40 w-96 h-[600px] flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-green-600 text-gray-900 rounded-t-lg">
        <div>
          <h3 className="font-semibold">AI Coach360</h3>
          <p className="text-xs text-green-100">Your personal exam coach</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-green-700"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">
                Hi! I'm your AI Coach. Ask me anything about your exam preparation, study strategy, or weak areas.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-green-600 text-gray-900 rounded-br-none"
                      : "bg-gray-100 text-gray-900 rounded-bl-none"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Streamdown>{msg.content}</Streamdown>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t p-4 bg-gray-50 rounded-b-lg">
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="text-sm"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}
