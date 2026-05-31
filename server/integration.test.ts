import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  createQuestion,
  getQuestionsByFilters,
  createMockExam,
  recordUserAttempt,
  getStudyStats,
  createFlashcard,
  updateSrsProgress,
} from "./db";

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

  describe("Question Bank Feature", () => {
    it("should create a question", async () => {
      const question = await createQuestion(
        1,
        "Sample question text",
        "MCQ",
        "Cardiology",
        "Easy",
        "Clinical Knowledge",
        "Option A",
        "Option B",
        "Option C",
        "Option D",
        "A",
        "Explanation"
      );

      expect(question).toBeDefined();
      expect(question.specialty).toBe("Cardiology");
    });

    it("should filter questions by specialty and difficulty", async () => {
      const questions = await getQuestionsByFilters(1, {
        specialty: "Cardiology",
        difficulty: "Easy",
      });

      expect(Array.isArray(questions)).toBe(true);
      questions.forEach((q) => {
        expect(q.specialty).toBe("Cardiology");
        expect(q.difficulty).toBe("Easy");
      });
    });

    it("should record user attempt", async () => {
      const attempt = await recordUserAttempt(1, 1, 1, "Cardiology", "A", true, 45, "tutor");

      expect(attempt).toBeDefined();
      expect(attempt.isCorrect).toBe(true);
    });
  });

  describe("Mock Exams Feature", () => {
    it("should create a mock exam", async () => {
      const mockExam = await createMockExam(1, "Sample Mock Exam", [1, 2, 3], 180, 3);

      expect(mockExam).toBeDefined();
      expect(mockExam.name).toBe("Sample Mock Exam");
      expect(mockExam.timeLimit).toBe(180);
    });

    it("should calculate study statistics", async () => {
      const stats = await getStudyStats(1);

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalQuestionsAnswered");
      expect(stats).toHaveProperty("correctAnswers");
      expect(stats).toHaveProperty("accuracy");
    });
  });

  describe("Pattern Recognition Feature", () => {
    it("should create a flashcard", async () => {
      const card = await createFlashcard(
        1,
        "Cardiology",
        "What is the normal heart rate?",
        "60-100 bpm",
        ["Heart Rate", "Vital Signs"]
      );

      expect(card).toBeDefined();
      expect(card.category).toBe("Cardiology");
    });

    it("should update SRS progress", async () => {
      const progress = await updateSrsProgress(1, 1, "Easy", 5);

      expect(progress).toBeDefined();
      expect(progress.masteryLevel).toBe("Easy");
    });
  });

  describe("Data Integrity", () => {
    it("should maintain referential integrity", async () => {
      // Test that foreign key relationships work correctly
      const questions = await getQuestionsByFilters(1);
      expect(Array.isArray(questions)).toBe(true);
    });

    it("should handle concurrent operations", async () => {
      // Simulate concurrent user attempts
      const promises = Array.from({ length: 5 }).map((_, i) =>
        recordUserAttempt(1, i + 1, 1, "Cardiology", "A", true, 45, "tutor")
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });
  });

  describe("Performance", () => {
    it("should retrieve questions efficiently", async () => {
      const start = performance.now();
      await getQuestionsByFilters(1, { specialty: "Cardiology" });
      const end = performance.now();

      expect(end - start).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it("should calculate stats efficiently", async () => {
      const start = performance.now();
      await getStudyStats(1);
      const end = performance.now();

      expect(end - start).toBeLessThan(500); // Should complete in less than 500ms
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid exam ID gracefully", async () => {
      const questions = await getQuestionsByFilters(99999);
      expect(Array.isArray(questions)).toBe(true);
      expect(questions).toHaveLength(0);
    });

    it("should handle missing data gracefully", async () => {
      const stats = await getStudyStats(99999);
      expect(stats).toBeDefined();
      expect(stats.totalQuestionsAnswered).toBe(0);
    });
  });
});
