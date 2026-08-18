import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Paperclip } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_FORMATS = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface ChatImage {
  data: string;
  mimeType: string;
  previewUrl: string;
}

export function AICoachFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; imagePreview?: string }>>([
    { role: "assistant", content: "Hello! I'm your AI Coach360. I'm here to help you ace your medical exams. What would you like to work on today? You can also upload images for analysis." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<ChatImage | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const processImageFile = (file: File): Promise<ChatImage | null> => {
    return new Promise((resolve) => {
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        toast.error("Unsupported format. Please upload JPEG, PNG, GIF, or WebP.");
        resolve(null);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error("Image too large. Maximum file size is 5MB.");
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        resolve({ data: base64, mimeType: file.type, previewUrl: dataUrl });
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
      toast.success("Image attached.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          toast.success("Image pasted.");
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
      toast.success("Image dropped. Send your message or press Send.");
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !pendingImage) return;

    const userMessage = input.trim();
    const imageToSend = pendingImage;
    setInput("");
    setPendingImage(null);

    const newUserMsg = {
      role: "user" as const,
      content: userMessage || (imageToSend ? "[Image uploaded]" : ""),
      imagePreview: imageToSend?.previewUrl,
    };
    const newMessages = [...messages, newUserMsg];
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

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-gray-900 shadow-lg flex items-center justify-center transition-all ${
          isOpen ? "scale-0" : "scale-100"
        }`}
        style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9998 }}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Slide-in Panel */}
      {isOpen && (
        <div
          className="w-full sm:w-96 h-screen sm:h-[600px] bg-white rounded-t-lg sm:rounded-lg shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300 relative"
          style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999, maxHeight: "calc(100vh - 40px)" }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag-and-drop overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-green-50/90 border-4 border-dashed border-green-400 rounded-lg flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Paperclip className="w-10 h-10 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-green-700">Drop image here</p>
                <p className="text-xs text-green-600 mt-1">JPEG, PNG, GIF, WebP (max 5MB)</p>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-gray-900 p-4 rounded-t-lg sm:rounded-t-lg flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">AI Coach360</h3>
              <p className="text-sm text-green-100">Your personalized study assistant</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-green-800 p-2 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.role === "user" ? "bg-green-600 text-gray-900 rounded-br-none" : "bg-gray-200 text-gray-900 rounded-bl-none"
                  }`}
                >
                  {/* Image thumbnail */}
                  {msg.imagePreview && (
                    <div className="mb-2">
                      <img
                        src={msg.imagePreview}
                        alt="Uploaded"
                        className="max-w-[140px] max-h-[100px] rounded object-cover border border-white/30"
                      />
                    </div>
                  )}
                  {msg.role === "assistant" ? <Streamdown>{msg.content}</Streamdown> : <p>{msg.content}</p>}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            {/* Pending image preview */}
            {pendingImage && (
              <div className="mb-2 flex items-center gap-2">
                <div className="relative inline-block">
                  <img
                    src={pendingImage.previewUrl}
                    alt="Pending"
                    className="w-10 h-10 rounded object-cover border border-gray-200"
                  />
                  <button
                    onClick={() => setPendingImage(null)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
                <span className="text-xs text-gray-500">Image attached</span>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
                title="Upload image"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                onPaste={handlePaste}
                placeholder="Ask me anything..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !pendingImage)}
                className="bg-green-600 hover:bg-green-700 text-gray-900 p-2 rounded-lg transition-all disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
