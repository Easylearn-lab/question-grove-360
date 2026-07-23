import { useMemo } from "react";

// ============================================================
// EMOTIONAL STATE DETECTION
// ============================================================
export type EmotionalState = "neutral" | "anxious" | "upset" | "relieved" | "angry" | "guarded";

export interface EmotionHistoryEntry {
  emotion: EmotionalState;
  timestamp: number; // seconds into consultation
  messageIndex: number;
}

const EMOTION_KEYWORDS: Record<EmotionalState, string[]> = {
  anxious: ["worried", "frightened", "scared", "anxious", "nervous", "panic", "terrified", "afraid", "dread", "uneasy", "on edge", "can't sleep", "keep thinking"],
  upset: ["crying", "tearful", "devastated", "sobbing", "tears", "heartbroken", "grief", "loss", "can't stop crying", "breaking down", "overwhelmed"],
  relieved: ["relieved", "thank you", "that helps", "reassured", "better", "glad", "grateful", "weight off", "feel safer", "makes sense", "good to know"],
  angry: ["angry", "frustrated", "unfair", "furious", "annoyed", "ridiculous", "waste of time", "useless", "fed up", "sick of"],
  guarded: ["fine", "okay", "nothing", "don't want to", "leave me alone", "not your business", "whatever", "doesn't matter", "i said i'm fine"],
  neutral: [],
};

export function detectEmotion(text: string): EmotionalState {
  if (!text) return "neutral";
  const lower = text.toLowerCase();

  // Check for guarded first (short clipped responses)
  if (lower.length < 30) {
    for (const keyword of EMOTION_KEYWORDS.guarded) {
      if (lower.includes(keyword)) return "guarded";
    }
  }

  // Priority order: angry > upset > anxious > relieved > guarded > neutral
  for (const keyword of EMOTION_KEYWORDS.angry) {
    if (lower.includes(keyword)) return "angry";
  }
  for (const keyword of EMOTION_KEYWORDS.upset) {
    if (lower.includes(keyword)) return "upset";
  }
  for (const keyword of EMOTION_KEYWORDS.anxious) {
    if (lower.includes(keyword)) return "anxious";
  }
  for (const keyword of EMOTION_KEYWORDS.relieved) {
    if (lower.includes(keyword)) return "relieved";
  }
  // Guarded for longer responses too
  for (const keyword of EMOTION_KEYWORDS.guarded) {
    if (lower.includes(keyword)) return "guarded";
  }

  return "neutral";
}

// ============================================================
// EMOTION DISPLAY CONFIG
// ============================================================
const EMOTION_CONFIG: Record<EmotionalState, { color: string; label: string; animation: string; bodyLanguage: string }> = {
  neutral: { color: "#9CA3AF", label: "", animation: "", bodyLanguage: "Patient appears calm and attentive" },
  anxious: { color: "#F59E0B", label: "appears anxious", animation: "animate-pulse-subtle", bodyLanguage: "Patient fidgets and avoids eye contact" },
  upset: { color: "#3B82F6", label: "appears upset", animation: "animate-pulse-slow", bodyLanguage: "Patient looks down, voice quieter" },
  relieved: { color: "#10B981", label: "appears relieved", animation: "", bodyLanguage: "Patient visibly relaxes, nods" },
  angry: { color: "#EF4444", label: "appears frustrated", animation: "animate-pulse-fast", bodyLanguage: "Patient sits forward, jaw tightened" },
  guarded: { color: "#F97316", label: "appears guarded", animation: "", bodyLanguage: "Patient arms crossed, short answers" },
};

export function getEmotionConfig(emotion: EmotionalState) {
  return EMOTION_CONFIG[emotion];
}

// ============================================================
// PATIENT AVATAR COMPONENT
// ============================================================
interface PatientAvatarProps {
  patientName: string;
  emotion: EmotionalState;
  size?: "sm" | "lg";
  isSpeaking?: boolean;
}

export function PatientAvatar({ patientName, emotion, size = "sm", isSpeaking = false }: PatientAvatarProps) {
  const config = EMOTION_CONFIG[emotion];
  const avatarUrl = useMemo(
    () => `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(patientName)}&backgroundColor=b6e3f4`,
    [patientName]
  );

  const sizeClasses = size === "lg" ? "w-[200px] h-[200px]" : "w-[80px] h-[80px]";
  const borderWidth = size === "lg" ? "border-4" : "border-[3px]";

  return (
    <div className={`relative ${sizeClasses}`}>
      <img
        src={avatarUrl}
        alt={`Patient avatar for ${patientName}`}
        aria-label={patientName}
        className={`rounded-full ${sizeClasses} ${borderWidth} object-cover ${config.animation} ${
          isSpeaking ? "animate-breathe" : ""
        }`}
        style={{
          borderColor: config.color,
          transition: "border-color 0.6s ease-in-out, box-shadow 0.6s ease-in-out",
        }}
      />
    </div>
  );
}

// ============================================================
// EMOTION HISTORY TIMELINE COMPONENT (for debrief)
// ============================================================
interface EmotionTimelineProps {
  history: EmotionHistoryEntry[];
  totalDuration: number; // total consultation seconds
}

export function EmotionTimeline({ history, totalDuration }: EmotionTimelineProps) {
  if (!history.length) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mt-6 p-4 bg-white border border-slate-200 rounded-xl">
      <h3 className="text-sm font-bold text-slate-900 mb-4">Patient Emotional Journey</h3>

      {/* Timeline bar */}
      <div className="relative">
        {/* Background track */}
        <div className="h-2 bg-slate-100 rounded-full w-full relative overflow-hidden">
          {history.map((entry, idx) => {
            const nextEntry = history[idx + 1];
            const startPct = totalDuration > 0 ? (entry.timestamp / totalDuration) * 100 : 0;
            const endPct = nextEntry
              ? (nextEntry.timestamp / totalDuration) * 100
              : 100;
            const config = EMOTION_CONFIG[entry.emotion];
            return (
              <div
                key={idx}
                className="absolute top-0 h-full"
                style={{
                  left: `${startPct}%`,
                  width: `${endPct - startPct}%`,
                  backgroundColor: config.color,
                }}
              />
            );
          })}
        </div>

        {/* Markers */}
        <div className="relative mt-2">
          {history.map((entry, idx) => {
            const leftPct = totalDuration > 0 ? (entry.timestamp / totalDuration) * 100 : 0;
            const config = EMOTION_CONFIG[entry.emotion];
            return (
              <div
                key={idx}
                className="absolute -top-1 flex flex-col items-center"
                style={{ left: `${Math.min(leftPct, 92)}%` }}
              >
                <div
                  className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-[10px] text-slate-500 mt-1 whitespace-nowrap">
                  {formatTime(entry.timestamp)}
                </span>
                <span
                  className="text-[10px] font-medium whitespace-nowrap"
                  style={{ color: config.color }}
                >
                  {entry.emotion === "neutral" ? "calm" : entry.emotion}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-8 pt-3 border-t border-slate-100">
        {(["neutral", "anxious", "upset", "relieved", "angry", "guarded"] as EmotionalState[]).map((emotion) => {
          const config = EMOTION_CONFIG[emotion];
          const count = history.filter(h => h.emotion === emotion).length;
          if (count === 0) return null;
          return (
            <div key={emotion} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
              <span className="text-xs text-slate-600 capitalize">{emotion === "neutral" ? "calm" : emotion} ({count})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
