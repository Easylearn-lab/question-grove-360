import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface StudySessionContextType {
  /** Whether the user is currently in an active study session (quiz, mock, flashcards) */
  isInStudySession: boolean;
  /** Call when entering a study session (quiz, mock exam, flashcard review) */
  startStudySession: (sessionType: string) => void;
  /** Call when exiting a study session */
  endStudySession: () => void;
  /** The type of active session */
  sessionType: string | null;
}

const StudySessionContext = createContext<StudySessionContextType>({
  isInStudySession: false,
  startStudySession: () => {},
  endStudySession: () => {},
  sessionType: null,
});

export function StudySessionProvider({ children }: { children: ReactNode }) {
  const [isInStudySession, setIsInStudySession] = useState(false);
  const [sessionType, setSessionType] = useState<string | null>(null);

  const startStudySession = useCallback((type: string) => {
    setIsInStudySession(true);
    setSessionType(type);
    // Also set a flag in localStorage so it persists across potential reloads
    localStorage.setItem("activeStudySession", JSON.stringify({ type, startedAt: Date.now() }));
  }, []);

  const endStudySession = useCallback(() => {
    setIsInStudySession(false);
    setSessionType(null);
    localStorage.removeItem("activeStudySession");
  }, []);

  return (
    <StudySessionContext.Provider value={{ isInStudySession, startStudySession, endStudySession, sessionType }}>
      {children}
    </StudySessionContext.Provider>
  );
}

export function useStudySession() {
  return useContext(StudySessionContext);
}

/**
 * Check if there's an active study session stored in localStorage.
 * Used to prevent auth redirects on page reload during an active session.
 */
export function hasActiveStudySession(): boolean {
  try {
    const stored = localStorage.getItem("activeStudySession");
    if (!stored) return false;
    const session = JSON.parse(stored);
    // Consider sessions valid for up to 4 hours
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    return Date.now() - session.startedAt < FOUR_HOURS;
  } catch {
    return false;
  }
}
