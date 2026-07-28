import { useMemo, useState } from "react";

/**
 * Deterministic seeded PRNG (mulberry32).
 * Given the same seed, produces the same sequence every time.
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simple string hash (djb2) to convert a string seed into a number.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * Fisher-Yates shuffle using a seeded PRNG.
 */
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const rng = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface ShuffledOption {
  /** The display label (A, B, C, D, E) shown to the user */
  displayLabel: string;
  /** The original option key (A, B, C, D, E) from the database */
  originalKey: string;
  /** The option text content */
  text: string;
}

/**
 * Generate a session seed. Call once per session and persist it.
 * Uses current timestamp + random to ensure different order each session.
 */
export function generateSessionSeed(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const SESSION_SEED_KEY = "qg360_option_shuffle_seed";

/**
 * Get or create a persistent session seed from localStorage.
 */
export function getOrCreateSessionSeed(): string {
  try {
    const existing = localStorage.getItem(SESSION_SEED_KEY);
    if (existing) return existing;
    const seed = generateSessionSeed();
    localStorage.setItem(SESSION_SEED_KEY, seed);
    return seed;
  } catch {
    return generateSessionSeed();
  }
}

/**
 * Clear the session seed (call when starting a new question bank session).
 */
export function clearSessionSeed(): void {
  try {
    localStorage.removeItem(SESSION_SEED_KEY);
  } catch { /* ignore */ }
}

/**
 * Hook that returns shuffled options for a given question.
 * 
 * The shuffle is deterministic per (sessionSeed + questionId), meaning:
 * - Same question in same session → same order (stable while navigating back/forth)
 * - Same question in different session → different order
 * - Different questions in same session → different orders
 * 
 * @param question - The question object with optionA..optionE and correctAnswer
 * @param sessionSeed - A stable seed for the current session
 * @returns shuffledOptions array and helper to map display selection back to original key
 */
export function useShuffledOptions(
  question: {
    id: number;
    optionA?: string | null;
    optionB?: string | null;
    optionC?: string | null;
    optionD?: string | null;
    optionE?: string | null;
    correctAnswer?: string | null;
  } | null | undefined,
  sessionSeed: string
) {
  const shuffled = useMemo(() => {
    if (!question) return { options: [] as ShuffledOption[], correctDisplayLabel: null as string | null };

    // Collect non-empty options
    const originalOptions: { key: string; text: string }[] = [];
    const keys = ["A", "B", "C", "D", "E"] as const;
    for (const key of keys) {
      const text = question[`option${key}` as keyof typeof question] as string | null;
      if (text) {
        originalOptions.push({ key, text });
      }
    }

    // Generate a deterministic seed from sessionSeed + questionId
    const combinedSeed = hashString(`${sessionSeed}-${question.id}`);

    // Shuffle the options
    const shuffledOptions = seededShuffle(originalOptions, combinedSeed);

    // Assign new display labels (A, B, C, D, E)
    const displayLabels = ["A", "B", "C", "D", "E"];
    const options: ShuffledOption[] = shuffledOptions.map((opt, i) => ({
      displayLabel: displayLabels[i],
      originalKey: opt.key,
      text: opt.text,
    }));

    // Find the display label of the correct answer
    const correctDisplayLabel = options.find(
      (opt) => opt.originalKey === question.correctAnswer
    )?.displayLabel ?? null;

    return { options, correctDisplayLabel };
  }, [question?.id, sessionSeed, question?.optionA, question?.optionB, question?.optionC, question?.optionD, question?.optionE, question?.correctAnswer]);

  return shuffled;
}

/**
 * Given a display label selection (e.g., "B" as shown to user),
 * map it back to the original option key using the shuffled options array.
 */
export function mapDisplayToOriginal(
  displayLabel: string,
  options: ShuffledOption[]
): string | null {
  const found = options.find((opt) => opt.displayLabel === displayLabel);
  return found?.originalKey ?? null;
}

/**
 * Given an original key (e.g., "C" from database),
 * find what display label it maps to in the shuffled order.
 */
export function mapOriginalToDisplay(
  originalKey: string,
  options: ShuffledOption[]
): string | null {
  const found = options.find((opt) => opt.originalKey === originalKey);
  return found?.displayLabel ?? null;
}
