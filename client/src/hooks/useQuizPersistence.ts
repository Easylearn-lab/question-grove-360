import { useCallback, useEffect, useRef } from "react";

/**
 * Quiz progress data saved to localStorage on every question change.
 * Enables resume after unexpected page reloads.
 */
export interface QuizProgressData {
  /** Unique key for this quiz session (e.g., "mock-123" or "qbank-cardiology") */
  sessionKey: string;
  /** Current question index (0-based) */
  currentIndex: number;
  /** Map of questionId -> selected answer */
  answers: Record<string, string>;
  /** Set of flagged question IDs */
  flaggedIds: number[];
  /** Time remaining in seconds (for timed exams) */
  timeRemaining: number | null;
  /** Total questions in this session */
  totalQuestions: number;
  /** Timestamp when progress was last saved */
  savedAt: number;
  /** The mock exam ID or session type for identification */
  examId?: number;
  /** Additional metadata (exam name, specialty filter, etc.) */
  metadata?: Record<string, any>;
}

const STORAGE_PREFIX = "qg360_quiz_progress_";
const MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours - discard stale sessions

/**
 * Get the localStorage key for a quiz session
 */
function getStorageKey(sessionKey: string): string {
  return `${STORAGE_PREFIX}${sessionKey}`;
}

/**
 * Save quiz progress to localStorage
 */
export function saveQuizProgress(data: QuizProgressData): void {
  try {
    const key = getStorageKey(data.sessionKey);
    localStorage.setItem(key, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch (e) {
    // localStorage might be full - silently fail
    console.warn("[QuizPersistence] Failed to save progress:", e);
  }
}

/**
 * Load saved quiz progress from localStorage
 * Returns null if no valid saved progress exists
 */
export function loadQuizProgress(sessionKey: string): QuizProgressData | null {
  try {
    const key = getStorageKey(sessionKey);
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const data: QuizProgressData = JSON.parse(stored);

    // Discard stale sessions (older than 4 hours)
    if (Date.now() - data.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Clear saved quiz progress for a session
 */
export function clearQuizProgress(sessionKey: string): void {
  try {
    const key = getStorageKey(sessionKey);
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Check if there's any saved quiz progress (for showing resume prompts)
 */
export function getAnyActiveQuizProgress(): QuizProgressData | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const data: QuizProgressData = JSON.parse(stored);
          if (Date.now() - data.savedAt < MAX_AGE_MS) {
            return data;
          } else {
            // Clean up stale entries
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Hook that auto-saves quiz progress on every state change.
 * Call this in your quiz/mock exam component.
 */
export function useQuizPersistence(
  sessionKey: string | null,
  data: Omit<QuizProgressData, "sessionKey" | "savedAt"> | null
) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const save = useCallback(() => {
    if (!sessionKey || !data) return;
    saveQuizProgress({ ...data, sessionKey, savedAt: Date.now() });
  }, [sessionKey, data]);

  // Auto-save on every data change (debounced to 500ms)
  useEffect(() => {
    if (!sessionKey || !data) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [sessionKey, data, save]);

  // Also save on beforeunload (page close/refresh)
  useEffect(() => {
    if (!sessionKey || !data) return;

    const handleBeforeUnload = () => {
      save();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionKey, data, save]);

  // Also save on visibility change (tab switch, phone lock)
  useEffect(() => {
    if (!sessionKey || !data) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        save();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessionKey, data, save]);

  return { save, clear: () => sessionKey && clearQuizProgress(sessionKey) };
}
