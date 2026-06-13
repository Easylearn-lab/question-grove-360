import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mic, MicOff, Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { useSubscription } from "@/hooks/useSubscription";

const SCA_CASES = [
  {
    id: 1,
    title: "Acute Chest Pain",
    specialty: "Cardiology",
    difficulty: "Medium",
    scenario: "A 55-year-old male presents with acute onset central chest pain radiating to the left arm, associated with dyspnea and diaphoresis.",
  },
  {
    id: 2,
    title: "Abdominal Pain",
    specialty: "Gastroenterology",
    difficulty: "Hard",
    scenario: "A 42-year-old female presents with acute right upper quadrant pain, fever, and jaundice.",
  },
  {
    id: 3,
    title: "Shortness of Breath",
    specialty: "Respiratory",
    difficulty: "Medium",
    scenario: "A 68-year-old male with COPD history presents with acute dyspnea and productive cough.",
  },
];

export default function SCASimulator() {
  const { user, isAuthenticated, loading, isReady } = useProtectedRoute();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [, navigate] = useLocation();
  const [selectedCase, setSelectedCase] = useState<typeof SCA_CASES[0] | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Voice mutations
  const uploadAudioMutation = trpc.voice.uploadAudio.useMutation();
  const transcribeMutation = trpc.voice.transcribe.useMutation();

  useEffect(() => {
    if (!isAuthenticated && !subLoading) {
      navigate("/");
    }
  }, [isAuthenticated, subLoading, navigate]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        // Convert blob to base64 and send to backend for transcription
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(",")[1];
            if (!base64) {
              toast.error("Failed to process audio");
              return;
            }
            try {
              // Upload audio
              const uploadResult = await uploadAudioMutation.mutateAsync({
                audioBase64: base64,
                mimeType: "audio/webm",
              });
              // Transcribe
              const transcribeResult = await transcribeMutation.mutateAsync({
                audioUrl: uploadResult.url,
                language: "en",
              });
              setTranscript(transcribeResult.text);
              toast.success("Voice transcribed successfully");
            } catch (err: any) {
              toast.error(err.message || "Transcription failed");
            }
          };
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          toast.error("Failed to process audio recording");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error("Unable to access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendMessage = async () => {
    const messageText = manualInput || transcript;
    if (!messageText.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: messageText }]);
    setManualInput("");
    setTranscript("");
    setIsLoading(true);

    // Simulate patient response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Thank you for that information. Let me ask you a follow-up question: How long have you been experiencing this symptom? Any associated symptoms like nausea or shortness of breath?",
        },
      ]);
      setIsLoading(false);
    }, 1500);
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!selectedCase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">SCA Consultation Simulator</h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <SubscriptionGate isPremium={isPremium} featureName="SCA Consultation Simulator">
          <div className="grid md:grid-cols-3 gap-6">
            {SCA_CASES.map((caseItem) => (
              <Card
                key={caseItem.id}
                className="p-6 border-slate-200 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedCase(caseItem)}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{caseItem.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full">
                      {caseItem.specialty}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        caseItem.difficulty === "Easy"
                          ? "bg-green-100 text-green-700"
                          : caseItem.difficulty === "Medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {caseItem.difficulty}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-6">{caseItem.scenario}</p>
                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                  Start Consultation
                </Button>
              </Card>
            ))}
          </div>
          </SubscriptionGate>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCase(null)}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{selectedCase.title}</h1>
              <p className="text-sm text-slate-600">{selectedCase.specialty}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              {messages.length} messages
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Case Scenario */}
        <Card className="p-6 border-slate-200 mb-8 bg-blue-50 border-blue-200">
          <h2 className="font-bold text-slate-900 mb-2">Patient Scenario</h2>
          <p className="text-slate-700">{selectedCase.scenario}</p>
        </Card>

        {/* Conversation */}
        <Card className="p-6 border-slate-200 mb-8 h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <Mic className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Start the consultation by speaking or typing your response</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.role === "user"
                        ? "bg-teal-600 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-900 px-4 py-2 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Input Area */}
        <Card className="p-6 border-slate-200">
          <div className="space-y-4">
            {/* Transcript Display */}
            {transcript && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Transcript:</p>
                <p className="text-slate-900">{transcript}</p>
              </div>
            )}

            {/* Manual Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Type your response or use voice..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !isLoading) {
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
              />
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant="outline"
                className={isRecording ? "bg-red-50 border-red-300" : ""}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4 text-red-600" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || (!manualInput && !transcript)}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Feedback Section */}
        {messages.length > 5 && (
          <Card className="mt-8 p-6 border-slate-200 bg-green-50 border-green-200">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-green-900 mb-2">Consultation Feedback</h3>
                <p className="text-sm text-green-800 mb-3">
                  Good questioning approach! You covered the key areas of history taking. Consider asking more about past medical history and medications.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-green-700 font-medium">History Taking</p>
                    <p className="text-lg font-bold text-green-900">8/10</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700 font-medium">Communication</p>
                    <p className="text-lg font-bold text-green-900">9/10</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700 font-medium">Clinical Reasoning</p>
                    <p className="text-lg font-bold text-green-900">7/10</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
