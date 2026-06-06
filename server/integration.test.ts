import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, getUserStudyStats, updateSrsProgress, getDueFlashcards } from "./db";

describe("Integration Tests - Question Grove 360", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe("Database Connection", () => {
    it("should establish database connection", async () => {
      const db = await getDb();
      expect(db).toBeDefined();
    });
  });

  describe("Study Statistics", () => {
    it("should retrieve study statistics for user", async () => {
      const stats = await getUserStudyStats(1);
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalQuestionsAnswered");
      expect(stats).toHaveProperty("accuracy");
    });

    it("should handle missing user gracefully", async () => {
      const stats = await getUserStudyStats(99999);
      expect(stats).toBeDefined();
      expect(stats.totalQuestionsAnswered).toBe(0);
      expect(stats.accuracy).toBe(0);
    });

    it("should calculate stats efficiently", async () => {
      const start = performance.now();
      await getUserStudyStats(1);
      const end = performance.now();
      expect(end - start).toBeLessThan(500);
    });
  });

  describe("SRS Progress", () => {
    it("should update SRS progress", async () => {
      const result = await updateSrsProgress(1, 1, 4);
      expect(typeof result).toBe("boolean");
    });

    it("should handle invalid flashcard gracefully", async () => {
      const result = await updateSrsProgress(1, 99999, 4);
      expect(result).toBe(false);
    });
  });

  describe("Flashcard Retrieval", () => {
    it("should retrieve due flashcards", async () => {
      const cards = await getDueFlashcards(1, 20);
      expect(Array.isArray(cards)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const cards = await getDueFlashcards(1, 5);
      expect(cards.length).toBeLessThanOrEqual(5);
    });

    it("should handle missing user gracefully", async () => {
      const cards = await getDueFlashcards(99999, 20);
      expect(Array.isArray(cards)).toBe(true);
      expect(cards.length).toBe(0);
    });
  });
});
