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

// ============================================================
// EMPATHY SCORE CALCULATION
// ============================================================
const NEGATIVE_EMOTIONS: EmotionalState[] = ["anxious", "upset", "angry", "guarded"];
const POSITIVE_EMOTIONS: EmotionalState[] = ["relieved"];

export interface EmpathyScoreResult {
  score: number; // 0-100 percentage
  breakdown: {
    resolutionSpeed: number; // 0-40 points: how quickly negative states were resolved
    finalState: number; // 0-30 points: whether patient ended relieved/neutral
    distressEscalation: number; // 0-30 points: fewer distress escalations = higher score
  };
  explanation: string;
}

export function calculateEmpathyScore(history: EmotionHistoryEntry[], totalDuration: number): EmpathyScoreResult {
  if (!history.length || totalDuration <= 0) {
    return {
      score: 50,
      breakdown: { resolutionSpeed: 20, finalState: 15, distressEscalation: 15 },
      explanation: "No emotional state changes were detected during this consultation.",
    };
  }

  // 1. Resolution Speed (0-40 points)
  // Measure how quickly negative emotions transition to neutral/positive
  let resolutionSpeed = 40; // Start at max, deduct for slow resolutions
  let negativeStartTime: number | null = null;

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    if (NEGATIVE_EMOTIONS.includes(entry.emotion)) {
      if (negativeStartTime === null) {
        negativeStartTime = entry.timestamp;
      }
    } else if (negativeStartTime !== null) {
      // Resolved: calculate time spent negative
      const durationNegative = entry.timestamp - negativeStartTime;
      const proportionOfConsultation = durationNegative / totalDuration;
      // Deduct up to 10 points per unresolved stretch
      resolutionSpeed -= Math.min(10, Math.round(proportionOfConsultation * 40));
      negativeStartTime = null;
    }
  }
  // If still negative at end, deduct more
  if (negativeStartTime !== null) {
    const durationNegative = totalDuration - negativeStartTime;
    const proportionOfConsultation = durationNegative / totalDuration;
    resolutionSpeed -= Math.min(15, Math.round(proportionOfConsultation * 40));
  }
  resolutionSpeed = Math.max(0, Math.min(40, resolutionSpeed));

  // 2. Final State (0-30 points)
  const lastEmotion = history[history.length - 1].emotion;
  let finalState = 15; // neutral default
  if (POSITIVE_EMOTIONS.includes(lastEmotion)) {
    finalState = 30; // ended relieved/reassured
  } else if (lastEmotion === "neutral") {
    finalState = 20; // ended calm
  } else if (lastEmotion === "guarded") {
    finalState = 10; // still guarded
  } else if (NEGATIVE_EMOTIONS.includes(lastEmotion)) {
    finalState = 5; // ended distressed
  }

  // 3. Distress Escalation (0-30 points)
  // Count how many times the patient became MORE distressed (moved to a worse state)
  const SEVERITY: Record<EmotionalState, number> = {
    relieved: 0,
    neutral: 1,
    guarded: 2,
    anxious: 3,
    upset: 4,
    angry: 5,
  };

  let escalationCount = 0;
  for (let i = 1; i < history.length; i++) {
    if (SEVERITY[history[i].emotion] > SEVERITY[history[i - 1].emotion]) {
      escalationCount++;
    }
  }
  // 0 escalations = 30pts, 1 = 22pts, 2 = 15pts, 3+ = 8pts
  let distressEscalation = 30;
  if (escalationCount === 1) distressEscalation = 22;
  else if (escalationCount === 2) distressEscalation = 15;
  else if (escalationCount >= 3) distressEscalation = 8;

  const score = Math.min(100, Math.max(0, resolutionSpeed + finalState + distressEscalation));

  // Generate explanation
  let explanation = "";
  if (score >= 80) {
    explanation = "Excellent empathetic communication. You resolved the patient's concerns effectively and they felt reassured by the end of the consultation.";
  } else if (score >= 60) {
    explanation = "Good empathetic approach. The patient's emotional state improved during the consultation, though there is room to address concerns more promptly.";
  } else if (score >= 40) {
    explanation = "Moderate empathy demonstrated. Consider acknowledging the patient's emotions earlier and using more reassurance techniques to prevent distress escalation.";
  } else {
    explanation = "The patient remained distressed throughout the consultation. Focus on active listening, validating emotions, and providing clear reassurance earlier in the conversation.";
  }

  return {
    score,
    breakdown: { resolutionSpeed, finalState, distressEscalation },
    explanation,
  };
}
