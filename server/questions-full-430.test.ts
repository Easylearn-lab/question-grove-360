import { describe, it, expect } from "vitest";

describe("MRCGP AKT - Full 430 Questions Deployment", () => {
  it("should load all 430 questions from batch C", () => {
    const batchC = require("../public/questions/batch_c.json");
    
    expect(Array.isArray(batchC)).toBe(true);
    expect(batchC.length).toBe(430);
    console.log(`✓ Loaded ${batchC.length} questions`);
  });

  it("should have all required fields for each question", () => {
    const batchC = require("../public/questions/batch_c.json");
    
    batchC.forEach((q: any, idx: number) => {
      expect(q.id).toBeDefined();
      expect(q.exam).toBe("MRCGP AKT");
      expect(q.domain).toBeDefined();
      expect(q.specialty).toBeDefined();
      expect(q.difficulty).toMatch(/Easy|Medium|Hard/);
      expect(q.question).toBeDefined();
      expect(q.options).toBeDefined();
      expect(q.correct_answer).toBeDefined();
      expect(q.explanation).toBeDefined();
      expect(q.reference).toBeDefined();
      expect(q.tags).toBeDefined();
    });
  });

  it("should have 22 specialties", () => {
    const batchC = require("../public/questions/batch_c.json");
    const specialties = new Set(batchC.map((q: any) => q.specialty));
    
    console.log(`Total specialties: ${specialties.size}`);
    console.log(`Specialties: ${Array.from(specialties).sort().join(", ")}`);
    
    expect(specialties.size).toBe(22);
  });

  it("should have balanced difficulty distribution", () => {
    const batchC = require("../public/questions/batch_c.json");
    const difficulties = { Easy: 0, Medium: 0, Hard: 0 };
    
    batchC.forEach((q: any) => {
      difficulties[q.difficulty as keyof typeof difficulties]++;
    });
    
    console.log(`Difficulty distribution:`, difficulties);
    expect(difficulties.Easy + difficulties.Medium + difficulties.Hard).toBe(430);
    expect(difficulties.Easy).toBeGreaterThan(0);
    expect(difficulties.Medium).toBeGreaterThan(0);
    expect(difficulties.Hard).toBeGreaterThan(0);
  });

  it("should have unique question IDs", () => {
    const batchC = require("../public/questions/batch_c.json");
    const ids = batchC.map((q: any) => q.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(430);
    console.log(`✓ All 430 questions have unique IDs`);
  });

  it("should have specialty breakdown", () => {
    const batchC = require("../public/questions/batch_c.json");
    const specialtyBreakdown: Record<string, number> = {};
    
    batchC.forEach((q: any) => {
      specialtyBreakdown[q.specialty] = (specialtyBreakdown[q.specialty] || 0) + 1;
    });
    
    console.log(`\nSpecialty Breakdown:`);
    Object.entries(specialtyBreakdown)
      .sort((a, b) => b[1] - a[1])
      .forEach(([specialty, count]) => {
        console.log(`  ${specialty}: ${count}`);
      });
  });
});
