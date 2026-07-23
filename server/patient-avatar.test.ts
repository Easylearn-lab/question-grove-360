import { describe, it, expect } from "vitest";

// Replicate the emotion detection logic from the component for testing
type EmotionalState = "neutral" | "anxious" | "upset" | "relieved" | "angry" | "guarded";

interface EmotionHistoryEntry {
  emotion: EmotionalState;
  timestamp: number;
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

const EMOTION_CONFIG: Record<EmotionalState, { color: string; label: string; animation: string; bodyLanguage: string }> = {
  neutral: { color: "#9CA3AF", label: "", animation: "", bodyLanguage: "Patient appears calm and attentive" },
  anxious: { color: "#F59E0B", label: "appears anxious", animation: "animate-pulse-subtle", bodyLanguage: "Patient fidgets and avoids eye contact" },
  upset: { color: "#3B82F6", label: "appears upset", animation: "animate-pulse-slow", bodyLanguage: "Patient looks down, voice quieter" },
  relieved: { color: "#10B981", label: "appears relieved", animation: "", bodyLanguage: "Patient visibly relaxes, nods" },
  angry: { color: "#EF4444", label: "appears frustrated", animation: "animate-pulse-fast", bodyLanguage: "Patient sits forward, jaw tightened" },
  guarded: { color: "#F97316", label: "appears guarded", animation: "", bodyLanguage: "Patient arms crossed, short answers" },
};

function detectEmotion(text: string): EmotionalState {
  if (!text) return "neutral";
  const lower = text.toLowerCase();

  if (lower.length < 30) {
    for (const keyword of EMOTION_KEYWORDS.guarded) {
      if (lower.includes(keyword)) return "guarded";
    }
  }

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
  for (const keyword of EMOTION_KEYWORDS.guarded) {
    if (lower.includes(keyword)) return "guarded";
  }

  return "neutral";
}

describe("Emotion Detection", () => {
  it("returns neutral for empty text", () => {
    expect(detectEmotion("")).toBe("neutral");
    expect(detectEmotion(null as any)).toBe("neutral");
  });

  it("detects anxious emotions", () => {
    expect(detectEmotion("I'm really worried about this lump I found")).toBe("anxious");
    expect(detectEmotion("I'm so scared it might be cancer")).toBe("anxious");
    expect(detectEmotion("I've been feeling nervous and on edge all week")).toBe("anxious");
    expect(detectEmotion("I can't sleep because I keep thinking about it")).toBe("anxious");
  });

  it("detects upset emotions", () => {
    expect(detectEmotion("I can't stop crying since my mother passed away")).toBe("upset");
    expect(detectEmotion("I feel devastated by the news")).toBe("upset");
    expect(detectEmotion("The tears just won't stop coming")).toBe("upset");
    expect(detectEmotion("I'm completely overwhelmed by everything")).toBe("upset");
  });

  it("detects relieved emotions", () => {
    expect(detectEmotion("Oh thank you doctor, that really helps me understand")).toBe("relieved");
    expect(detectEmotion("I feel so relieved to hear that")).toBe("relieved");
    expect(detectEmotion("That makes sense, I feel much better now")).toBe("relieved");
    expect(detectEmotion("I'm grateful you took the time to explain")).toBe("relieved");
  });

  it("detects angry emotions", () => {
    expect(detectEmotion("I'm so angry that nobody listened to me before")).toBe("angry");
    expect(detectEmotion("This is ridiculous, I've been waiting for months")).toBe("angry");
    expect(detectEmotion("I'm frustrated that nothing seems to work")).toBe("angry");
    expect(detectEmotion("I'm fed up with being passed from doctor to doctor")).toBe("angry");
  });

  it("detects guarded emotions for short responses", () => {
    expect(detectEmotion("I'm fine.")).toBe("guarded");
    expect(detectEmotion("It's nothing.")).toBe("guarded");
    expect(detectEmotion("Whatever.")).toBe("guarded");
    expect(detectEmotion("I'm okay.")).toBe("guarded");
  });

  it("detects guarded emotions in longer responses too", () => {
    expect(detectEmotion("Look, I don't want to talk about this anymore, it doesn't matter what happened")).toBe("guarded");
  });

  it("returns neutral for generic text without emotional keywords", () => {
    expect(detectEmotion("I've had this cough for about two weeks now")).toBe("neutral");
    expect(detectEmotion("The pain is in my lower back and radiates down my leg")).toBe("neutral");
    expect(detectEmotion("I take metformin twice a day with meals")).toBe("neutral");
  });

  it("prioritizes angry over other emotions when multiple keywords present", () => {
    expect(detectEmotion("I'm angry and worried about what's happening to me")).toBe("angry");
    expect(detectEmotion("I'm frustrated and scared about the results")).toBe("angry");
  });

  it("prioritizes upset over anxious when both present", () => {
    expect(detectEmotion("I'm crying because I'm so worried about everything")).toBe("upset");
  });
});

describe("Avatar URL Generation", () => {
  it("generates consistent DiceBear URL from patient name", () => {
    const patientName = "Daniel Okafor";
    const url = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(patientName)}&backgroundColor=b6e3f4`;
    expect(url).toBe("https://api.dicebear.com/7.x/personas/svg?seed=Daniel%20Okafor&backgroundColor=b6e3f4");
  });

  it("produces same URL for same patient name (consistency)", () => {
    const name = "Sarah Mitchell";
    const url1 = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4`;
    const url2 = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4`;
    expect(url1).toBe(url2);
  });

  it("produces different URLs for different patient names", () => {
    const url1 = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent("Daniel Okafor")}&backgroundColor=b6e3f4`;
    const url2 = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent("Sarah Mitchell")}&backgroundColor=b6e3f4`;
    expect(url1).not.toBe(url2);
  });
});

describe("Emotion Config", () => {
  it("neutral has no label (no text shown)", () => {
    expect(EMOTION_CONFIG.neutral.label).toBe("");
  });

  it("each non-neutral emotion has a label", () => {
    expect(EMOTION_CONFIG.anxious.label).toBeTruthy();
    expect(EMOTION_CONFIG.upset.label).toBeTruthy();
    expect(EMOTION_CONFIG.relieved.label).toBeTruthy();
    expect(EMOTION_CONFIG.angry.label).toBeTruthy();
    expect(EMOTION_CONFIG.guarded.label).toBeTruthy();
  });

  it("anxious uses amber color", () => {
    expect(EMOTION_CONFIG.anxious.color).toBe("#F59E0B");
  });

  it("upset uses blue color", () => {
    expect(EMOTION_CONFIG.upset.color).toBe("#3B82F6");
  });

  it("relieved uses green color", () => {
    expect(EMOTION_CONFIG.relieved.color).toBe("#10B981");
  });

  it("angry uses red color", () => {
    expect(EMOTION_CONFIG.angry.color).toBe("#EF4444");
  });

  it("guarded uses orange color", () => {
    expect(EMOTION_CONFIG.guarded.color).toBe("#F97316");
  });
});

describe("Body Language Cues", () => {
  it("neutral shows calm and attentive", () => {
    expect(EMOTION_CONFIG.neutral.bodyLanguage).toBe("Patient appears calm and attentive");
  });

  it("anxious shows fidgeting and avoiding eye contact", () => {
    expect(EMOTION_CONFIG.anxious.bodyLanguage).toBe("Patient fidgets and avoids eye contact");
  });

  it("upset shows looking down and quieter voice", () => {
    expect(EMOTION_CONFIG.upset.bodyLanguage).toBe("Patient looks down, voice quieter");
  });

  it("relieved shows relaxing and nodding", () => {
    expect(EMOTION_CONFIG.relieved.bodyLanguage).toBe("Patient visibly relaxes, nods");
  });

  it("angry shows sitting forward and jaw tightened", () => {
    expect(EMOTION_CONFIG.angry.bodyLanguage).toBe("Patient sits forward, jaw tightened");
  });

  it("guarded shows arms crossed and short answers", () => {
    expect(EMOTION_CONFIG.guarded.bodyLanguage).toBe("Patient arms crossed, short answers");
  });

  it("every emotion has a body language cue", () => {
    const emotions: EmotionalState[] = ["neutral", "anxious", "upset", "relieved", "angry", "guarded"];
    emotions.forEach(e => {
      expect(EMOTION_CONFIG[e].bodyLanguage).toBeTruthy();
      expect(EMOTION_CONFIG[e].bodyLanguage.length).toBeGreaterThan(10);
    });
  });
});

describe("Emotion History Tracking", () => {
  it("builds history entries with correct structure", () => {
    const entry: EmotionHistoryEntry = {
      emotion: "anxious",
      timestamp: 45,
      messageIndex: 3,
    };
    expect(entry.emotion).toBe("anxious");
    expect(entry.timestamp).toBe(45);
    expect(entry.messageIndex).toBe(3);
  });

  it("simulates a consultation emotion journey", () => {
    const responses = [
      "I've had this cough for about two weeks now",
      "I'm really worried it might be something serious",
      "I'm so scared, my father died of lung cancer",
      "Oh thank you doctor, that makes sense now",
      "I feel much better knowing it's probably not cancer",
    ];

    const history: EmotionHistoryEntry[] = [];
    let prevEmotion: EmotionalState = "neutral";

    responses.forEach((text, idx) => {
      const emotion = detectEmotion(text);
      if (emotion !== prevEmotion) {
        history.push({ emotion, timestamp: (idx + 1) * 60, messageIndex: idx });
        prevEmotion = emotion;
      }
    });

    // neutral -> anxious (worried) -> anxious (scared, same so no change) -> relieved (thank you) -> relieved (better, same)
    // So: history = [anxious@60, relieved@240]
    expect(history.length).toBe(2);
    expect(history[0].emotion).toBe("anxious");
    expect(history[1].emotion).toBe("relieved");
  });

  it("only records state changes, not repeated same states", () => {
    const responses = [
      "I'm worried about this",
      "I'm so scared and anxious",
      "I'm nervous about the results",
    ];

    const history: EmotionHistoryEntry[] = [];
    let prevEmotion: EmotionalState = "neutral";

    responses.forEach((text, idx) => {
      const emotion = detectEmotion(text);
      if (emotion !== prevEmotion) {
        history.push({ emotion, timestamp: (idx + 1) * 30, messageIndex: idx });
        prevEmotion = emotion;
      }
    });

    // All three are "anxious", so only one entry
    expect(history.length).toBe(1);
    expect(history[0].emotion).toBe("anxious");
  });

  it("records multiple transitions correctly", () => {
    const responses = [
      "I'm really worried about this lump",
      "I'm so angry nobody took me seriously before",
      "Thank you doctor, that helps me understand",
    ];

    const history: EmotionHistoryEntry[] = [];
    let prevEmotion: EmotionalState = "neutral";

    responses.forEach((text, idx) => {
      const emotion = detectEmotion(text);
      if (emotion !== prevEmotion) {
        history.push({ emotion, timestamp: (idx + 1) * 60, messageIndex: idx });
        prevEmotion = emotion;
      }
    });

    expect(history.length).toBe(3);
    expect(history[0].emotion).toBe("anxious");
    expect(history[1].emotion).toBe("angry");
    expect(history[2].emotion).toBe("relieved");
  });

  it("timestamps increase monotonically", () => {
    const history: EmotionHistoryEntry[] = [
      { emotion: "anxious", timestamp: 30, messageIndex: 1 },
      { emotion: "angry", timestamp: 90, messageIndex: 3 },
      { emotion: "relieved", timestamp: 180, messageIndex: 5 },
    ];

    for (let i = 1; i < history.length; i++) {
      expect(history[i].timestamp).toBeGreaterThan(history[i - 1].timestamp);
    }
  });
});

describe("Emotion Timeline Formatting", () => {
  it("formats seconds into m:ss", () => {
    const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    };

    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(30)).toBe("0:30");
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(90)).toBe("1:30");
    expect(formatTime(720)).toBe("12:00");
  });

  it("calculates correct percentage positions for timeline markers", () => {
    const totalDuration = 720; // 12 minutes
    const history: EmotionHistoryEntry[] = [
      { emotion: "anxious", timestamp: 60, messageIndex: 1 },
      { emotion: "relieved", timestamp: 360, messageIndex: 5 },
    ];

    const positions = history.map(e => (e.timestamp / totalDuration) * 100);
    expect(positions[0]).toBeCloseTo(8.33, 1);
    expect(positions[1]).toBe(50);
  });
});
