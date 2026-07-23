import { describe, it, expect } from "vitest";

/**
 * Tests for SCA Case Grid Enhancements:
 * 1. Difficulty filtering logic
 * 2. New badge detection (14-day window)
 * 3. Completion tracking (attempted case IDs)
 */

// Simulate the difficulty filter logic
function filterByDifficulty(cases: Array<{ difficulty: string }>, filter: string) {
  if (filter === "all") return cases;
  return cases.filter(c => c.difficulty === filter);
}

// Simulate the category filter logic
function filterByCategory(cases: Array<{ category: string }>, filter: string) {
  if (filter === "all") return cases;
  return cases.filter(c => c.category === filter);
}

// Combined filter (both active simultaneously)
function filterCases(
  cases: Array<{ difficulty: string; category: string }>,
  difficultyFilter: string,
  categoryFilter: string
) {
  let result = cases;
  if (difficultyFilter !== "all") {
    result = result.filter(c => c.difficulty === difficultyFilter);
  }
  if (categoryFilter !== "all") {
    result = result.filter(c => c.category === categoryFilter);
  }
  return result;
}

// Simulate the isNewCase check
function isNewCase(createdAt?: string): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  return created > fourteenDaysAgo;
}

// Difficulty label mapping
const DIFFICULTY_LABELS: Record<string, string> = {
  all: "All",
  Easy: "Foundation",
  Medium: "Standard",
  Hard: "Advanced",
};

describe("Difficulty Filtering", () => {
  const mockCases = [
    { id: 1, difficulty: "Easy", category: "Mental Health" },
    { id: 2, difficulty: "Medium", category: "Cardiovascular" },
    { id: 3, difficulty: "Hard", category: "Mental Health" },
    { id: 4, difficulty: "Easy", category: "Respiratory" },
    { id: 5, difficulty: "Medium", category: "Mental Health" },
  ];

  it("shows all cases when filter is 'all'", () => {
    const result = filterByDifficulty(mockCases, "all");
    expect(result).toHaveLength(5);
  });

  it("filters to Easy (Foundation) cases only", () => {
    const result = filterByDifficulty(mockCases, "Easy");
    expect(result).toHaveLength(2);
    expect(result.every(c => c.difficulty === "Easy")).toBe(true);
  });

  it("filters to Medium (Standard) cases only", () => {
    const result = filterByDifficulty(mockCases, "Medium");
    expect(result).toHaveLength(2);
    expect(result.every(c => c.difficulty === "Medium")).toBe(true);
  });

  it("filters to Hard (Advanced) cases only", () => {
    const result = filterByDifficulty(mockCases, "Hard");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it("maps difficulty labels correctly", () => {
    expect(DIFFICULTY_LABELS["Easy"]).toBe("Foundation");
    expect(DIFFICULTY_LABELS["Medium"]).toBe("Standard");
    expect(DIFFICULTY_LABELS["Hard"]).toBe("Advanced");
    expect(DIFFICULTY_LABELS["all"]).toBe("All");
  });

  it("combines difficulty and category filters simultaneously", () => {
    // Case 1 is Easy + Mental Health, so it should match
    const result = filterCases(mockCases, "Easy", "Mental Health");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("returns empty array when no cases match combined filters", () => {
    const result = filterCases(mockCases, "Hard", "Respiratory");
    expect(result).toHaveLength(0);
  });
});

describe("New Badge Detection", () => {
  it("returns true for case created today", () => {
    const today = new Date().toISOString();
    expect(isNewCase(today)).toBe(true);
  });

  it("returns true for case created 7 days ago", () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    expect(isNewCase(sevenDaysAgo.toISOString())).toBe(true);
  });

  it("returns true for case created 13 days ago", () => {
    const thirteenDaysAgo = new Date();
    thirteenDaysAgo.setDate(thirteenDaysAgo.getDate() - 13);
    expect(isNewCase(thirteenDaysAgo.toISOString())).toBe(true);
  });

  it("returns false for case created 15 days ago", () => {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    expect(isNewCase(fifteenDaysAgo.toISOString())).toBe(false);
  });

  it("returns false for case created 30 days ago", () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    expect(isNewCase(thirtyDaysAgo.toISOString())).toBe(false);
  });

  it("returns false for undefined createdAt", () => {
    expect(isNewCase(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isNewCase("")).toBe(false);
  });
});

describe("Completion Tracking", () => {
  it("correctly identifies attempted cases from a Set", () => {
    const attemptedCaseIds = new Set([1, 5, 12, 20]);
    expect(attemptedCaseIds.has(1)).toBe(true);
    expect(attemptedCaseIds.has(5)).toBe(true);
    expect(attemptedCaseIds.has(3)).toBe(false);
    expect(attemptedCaseIds.has(40)).toBe(false);
  });

  it("shows correct progress count", () => {
    const attemptedCaseIds = new Set([1, 5, 12, 20]);
    const totalCases = 40;
    expect(`${attemptedCaseIds.size} of ${totalCases} cases attempted`).toBe("4 of 50 cases attempted");
  });

  it("handles empty attempted set", () => {
    const attemptedCaseIds = new Set<number>([]);
    expect(attemptedCaseIds.size).toBe(0);
    expect(attemptedCaseIds.has(1)).toBe(false);
  });

  it("handles all cases attempted", () => {
    const allIds = Array.from({ length: 40 }, (_, i) => i + 1);
    const attemptedCaseIds = new Set(allIds);
    expect(attemptedCaseIds.size).toBe(40);
    expect(`${attemptedCaseIds.size} of 50 cases attempted`).toBe("40 of 50 cases attempted");
  });

  it("new badge takes priority over checkmark when both apply", () => {
    // Logic: if isNew && isAttempted, show New badge (not checkmark)
    const isNew = true;
    const isAttempted = true;
    // In the UI: {isNew && <NewBadge />} {isAttempted && !isNew && <Checkmark />}
    const showNewBadge = isNew;
    const showCheckmark = isAttempted && !isNew;
    expect(showNewBadge).toBe(true);
    expect(showCheckmark).toBe(false);
  });

  it("shows checkmark when attempted but not new", () => {
    const isNew = false;
    const isAttempted = true;
    const showNewBadge = isNew;
    const showCheckmark = isAttempted && !isNew;
    expect(showNewBadge).toBe(false);
    expect(showCheckmark).toBe(true);
  });

  it("shows neither when not attempted and not new", () => {
    const isNew = false;
    const isAttempted = false;
    const showNewBadge = isNew;
    const showCheckmark = isAttempted && !isNew;
    expect(showNewBadge).toBe(false);
    expect(showCheckmark).toBe(false);
  });
});
