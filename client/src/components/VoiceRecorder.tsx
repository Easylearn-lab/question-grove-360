import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onTranscriptReceived?: (transcript: string) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
}

export function VoiceRecorder({
  onTranscriptReceived,
  onRecordingStart,
  onRecordingStop,
  disabled,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      onRecordingStart?.();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Unable to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingStop?.();
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      // Upload to backend for transcription
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      setTranscript(data.transcript);
      onTranscriptReceived?.(data.transcript);
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error("Failed to transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            disabled={disabled || isTranscribing}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
          >
            <Mic className="w-4 h-4" />
            Start Recording
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700"
          >
            <Square className="w-4 h-4" />
            Stop Recording
          </Button>
        )}

        {isTranscribing && (
          <Button disabled className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Transcribing...
          </Button>
        )}
      </div>

      {transcript && (
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Transcript:
          </p>
          <p className="text-slate-600 dark:text-slate-400">{transcript}</p>
        </div>
      )}
    </div>
  );
}
