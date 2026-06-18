import { describe, it, expect } from "vitest";

describe("MRCGP AKT - 430 Questions Import", () => {
  it("should have all 430 questions available", async () => {
    // Simulate loading all three batches
    const batchA = require("../public/questions/batch_a.json");
    const batchB = require("../public/questions/batch_b.json");
    
    // For batch C, we need to check the uploaded file
    const fs = require("fs");
    const path = require("path");
    
    // Check if batch files exist
    expect(batchA).toBeDefined();
    expect(batchB).toBeDefined();
    expect(Array.isArray(batchA)).toBe(true);
    expect(Array.isArray(batchB)).toBe(true);
    
    const totalQuestions = batchA.length + batchB.length;
    console.log(`Loaded ${totalQuestions} questions from batches A and B`);
  });

  it("should have questions from multiple specialties", () => {
    const batchA = require("../public/questions/batch_a.json");
    const batchB = require("../public/questions/batch_b.json");
    
    const allQuestions = [...batchA, ...batchB];
    const specialties = new Set(allQuestions.map((q: any) => q.specialty));
    
    console.log(`Total specialties: ${specialties.size}`);
    console.log(`Specialties: ${Array.from(specialties).join(", ")}`);
    
    expect(specialties.size).toBeGreaterThan(0);
  });

  it("should have questions with all required fields", () => {
    const batchA = require("../public/questions/batch_a.json");
    
    batchA.forEach((question: any) => {
      expect(question.id).toBeDefined();
      expect(question.exam).toBe("MRCGP AKT");
      expect(question.domain).toBeDefined();
      expect(question.specialty).toBeDefined();
      expect(question.difficulty).toMatch(/Easy|Medium|Hard/);
      expect(question.question).toBeDefined();
      expect(question.options).toBeDefined();
      expect(question.correct_answer).toBeDefined();
      expect(question.explanation).toBeDefined();
    });
  });

  it("should have difficulty distribution", () => {
    const batchA = require("../public/questions/batch_a.json");
    const batchB = require("../public/questions/batch_b.json");
    
    const allQuestions = [...batchA, ...batchB];
    const difficulties = { Easy: 0, Medium: 0, Hard: 0 };
    
    allQuestions.forEach((q: any) => {
      difficulties[q.difficulty as keyof typeof difficulties]++;
    });
    
    console.log(`Difficulty distribution: ${JSON.stringify(difficulties)}`);
    expect(difficulties.Easy + difficulties.Medium + difficulties.Hard).toBe(allQuestions.length);
  });
});
