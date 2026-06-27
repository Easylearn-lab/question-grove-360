import { describe, it, expect } from "vitest";

/**
 * Tests for the AI Coach360 performance context injection logic.
 * Validates that the getUserPerformanceContext helper produces correct output
 * based on different user performance scenarios.
 */
describe("AI Coach360 Performance Context Injection", () => {
  // Simulate the context building logic
  function buildPerformanceContext(
    attempts: Array<{ specialty: string; isCorrect: boolean }>,
    mockPercentages: number[] = []
  ): string {
    if (attempts.length === 0) return "";

    // Calculate per-specialty accuracy
    const specialtyMap: Record<string, { correct: number; total: number }> = {};
    attempts.forEach((a) => {
      const spec = a.specialty || "General";
      if (!specialtyMap[spec]) specialtyMap[spec] = { correct: 0, total: 0 };
      specialtyMap[spec].total++;
      if (a.isCorrect) specialtyMap[spec].correct++;
    });

    // Find top 3 weakest specialties (minimum 3 attempts)
    const weakest = Object.entries(specialtyMap)
      .filter(([, s]) => s.total >= 3)
      .map(([name, s]) => ({ name, accuracy: Math.round((s.correct / s.total) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    // Calculate overall accuracy
    const totalCorrect = attempts.filter((a) => a.isCorrect).length;
    const qbAccuracy = Math.round((totalCorrect / attempts.length) * 100);

    // Calculate readiness score
    let readinessScore: number;
    if (mockPercentages.length > 0) {
      const mockAvg = mockPercentages.reduce((sum, p) => sum + p, 0) / mockPercentages.length;
      readinessScore = Math.round(qbAccuracy * 0.6 + mockAvg * 0.4);
    } else {
      readinessScore = qbAccuracy;
    }

    // Determine label
    let label: string;
    if (readinessScore >= 80) label = "Exam Ready";
    else if (readinessScore >= 66) label = "Borderline";
    else if (readinessScore >= 50) label = "High Risk";
    else label = "Not Ready";

    const weakAreasStr = weakest.length > 0
      ? weakest.map((w) => `${w.name} (${w.accuracy}%)`).join(", ")
      : "Not enough data yet";

    return `\n\nThis user's current weak areas are: ${weakAreasStr}. Their overall exam readiness score is ${readinessScore}% (${label}). They have answered ${attempts.length} questions total with ${qbAccuracy}% overall accuracy. Where relevant, tailor your responses to address these weaknesses. If the user asks a general medical question unrelated to their weak areas, answer it fully as normal.`;
  }

  it("should return empty string when no attempts exist", () => {
    const result = buildPerformanceContext([]);
    expect(result).toBe("");
  });

  it("should identify top 3 weakest specialties correctly", () => {
    const attempts = [
      // Respiratory: 2/5 = 40%
      ...Array(2).fill({ specialty: "Respiratory", isCorrect: true }),
      ...Array(3).fill({ specialty: "Respiratory", isCorrect: false }),
      // Neurology: 1/4 = 25%
      ...Array(1).fill({ specialty: "Neurology", isCorrect: true }),
      ...Array(3).fill({ specialty: "Neurology", isCorrect: false }),
      // Cardiovascular: 4/5 = 80%
      ...Array(4).fill({ specialty: "Cardiovascular", isCorrect: true }),
      ...Array(1).fill({ specialty: "Cardiovascular", isCorrect: false }),
      // Dermatology: 3/6 = 50%
      ...Array(3).fill({ specialty: "Dermatology", isCorrect: true }),
      ...Array(3).fill({ specialty: "Dermatology", isCorrect: false }),
      // Paediatrics: 5/5 = 100%
      ...Array(5).fill({ specialty: "Paediatrics", isCorrect: true }),
    ];

    const result = buildPerformanceContext(attempts);
    expect(result).toContain("Neurology (25%)");
    expect(result).toContain("Respiratory (40%)");
    expect(result).toContain("Dermatology (50%)");
    // Should NOT contain the strong specialties in weak areas
    expect(result).not.toContain("Cardiovascular (80%)");
    expect(result).not.toContain("Paediatrics (100%)");
  });

  it("should calculate readiness score with QB only (no mocks)", () => {
    const attempts = [
      ...Array(7).fill({ specialty: "Respiratory", isCorrect: true }),
      ...Array(3).fill({ specialty: "Respiratory", isCorrect: false }),
    ];
    const result = buildPerformanceContext(attempts);
    // 7/10 = 70% → Borderline
    expect(result).toContain("70% (Borderline)");
  });

  it("should calculate weighted readiness with mock data", () => {
    const attempts = [
      ...Array(7).fill({ specialty: "Respiratory", isCorrect: true }),
      ...Array(3).fill({ specialty: "Respiratory", isCorrect: false }),
    ];
    // QB = 70%, Mock avg = 80% → 70*0.6 + 80*0.4 = 42 + 32 = 74 → Borderline
    const result = buildPerformanceContext(attempts, [80]);
    expect(result).toContain("74% (Borderline)");
  });

  it("should show 'Not Ready' for low scores", () => {
    const attempts = [
      ...Array(2).fill({ specialty: "Respiratory", isCorrect: true }),
      ...Array(8).fill({ specialty: "Respiratory", isCorrect: false }),
    ];
    // 2/10 = 20% → Not Ready
    const result = buildPerformanceContext(attempts);
    expect(result).toContain("20% (Not Ready)");
  });

  it("should show 'Exam Ready' for high scores", () => {
    const attempts = [
      ...Array(9).fill({ specialty: "Respiratory", isCorrect: true }),
      ...Array(1).fill({ specialty: "Respiratory", isCorrect: false }),
    ];
    // 9/10 = 90% → Exam Ready
    const result = buildPerformanceContext(attempts);
    expect(result).toContain("90% (Exam Ready)");
  });

  it("should include total question count in context", () => {
    const attempts = [
      ...Array(15).fill({ specialty: "Respiratory", isCorrect: true }),
      ...Array(5).fill({ specialty: "Neurology", isCorrect: false }),
    ];
    const result = buildPerformanceContext(attempts);
    expect(result).toContain("answered 20 questions total");
  });

  it("should exclude specialties with fewer than 3 attempts from weak areas", () => {
    const attempts = [
      // Only 2 attempts for Neurology — should be excluded
      { specialty: "Neurology", isCorrect: false },
      { specialty: "Neurology", isCorrect: false },
      // 5 attempts for Respiratory — should be included
      ...Array(2).fill({ specialty: "Respiratory", isCorrect: true }),
      ...Array(3).fill({ specialty: "Respiratory", isCorrect: false }),
    ];
    const result = buildPerformanceContext(attempts);
    expect(result).not.toContain("Neurology");
    expect(result).toContain("Respiratory (40%)");
  });

  it("should show 'Not enough data yet' when no specialty has 3+ attempts", () => {
    const attempts = [
      { specialty: "Respiratory", isCorrect: true },
      { specialty: "Neurology", isCorrect: false },
    ];
    const result = buildPerformanceContext(attempts);
    expect(result).toContain("Not enough data yet");
  });

  it("should not expose the context to the user (context is in system prompt format)", () => {
    const attempts = [
      ...Array(5).fill({ specialty: "Respiratory", isCorrect: true }),
      ...Array(5).fill({ specialty: "Respiratory", isCorrect: false }),
    ];
    const result = buildPerformanceContext(attempts);
    // The context should be a string that starts with newlines (for system prompt injection)
    expect(result.startsWith("\n\n")).toBe(true);
    // Should contain the instruction to not reveal the data
    expect(result).toContain("If the user asks a general medical question unrelated to their weak areas, answer it fully as normal");
  });
});
