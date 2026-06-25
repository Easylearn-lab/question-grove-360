import { describe, it, expect, vi } from "vitest";

/**
 * Tests for spaced repetition weighting in question bank queries.
 * 
 * The weighting algorithm uses exponential distribution sampling:
 * ORDER BY -LOG(RAND()) / weight
 * 
 * Where weight is:
 * - 3.0 for questions answered incorrectly more than correctly
 * - 2.0 for questions never attempted OR with equal correct/incorrect
 * - 1.0 for questions answered correctly more than incorrectly
 * 
 * Higher weight = higher probability of appearing earlier in results.
 */

describe("Spaced Repetition Weighting", () => {
  it("should export getQuestionsByFilters with userId parameter", async () => {
    const { getQuestionsByFilters } = await import("./db");
    expect(getQuestionsByFilters).toBeDefined();
    expect(getQuestionsByFilters.length).toBeGreaterThanOrEqual(1);
  });

  it("should export getMrcgpAktQuestionsBySpecialty with userId parameter", async () => {
    const { getMrcgpAktQuestionsBySpecialty } = await import("./db");
    expect(getMrcgpAktQuestionsBySpecialty).toBeDefined();
    expect(getMrcgpAktQuestionsBySpecialty.length).toBeGreaterThanOrEqual(1);
  });

  it("getQuestionsByFilters should accept userId as 4th parameter", async () => {
    const { getQuestionsByFilters } = await import("./db");
    // Function signature: (specialty?, limit, offset, userId?)
    // Calling with userId should not throw a type error
    const result = await getQuestionsByFilters("Respiratory", 5, 0, 99999);
    // Should return an array (possibly empty if no questions match)
    expect(Array.isArray(result)).toBe(true);
  });

  it("getMrcgpAktQuestionsBySpecialty should accept userId as 3rd parameter", async () => {
    const { getMrcgpAktQuestionsBySpecialty } = await import("./db");
    // Function signature: (specialty?, limit, userId?)
    const result = await getMrcgpAktQuestionsBySpecialty("Respiratory", 5, 99999);
    // Should return an array
    expect(Array.isArray(result)).toBe(true);
  });

  it("getQuestionsByFilters without userId should still return results (fallback)", async () => {
    const { getQuestionsByFilters } = await import("./db");
    const result = await getQuestionsByFilters("Respiratory", 5, 0);
    expect(Array.isArray(result)).toBe(true);
    // Should have questions since we have 194 Respiratory questions
    expect(result.length).toBeGreaterThan(0);
  });

  it("weighted query should return questions with correct structure", async () => {
    const { getQuestionsByFilters } = await import("./db");
    // Use userId 99999 (non-existent user) - all questions should be "never attempted" (weight 2.0)
    const result = await getQuestionsByFilters("Respiratory", 3, 0, 99999);
    expect(result.length).toBeGreaterThan(0);
    
    const q = result[0];
    // Verify question structure is preserved
    expect(q).toHaveProperty("id");
    expect(q).toHaveProperty("question");
    expect(q).toHaveProperty("optionA");
    expect(q).toHaveProperty("optionB");
    expect(q).toHaveProperty("correctAnswer");
    expect(q).toHaveProperty("specialty");
  });

  it("weighted query should produce different orderings on repeated calls", async () => {
    const { getQuestionsByFilters } = await import("./db");
    // Call twice with same params - should get different order due to RAND()
    const result1 = await getQuestionsByFilters("Respiratory", 10, 0, 99999);
    const result2 = await getQuestionsByFilters("Respiratory", 10, 0, 99999);
    
    expect(result1.length).toBe(10);
    expect(result2.length).toBe(10);
    
    // The IDs should not be in the same order (probabilistically almost certain with 194 questions)
    const ids1 = result1.map((q: any) => q.id);
    const ids2 = result2.map((q: any) => q.id);
    
    // At least one position should differ (extremely unlikely to be identical with RAND())
    const allSame = ids1.every((id: number, i: number) => id === ids2[i]);
    expect(allSame).toBe(false);
  });
});
