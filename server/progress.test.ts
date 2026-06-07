import { describe, it, expect } from "vitest";
import { getMockExamScoreTrends, getFlashcardMasteryStats, getFlashcardProgressTrend, getSpecialtyBreakdown } from "./db";

describe("Progress Dashboard Queries", () => {
  const testUserId = 1;

  describe("getMockExamScoreTrends", () => {
    it("should return an array", async () => {
      const result = await getMockExamScoreTrends(testUserId, 30);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should accept different day ranges", async () => {
      const week = await getMockExamScoreTrends(testUserId, 7);
      const month = await getMockExamScoreTrends(testUserId, 30);
      const quarter = await getMockExamScoreTrends(testUserId, 90);
      expect(Array.isArray(week)).toBe(true);
      expect(Array.isArray(month)).toBe(true);
      expect(Array.isArray(quarter)).toBe(true);
    });

    it("should return objects with score and date fields if data exists", async () => {
      const result = await getMockExamScoreTrends(testUserId, 365);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("score");
        expect(result[0]).toHaveProperty("date");
      }
    });
  });

  describe("getFlashcardMasteryStats", () => {
    it("should return stats object with required fields", async () => {
      const result = await getFlashcardMasteryStats(testUserId);
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("mastered");
      expect(result).toHaveProperty("reviewing");
      expect(result).toHaveProperty("learning");
      expect(result).toHaveProperty("masteryPercentage");
    });

    it("should return numeric values", async () => {
      const result = await getFlashcardMasteryStats(testUserId);
      expect(typeof result.total).toBe("number");
      expect(typeof result.mastered).toBe("number");
      expect(typeof result.reviewing).toBe("number");
      expect(typeof result.learning).toBe("number");
      expect(typeof result.masteryPercentage).toBe("number");
    });

    it("should return non-negative values", async () => {
      const result = await getFlashcardMasteryStats(testUserId);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.mastered).toBeGreaterThanOrEqual(0);
      expect(result.reviewing).toBeGreaterThanOrEqual(0);
      expect(result.learning).toBeGreaterThanOrEqual(0);
      expect(result.masteryPercentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getFlashcardProgressTrend", () => {
    it("should return an array", async () => {
      const result = await getFlashcardProgressTrend(testUserId, 30);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return objects with mastered, total, and date if data exists", async () => {
      const result = await getFlashcardProgressTrend(testUserId, 365);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("mastered");
        expect(result[0]).toHaveProperty("total");
        expect(result[0]).toHaveProperty("date");
      }
    });
  });

  describe("getSpecialtyBreakdown", () => {
    it("should return an array", async () => {
      const result = await getSpecialtyBreakdown(testUserId, 30);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return objects with specialty, accuracy, and questionsAttempted if data exists", async () => {
      const result = await getSpecialtyBreakdown(testUserId, 365);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("specialty");
        expect(result[0]).toHaveProperty("accuracy");
        expect(result[0]).toHaveProperty("questionsAttempted");
      }
    });
  });
});
