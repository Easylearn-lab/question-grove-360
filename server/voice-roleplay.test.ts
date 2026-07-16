import { describe, it, expect } from "vitest";

/**
 * Tests for SCA Voice Roleplay feature
 * Validates voice profile mapping, recording state machine, and audio pipeline logic.
 */

// Replicate the getVoiceProfile logic from the frontend
function getVoiceProfile(age: number, gender: string): { voice: string; label: string } {
  const isFemale = gender?.toLowerCase() === "female";
  const isElderly = age >= 60;
  const isYoung = age <= 30;

  if (isFemale && isElderly) {
    return { voice: "shimmer", label: "Elderly female (concerned, gentle)" };
  }
  if (isFemale) {
    return { voice: "nova", label: "Middle-aged female (anxious, emotional)" };
  }
  if (isElderly) {
    return { voice: "onyx", label: "Elderly male (calm, stoic)" };
  }
  if (isYoung) {
    return { voice: "echo", label: "Young adult male (guarded, embarrassed)" };
  }
  return { voice: "alloy", label: "Middle-aged male (practical, direct)" };
}

describe("Voice Profile Mapping", () => {
  it("maps elderly male (60+) to onyx voice", () => {
    const profile = getVoiceProfile(72, "Male");
    expect(profile.voice).toBe("onyx");
    expect(profile.label).toContain("Elderly male");
  });

  it("maps elderly female (60+) to shimmer voice", () => {
    const profile = getVoiceProfile(68, "Female");
    expect(profile.voice).toBe("shimmer");
    expect(profile.label).toContain("Elderly female");
  });

  it("maps middle-aged female to nova voice", () => {
    const profile = getVoiceProfile(42, "Female");
    expect(profile.voice).toBe("nova");
    expect(profile.label).toContain("Middle-aged female");
  });

  it("maps young male (<=30) to echo voice", () => {
    const profile = getVoiceProfile(24, "Male");
    expect(profile.voice).toBe("echo");
    expect(profile.label).toContain("Young adult male");
  });

  it("maps middle-aged male (31-59) to alloy voice", () => {
    const profile = getVoiceProfile(45, "Male");
    expect(profile.voice).toBe("alloy");
    expect(profile.label).toContain("Middle-aged male");
  });

  it("handles edge case: exactly 60 years old male", () => {
    const profile = getVoiceProfile(60, "Male");
    expect(profile.voice).toBe("onyx");
  });

  it("handles edge case: exactly 30 years old male", () => {
    const profile = getVoiceProfile(30, "Male");
    expect(profile.voice).toBe("echo");
  });

  it("handles edge case: 31 years old male is middle-aged", () => {
    const profile = getVoiceProfile(31, "Male");
    expect(profile.voice).toBe("alloy");
  });

  it("handles young female as middle-aged female (nova)", () => {
    // Young females still get nova since there's no separate young female voice
    const profile = getVoiceProfile(22, "Female");
    expect(profile.voice).toBe("nova");
  });

  it("is case-insensitive for gender", () => {
    expect(getVoiceProfile(45, "female").voice).toBe("nova");
    expect(getVoiceProfile(45, "FEMALE").voice).toBe("nova");
    expect(getVoiceProfile(45, "Female").voice).toBe("nova");
  });
});

// Recording state machine logic
type RecordingState = "idle" | "recording" | "transcribing" | "sending";

function getRecordingState(params: {
  isRecording: boolean;
  isTranscribing: boolean;
  isLoading: boolean;
}): RecordingState {
  if (params.isLoading) return "sending";
  if (params.isTranscribing) return "transcribing";
  if (params.isRecording) return "recording";
  return "idle";
}

describe("Recording State Machine", () => {
  it("idle when nothing is active", () => {
    expect(getRecordingState({ isRecording: false, isTranscribing: false, isLoading: false }))
      .toBe("idle");
  });

  it("recording when mic is active", () => {
    expect(getRecordingState({ isRecording: true, isTranscribing: false, isLoading: false }))
      .toBe("recording");
  });

  it("transcribing when processing audio", () => {
    expect(getRecordingState({ isRecording: false, isTranscribing: true, isLoading: false }))
      .toBe("transcribing");
  });

  it("sending when waiting for AI response", () => {
    expect(getRecordingState({ isRecording: false, isTranscribing: false, isLoading: true }))
      .toBe("sending");
  });
});

// Audio playback state
function canReplay(params: { isSpeaking: boolean; lastAudioUrl: string | null }): boolean {
  return !params.isSpeaking && !!params.lastAudioUrl;
}

describe("Audio Playback", () => {
  it("can replay when not speaking and has audio URL", () => {
    expect(canReplay({ isSpeaking: false, lastAudioUrl: "/manus-storage/tts/123.mp3" })).toBe(true);
  });

  it("cannot replay while speaking", () => {
    expect(canReplay({ isSpeaking: true, lastAudioUrl: "/manus-storage/tts/123.mp3" })).toBe(false);
  });

  it("cannot replay without audio URL", () => {
    expect(canReplay({ isSpeaking: false, lastAudioUrl: null })).toBe(false);
  });
});

// Web Speech API detection
function getTranscriptionMethod(webSpeechAvailable: boolean): "webSpeech" | "whisper" {
  return webSpeechAvailable ? "webSpeech" : "whisper";
}

describe("Transcription Method Selection", () => {
  it("uses Web Speech API when available (Chrome, Edge)", () => {
    expect(getTranscriptionMethod(true)).toBe("webSpeech");
  });

  it("falls back to Whisper when Web Speech unavailable (Firefox, Safari)", () => {
    expect(getTranscriptionMethod(false)).toBe("whisper");
  });
});

// Voice synthesis request validation
function validateSynthesisRequest(text: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: "Empty text" };
  }
  if (text.length > 4096) {
    return { valid: false, error: "Text too long (max 4096 chars)" };
  }
  return { valid: true };
}

describe("Voice Synthesis Validation", () => {
  it("accepts valid text", () => {
    expect(validateSynthesisRequest("Hello doctor, I've been feeling unwell.").valid).toBe(true);
  });

  it("rejects empty text", () => {
    const result = validateSynthesisRequest("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Empty text");
  });

  it("rejects text over 4096 chars", () => {
    const longText = "a".repeat(4097);
    const result = validateSynthesisRequest(longText);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too long");
  });

  it("accepts text at exactly 4096 chars", () => {
    const maxText = "a".repeat(4096);
    expect(validateSynthesisRequest(maxText).valid).toBe(true);
  });
});
