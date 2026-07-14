import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2, Sparkles, Copy, Check, X, ExternalLink, Paperclip } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_FORMATS = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface ChatImage {
  data: string; // base64
  mimeType: string;
  previewUrl: string; // data URL for preview
}

export default function AICoach() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const [, navigate] = useLocation();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<any | null>(null);
  const [sourcePreviewContent, setSourcePreviewContent] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; sources?: Array<any>; followUpQuestions?: string[]; imagePreview?: string }>>([
    {
      role: "assistant",
      content: `Hello! I'm AI Coach360, your personal study companion. I'm here to help you prepare for your medical exams with personalized guidance.

How can I help you today? I can:
- Explain difficult clinical concepts
- Create personalized study plans
- Help with exam strategy and time management
- Discuss high-yield topics
- Answer questions about medical knowledge
- **Analyse clinical images, ECGs, X-rays, and question screenshots**

Feel free to ask me anything about your exam preparation!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<ChatImage | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const processImageFile = (file: File): Promise<ChatImage | null> => {
    return new Promise((resolve) => {
      // Validate format
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        toast.error("Unsupported format. Please upload JPEG, PNG, GIF, or WebP images.");
        resolve(null);
        return;
      }
      // Validate size
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error("Image too large. Maximum file size is 5MB.");
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        resolve({
          data: base64,
          mimeType: file.type,
          previewUrl: dataUrl,
        });
      };
      reader.onerror = () => {
        toast.error("Failed to read image file.");
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const image = await processImageFile(file);
    if (image) {
      setPendingImage(image);
      toast.success("Image attached. Send your message or press Send to submit.");
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const image = await processImageFile(file);
        if (image) {
          setPendingImage(image);
          toast.success("Image pasted. Send your message or press Send to submit.");
        }
        return;
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer?.types?.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported. Please drop a JPEG, PNG, GIF, or WebP image.");
      return;
    }

    const image = await processImageFile(file);
    if (image) {
      setPendingImage(image);
      toast.success("Image dropped. Send your message or press Send to submit.");
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !pendingImage) return;

    const userMessage = input.trim();
    const imageToSend = pendingImage;
    setInput("");
    setPendingImage(null);

    const newMessages = [
      ...messages,
      {
        role: "user" as const,
        content: userMessage || (imageToSend ? "[Image uploaded]" : ""),
        imagePreview: imageToSend?.previewUrl,
      },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          ...(imageToSend ? { image: { data: imageToSend.data, mimeType: imageToSend.mimeType } } : {}),
        }),
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
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag-and-drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-green-50/90 border-4 border-dashed border-green-400 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Paperclip className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-lg font-semibold text-green-700">Drop image here</p>
            <p className="text-sm text-green-600 mt-1">JPEG, PNG, GIF, or WebP (max 5MB)</p>
          </div>
        </div>
      )}
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
                  {/* Image thumbnail in user message */}
                  {msg.imagePreview && (
                    <div className="mb-3">
                      <img
                        src={msg.imagePreview}
                        alt="Uploaded"
                        className="max-w-[200px] max-h-[150px] rounded-md border border-white/30 object-cover"
                      />
                    </div>
                  )}
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
                  <p className="text-xs font-semibold text-slate-600 mb-2">Sources</p>
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
                          inputRef.current?.focus();
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
          {/* Pending image preview */}
          {pendingImage && (
            <div className="mb-3 flex items-center gap-2">
              <div className="relative inline-block">
                <img
                  src={pendingImage.previewUrl}
                  alt="Pending upload"
                  className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-slate-500">Image attached — type a message or press Send</span>
            </div>
          )}
          <div className="flex gap-3">
            {/* Image upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex-shrink-0 text-slate-500 hover:text-green-600 hover:border-green-300"
              title="Upload image"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              ref={inputRef}
              placeholder="Ask me anything about your exam prep..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleSendMessage();
                }
              }}
              onPaste={handlePaste}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || (!input.trim() && !pendingImage)}
              className="bg-green-600 hover:bg-green-700 text-gray-900"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            AI Coach360 searches live medical databases (NICE Guidelines, PubMed) to provide accurate, cited answers. Upload images for analysis.
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
