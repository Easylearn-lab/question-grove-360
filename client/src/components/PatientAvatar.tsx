import { useMemo } from "react";

// ============================================================
// EMOTIONAL STATE DETECTION
// ============================================================
export type EmotionalState = "neutral" | "anxious" | "upset" | "relieved" | "angry" | "guarded";

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
const EMOTION_CONFIG: Record<EmotionalState, { color: string; label: string; animation: string }> = {
  neutral: { color: "#9CA3AF", label: "", animation: "" },
  anxious: { color: "#F59E0B", label: "appears anxious", animation: "animate-pulse-subtle" },
  upset: { color: "#3B82F6", label: "appears upset", animation: "animate-pulse-slow" },
  relieved: { color: "#10B981", label: "appears relieved", animation: "" },
  angry: { color: "#EF4444", label: "appears frustrated", animation: "animate-pulse-fast" },
  guarded: { color: "#F97316", label: "appears guarded", animation: "" },
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
        style={{ borderColor: config.color }}
      />
    </div>
  );
}
